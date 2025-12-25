// =============================================================================
// Watch Event API Route
// POST /api/events/watch
// Records watch progress for trending and user history
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cacheService, CacheService } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { videos, videoStats, userWatchHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface WatchEventBody {
    source: string;
    externalId: string;
    episodeNumber: number;
    progress: number; // Seconds watched
    userId?: string; // Optional - for logged in users
}

// Minimum watch time to count as a "real" view (30 seconds)
const MIN_WATCH_TIME = 30;

export async function POST(request: NextRequest) {
    try {
        const body: WatchEventBody = await request.json();
        const { source, externalId, episodeNumber, progress, userId } = body;

        if (!source || !externalId || episodeNumber === undefined || progress === undefined) {
            return NextResponse.json(
                { status: 400, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const videoKey = CacheService.createVideoKey(source, externalId);

        // Only count significant watch time (>30s) for hot scoring
        if (progress >= MIN_WATCH_TIME) {
            // Record as a view for hot scoring
            await cacheService.recordHotView(videoKey);
        }

        // Update user watch history (async, don't block response)
        if (userId) {
            updateWatchHistory(source, externalId, episodeNumber, progress, userId).catch((err) =>
                console.error("[Events/Watch] History update error:", err)
            );
        }

        // Update watch time in stats (async)
        updateWatchTime(source, externalId, progress).catch((err) =>
            console.error("[Events/Watch] Stats update error:", err)
        );

        return NextResponse.json(
            { status: 200, message: "Watch event recorded" },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error("[Events/Watch] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to record watch event" },
            { status: 500 }
        );
    }
}

/**
 * Update user watch history in database
 */
async function updateWatchHistory(
    source: string,
    externalId: string,
    episodeNumber: number,
    progress: number,
    userId: string
): Promise<void> {
    // Find the video
    const video = await db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.source, source), eq(videos.externalId, externalId)))
        .limit(1);

    if (video.length === 0) return;

    const videoId = video[0].id;

    // Upsert watch history
    // For simplicity, we'll just insert a new record (deduping can be done with ON CONFLICT)
    await db.insert(userWatchHistory).values({
        userId,
        videoId,
        episodeNumber,
        progress,
        watchedAt: new Date(),
    });
}

/**
 * Update total watch time in video stats
 */
async function updateWatchTime(
    source: string,
    externalId: string,
    watchSeconds: number
): Promise<void> {
    // Find the video
    const video = await db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.source, source), eq(videos.externalId, externalId)))
        .limit(1);

    if (video.length === 0) return;

    const videoId = video[0].id;

    // Check if stats exist
    const existingStats = await db
        .select()
        .from(videoStats)
        .where(eq(videoStats.videoId, videoId))
        .limit(1);

    if (existingStats.length === 0) {
        // Stats will be created when video is synced or viewed
        return;
    }

    // Note: watchTimeTotal column will be added in schema update
    // For now, we just update lastViewedAt
    await db
        .update(videoStats)
        .set({
            lastViewedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(videoStats.videoId, videoId));
}
