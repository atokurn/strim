// =============================================================================
// Drama API Route - Proxy for fetching drama details
// GET /api/drama?source=dramadash&id=123
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { streamService } from "@/lib/services/StreamService";
import type { SourceType } from "@/lib/types";

// Cache for 5 minutes (drama details don't change often)
export const revalidate = 300;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const source = searchParams.get("source") as SourceType | null;
    const id = searchParams.get("id");

    // Validate required parameters
    if (!source) {
        return NextResponse.json(
            { status: 400, error: "Missing required parameter: source" },
            { status: 400 }
        );
    }

    if (!id) {
        return NextResponse.json(
            { status: 400, error: "Missing required parameter: id" },
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
        const result = await streamService.getDrama(source, id);

        if (!result.data) {
            return NextResponse.json(
                { status: result.status, error: result.error || "Not found" },
                { status: result.status }
            );
        }

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("[API /drama] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Internal server error" },
            { status: 500 }
        );
    }
}
