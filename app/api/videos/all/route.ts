// =============================================================================
// All Videos API Route
// GET /api/videos/all?limit=20&offset=0&source=dramadash
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { aggregatorService } from "@/lib/services/AggregatorService";
import type { SourceType } from "@/lib/types";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const source = searchParams.get("source") as SourceType | null;

    try {
        const result = await aggregatorService.getAllVideos({
            limit: Math.min(limit, 100), // Cap at 100
            offset,
            source: source || undefined,
            cached: true,
        });

        return NextResponse.json(
            {
                status: 200,
                data: result.videos,
                pagination: {
                    limit,
                    offset,
                    total: result.total,
                },
                sources: result.sources,
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            }
        );
    } catch (error) {
        console.error("[API /videos/all] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Failed to fetch videos" },
            { status: 500 }
        );
    }
}
