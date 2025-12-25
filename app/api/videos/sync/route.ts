// =============================================================================
// Sync API Route - Trigger data sync from all sources
// POST /api/videos/sync
// =============================================================================

import { NextResponse } from "next/server";
import { aggregatorService } from "@/lib/services/AggregatorService";

export async function POST() {
    try {
        const result = await aggregatorService.syncAllSources();

        return NextResponse.json({
            status: 200,
            message: "Sync completed",
            synced: result.synced,
            errors: result.errors,
        });
    } catch (error) {
        console.error("[API /videos/sync] Error:", error);
        return NextResponse.json(
            { status: 500, error: "Sync failed" },
            { status: 500 }
        );
    }
}
