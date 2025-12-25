// =============================================================================
// Sync Explore Index - Background job to populate explore_index table
// Run via cron every 10-30 minutes (e.g., Vercel Cron, GitHub Actions)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exploreIndex, videos, videoStats } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// Protect endpoint with secret key
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        console.log("[Sync Explore] Starting sync...");
        const startTime = Date.now();

        // Fetch all videos with their stats (this is the only place we do JOINs)
        const allVideos = await db
            .select({
                id: videos.id,
                source: videos.source,
                externalId: videos.externalId,
                title: videos.title,
                poster: videos.poster,
                description: videos.description,
                genres: videos.genres,
                releaseYear: videos.releaseYear,
                totalEpisodes: videos.totalEpisodes,
                createdAt: videos.createdAt,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId));

        console.log(`[Sync Explore] Fetched ${allVideos.length} videos from DB`);

        // Calculate scores and prepare upsert data
        const now = new Date();
        const indexEntries = allVideos.map((video) => {
            // Popularity score: total views + recent views weighted
            const popularityScore = video.viewsTotal + (video.views24h * 3);

            // Latest score: based on createdAt timestamp (higher = more recent)
            const latestScore = Math.floor(video.createdAt.getTime() / 1000);

            // Rating score: for now, use a combination (can be enhanced later)
            const ratingScore = video.viewsTotal;

            return {
                source: video.source,
                externalId: video.externalId,
                title: video.title,
                poster: video.poster,
                description: video.description,
                genres: video.genres,
                releaseYear: video.releaseYear,
                totalEpisodes: video.totalEpisodes,
                popularityScore,
                latestScore,
                ratingScore,
                updatedAt: now,
            };
        });

        // Batch upsert into explore_index
        if (indexEntries.length > 0) {
            // Use ON CONFLICT for upsert
            for (const entry of indexEntries) {
                await db
                    .insert(exploreIndex)
                    .values({
                        ...entry,
                        createdAt: now,
                    })
                    .onConflictDoUpdate({
                        target: [exploreIndex.source, exploreIndex.externalId],
                        set: {
                            title: entry.title,
                            poster: entry.poster,
                            description: entry.description,
                            genres: entry.genres,
                            releaseYear: entry.releaseYear,
                            totalEpisodes: entry.totalEpisodes,
                            popularityScore: entry.popularityScore,
                            latestScore: entry.latestScore,
                            ratingScore: entry.ratingScore,
                            updatedAt: entry.updatedAt,
                        },
                    });
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Sync Explore] Synced ${indexEntries.length} entries in ${elapsed}ms`);

        return NextResponse.json({
            status: 200,
            message: "Explore index synced",
            count: indexEntries.length,
            elapsed: `${elapsed}ms`,
        });
    } catch (error) {
        console.error("[Sync Explore] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Sync failed" },
            { status: 500 }
        );
    }
}
