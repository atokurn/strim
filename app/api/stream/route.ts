// =============================================================================
// Stream API Route - Proxy for fetching stream information
// GET /api/stream?source=dramadash&id=123&episode=1
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { streamService } from "@/lib/services/StreamService";
import type { SourceType } from "@/lib/types";

// Cache for 30 seconds (stream URLs may expire)
export const revalidate = 30;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const source = searchParams.get("source") as SourceType | null;
    const id = searchParams.get("id");
    const episode = searchParams.get("episode");

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

    if (!episode) {
        return NextResponse.json(
            { status: 400, error: "Missing required parameter: episode" },
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
        const episodeNumber = parseInt(episode, 10);
        if (isNaN(episodeNumber)) {
            return NextResponse.json(
                { status: 400, error: "Invalid episode number" },
                { status: 400 }
            );
        }

        const result = await streamService.getStreamInfo(source, id, episodeNumber);

        if (!result.data) {
            return NextResponse.json(
                { status: result.status, error: result.error || "Not found" },
                { status: result.status }
            );
        }

        // Record view asynchronously (don't block response)
        import("@/lib/services/AggregatorService").then(({ aggregatorService }) => {
            aggregatorService.recordView(source, id).catch(console.error);
        });

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            },
        });
    } catch (error) {
        console.error("[API /stream] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Internal server error" },
            { status: 500 }
        );
    }
}
