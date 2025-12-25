// =============================================================================
// Trending Videos API Route
// GET /api/videos/trending?limit=20
// Returns videos sorted by total view count (Redis sorted set + DB fallback)
// LOCAL ONLY - no external API calls
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { trendingService } from "@/lib/services/TrendingService";

export const revalidate = 60; // Cache for 1 minute (trending changes faster)

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    try {
        const videos = await trendingService.getTrending(Math.min(limit, 50));

        return NextResponse.json(
            {
                status: 200,
                data: videos,
                count: videos.length,
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

