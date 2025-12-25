// =============================================================================
// Trending Videos API Route - FAST precomputed queries
// GET /api/videos/trending?limit=20
// NO JOINS - queries precomputed explore_index table
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exploreIndex } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { cacheService } from "@/lib/cache/redis";

export const revalidate = 60; // Cache for 1 minute

const CACHE_KEY = "trending:top";
const CACHE_TTL = 60;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    if (!db) {
        return NextResponse.json({ status: 500, error: "Database not configured" }, { status: 500 });
    }

    try {
        // Check cache first
        const cached = await cacheService.get<typeof exploreIndex.$inferSelect[]>(CACHE_KEY);
        if (cached) {
            return NextResponse.json({
                status: 200,
                data: cached.slice(0, limit),
                count: Math.min(cached.length, limit),
                cached: true,
            });
        }

        // Simple indexed SELECT - no JOINs
        const videos = await db
            .select()
            .from(exploreIndex)
            .orderBy(desc(exploreIndex.popularityScore), desc(exploreIndex.id))
            .limit(limit);

        // Cache results
        await cacheService.set(CACHE_KEY, videos, CACHE_TTL);

        return NextResponse.json(
            {
                status: 200,
                data: videos,
                count: videos.length,
                cached: false,
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
                },
            }
        );
    } catch (error) {
        console.error("[API /videos/trending] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to fetch trending videos" },
            { status: 500 }
        );
    }
}
