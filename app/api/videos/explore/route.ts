// =============================================================================
// Explore Videos API Route - Cursor-based pagination
// GET /api/videos/explore?cursor=<cursor>&limit=20&source=all&sortBy=latest
// LOCAL ONLY - no external API calls
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { trendingService } from "@/lib/services/TrendingService";
import { cacheService } from "@/lib/cache/redis";
import type { CursorPaginatedResult } from "@/lib/services/TrendingService";

export const revalidate = 0; // No static caching - cursor-based pagination is dynamic

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

/**
 * Build cache key for cursor-based explore results
 */
function buildCacheKey(cursor: string | null, source: string, sortBy: string, limit: number): string {
    const cursorPart = cursor || "first";
    return `cache:explore:${source}:${sortBy}:${cursorPart}:${limit}`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50); // Cap at 50
    const source = searchParams.get("source") || undefined;
    const sortBy = (searchParams.get("sortBy") as "latest" | "popular" | "hot") || "latest";
    const sourceKey = source || "all";

    try {
        // Check cache first
        const cacheKey = buildCacheKey(cursor, sourceKey, sortBy, limit);
        const cachedResult = await cacheService.get<CursorPaginatedResult>(cacheKey);

        if (cachedResult) {
            return NextResponse.json(
                {
                    status: 200,
                    data: cachedResult.videos,
                    nextCursor: cachedResult.nextCursor,
                    hasMore: cachedResult.hasMore,
                    cached: true,
                },
                {
                    headers: {
                        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                    },
                }
            );
        }

        // Fetch from local TrendingService (no external API calls)
        const result = await trendingService.getExplore({
            limit,
            cursor,
            source,
            sortBy,
        });

        // Cache the result
        await cacheService.set(cacheKey, result, CACHE_TTL);

        return NextResponse.json(
            {
                status: 200,
                data: result.videos,
                nextCursor: result.nextCursor,
                hasMore: result.hasMore,
                cached: false,
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                },
            }
        );
    } catch (error) {
        console.error("[API /videos/explore] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to fetch videos" },
            { status: 500 }
        );
    }
}

