// =============================================================================
// View Event API Route
// POST /api/events/view
// Records a page view for trending calculations
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cacheService, CacheService } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { videos, videoStats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface ViewEventBody {
    source: string;
    externalId: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ViewEventBody = await request.json();
        const { source, externalId } = body;

        if (!source || !externalId) {
            return NextResponse.json(
                { status: 400, error: "Missing source or externalId" },
                { status: 400 }
            );
        }

        const videoKey = CacheService.createVideoKey(source, externalId);

        // 1. Increment Redis counters (fast path)
        await Promise.all([
            cacheService.incrementViewCount(videoKey),
            cacheService.recordHotView(videoKey),
        ]);

        // 2. Update DB asynchronously (don't await for response speed)
        updateDatabaseViewCount(source, externalId).catch((err) =>
            console.error("[Events/View] DB update error:", err)
        );

        return NextResponse.json(
            { status: 200, message: "View recorded" },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error("[Events/View] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to record view" },
            { status: 500 }
        );
    }
}

/**
 * Update database view count in background
 * This is non-blocking to keep the API fast
 */
async function updateDatabaseViewCount(
    source: string,
    externalId: string
): Promise<void> {
    // Find the video
    const video = await db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.source, source), eq(videos.externalId, externalId)))
        .limit(1);

    if (video.length === 0) {
        // Video not synced yet - this is fine, Redis will have the data
        return;
    }

    const videoId = video[0].id;

    // Check if stats exist
    const existingStats = await db
        .select()
        .from(videoStats)
        .where(eq(videoStats.videoId, videoId))
        .limit(1);

    if (existingStats.length === 0) {
        // Create new stats record
        await db.insert(videoStats).values({
            videoId,
            viewsTotal: 1,
            views24h: 1,
            lastViewedAt: new Date(),
        });
    } else {
        // Increment existing stats
        await db
            .update(videoStats)
            .set({
                viewsTotal: existingStats[0].viewsTotal + 1,
                views24h: existingStats[0].views24h + 1,
                lastViewedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(videoStats.videoId, videoId));
    }
}
