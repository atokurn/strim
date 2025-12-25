// =============================================================================
// Explore Videos API Route - FAST precomputed queries
// GET /api/videos/explore?sort=popular|latest|rating&cursor=<cursor>&limit=20
// NO JOINS - queries precomputed explore_index table
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exploreIndex } from "@/lib/db/schema";
import { desc, lt, eq, and, sql } from "drizzle-orm";
import { cacheService } from "@/lib/cache/redis";

export const revalidate = 0; // Dynamic - cursor-based pagination

// Cache TTL in seconds
const CACHE_TTL = 60; // 1 minute for first page

type SortType = "popular" | "latest" | "rating";

interface ExploreResult {
    videos: typeof exploreIndex.$inferSelect[];
    nextCursor: string | null;
    hasMore: boolean;
}

/**
 * Build cache key for explore results
 */
function buildCacheKey(sort: SortType, source: string | null, cursor: string | null): string {
    const cursorPart = cursor || "first";
    return `explore:${sort}:${source || "all"}:${cursorPart}`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const sort = (searchParams.get("sort") as SortType) || "popular";
    const source = searchParams.get("source") || null;
    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    if (!db) {
        return NextResponse.json({ status: 500, error: "Database not configured" }, { status: 500 });
    }

    try {
        // Check Redis cache for first page only
        if (!cursor) {
            const cacheKey = buildCacheKey(sort, source, null);
            const cached = await cacheService.get<ExploreResult>(cacheKey);
            if (cached) {
                return NextResponse.json({
                    status: 200,
                    data: cached.videos,
                    nextCursor: cached.nextCursor,
                    hasMore: cached.hasMore,
                    cached: true,
                });
            }
        }

        // Determine sort column
        const sortColumn = sort === "latest"
            ? exploreIndex.latestScore
            : sort === "rating"
                ? exploreIndex.ratingScore
                : exploreIndex.popularityScore;

        // Parse cursor: "score:id"
        let cursorScore: number | null = null;
        let cursorId: number | null = null;
        if (cursor) {
            const [scoreStr, idStr] = cursor.split(":");
            cursorScore = parseInt(scoreStr, 10);
            cursorId = parseInt(idStr, 10);
        }

        // Build query - simple indexed SELECT, no JOINs
        let query = db
            .select()
            .from(exploreIndex)
            .limit(limit + 1); // +1 to check hasMore

        // Apply source filter
        if (source) {
            query = query.where(eq(exploreIndex.source, source)) as typeof query;
        }

        // Apply cursor condition for pagination
        if (cursorScore !== null && cursorId !== null) {
            query = query.where(
                sql`(${sortColumn}, ${exploreIndex.id}) < (${cursorScore}, ${cursorId})`
            ) as typeof query;
        }

        // Apply sort order
        query = query.orderBy(desc(sortColumn), desc(exploreIndex.id)) as typeof query;

        const results = await query;

        // Check if there are more results
        const hasMore = results.length > limit;
        const videosToReturn = hasMore ? results.slice(0, limit) : results;

        // Build next cursor
        let nextCursor: string | null = null;
        if (hasMore && videosToReturn.length > 0) {
            const lastVideo = videosToReturn[videosToReturn.length - 1];
            const scoreValue = sort === "latest"
                ? lastVideo.latestScore
                : sort === "rating"
                    ? lastVideo.ratingScore
                    : lastVideo.popularityScore;
            nextCursor = `${scoreValue}:${lastVideo.id}`;
        }

        const result: ExploreResult = {
            videos: videosToReturn,
            nextCursor,
            hasMore,
        };

        // Cache first page
        if (!cursor) {
            const cacheKey = buildCacheKey(sort, source, null);
            await cacheService.set(cacheKey, result, CACHE_TTL);
        }

        return NextResponse.json({
            status: 200,
            data: result.videos,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
            cached: false,
        });
    } catch (error) {
        console.error("[API /videos/explore] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to fetch videos" },
            { status: 500 }
        );
    }
}
