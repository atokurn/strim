// =============================================================================
// Hot Videos API Route
// GET /api/videos/hot?limit=20
// Returns videos with time-weighted 24h view scoring
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { aggregatorService } from "@/lib/services/AggregatorService";

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    try {
        const videos = await aggregatorService.getHot(Math.min(limit, 50));

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
        console.error("[API /videos/hot] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to fetch hot videos" },
            { status: 500 }
        );
    }
}
