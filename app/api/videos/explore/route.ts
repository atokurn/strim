// =============================================================================
// Explore Videos API Route - Cursor-based pagination
// GET /api/videos/explore?cursor=<cursor>&limit=20&source=all
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { aggregatorService } from "@/lib/services/AggregatorService";
import { cacheService } from "@/lib/cache/redis";
import type { SourceType } from "@/lib/types";
import type { CursorPaginatedResult } from "@/lib/services/AggregatorService";

export const revalidate = 0; // No static caching - cursor-based pagination is dynamic

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

/**
 * Build cache key for cursor-based explore results
 */
function buildCacheKey(cursor: string | null, source: string, limit: number): string {
    const cursorPart = cursor || "first";
    return `cache:explore:${source}:${cursorPart}:${limit}`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50); // Cap at 50
    const source = searchParams.get("source") as SourceType | null;
    const sourceKey = source || "all";

    try {
        // Check cache first
        const cacheKey = buildCacheKey(cursor, sourceKey, limit);
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

        // Fetch from service
        const result = await aggregatorService.getVideosByCursor({
            limit,
            cursor,
            source: source || undefined,
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
