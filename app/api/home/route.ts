// =============================================================================
// Home API Route - Proxy for fetching home page data
// GET /api/home?source=dramadash
// GET /api/home (aggregates all sources)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { streamService, DEFAULT_SOURCE } from "@/lib/services/StreamService";
import type { SourceType } from "@/lib/types";

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const source = searchParams.get("source") as SourceType | null;
    const aggregate = searchParams.get("aggregate") === "true";

    try {
        // If aggregate mode, fetch from all sources
        if (aggregate) {
            const result = await streamService.getAggregatedHome();
            return NextResponse.json(result, {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            });
        }

        // Single source mode
        const targetSource = source || DEFAULT_SOURCE;

        if (!streamService.isSupported(targetSource)) {
            return NextResponse.json(
                { status: 400, error: `Unsupported source: ${targetSource}` },
                { status: 400 }
            );
        }

        const result = await streamService.getHome(targetSource);

        if (!result.data) {
            return NextResponse.json(
                { status: result.status, error: result.error || "Failed to fetch home data" },
                { status: result.status }
            );
        }

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("[API /home] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Internal server error" },
            { status: 500 }
        );
    }
}
