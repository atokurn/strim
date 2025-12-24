// =============================================================================
// Search API Route - Proxy for searching dramas
// GET /api/search?source=dramadash&query=love
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { streamService } from "@/lib/services/StreamService";
import type { SourceType } from "@/lib/types";

// Cache for 2 minutes
export const revalidate = 120;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const source = searchParams.get("source") as SourceType | null;
    const query = searchParams.get("query") || searchParams.get("q");

    // Validate required parameters
    if (!source) {
        return NextResponse.json(
            { status: 400, error: "Missing required parameter: source" },
            { status: 400 }
        );
    }

    if (!query) {
        return NextResponse.json(
            { status: 400, error: "Missing required parameter: query" },
            { status: 400 }
        );
    }

    // Validate source
    if (!streamService.isSupported(source)) {
        return NextResponse.json(
            { status: 400, error: `Unsupported source: ${source}` },
            { status: 400 }
        );
    }

    try {
        const result = await streamService.search(source, query);

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
            },
        });
    } catch (error) {
        console.error("[API /search] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Internal server error" },
            { status: 500 }
        );
    }
}
