// =============================================================================
// Stream Service - Central router for all streaming adapters
// =============================================================================

import { DramaDashAdapter, DramaBoxAdapter, BaseAdapter } from "../adapters";
import type {
    SourceType,
    NormalizedDrama,
    NormalizedDramaDetail,
    NormalizedEpisode,
    NormalizedHomeData,
    ApiResponse,
    StreamInfo,
} from "../types";

// Adapter factory registry - add new adapters here
const adapterFactories: Record<SourceType, () => BaseAdapter> = {
    dramadash: () => new DramaDashAdapter(),
    dramabox: () => new DramaBoxAdapter(),
};

// List of all supported sources
export const SUPPORTED_SOURCES: SourceType[] = Object.keys(
    adapterFactories
) as SourceType[];

// Default source for the app
export const DEFAULT_SOURCE: SourceType = "dramadash";

/**
 * StreamService - Central service for routing requests to the correct adapter
 *
 * Usage:
 * ```ts
 * const data = await streamService.getHome("dramadash");
 * const drama = await streamService.getDrama("dramabox", "41000116666");
 * ```
 */
export class StreamService {
    private adapterCache: Map<SourceType, BaseAdapter> = new Map();

    /**
     * Check if a source is supported
     */
    isSupported(source: string): source is SourceType {
        return source in adapterFactories;
    }

    /**
     * Get or create an initialized adapter for the given source
     */
    async getAdapter(source: SourceType): Promise<BaseAdapter> {
        if (!this.isSupported(source)) {
            throw new Error(`Unsupported source: ${source}`);
        }

        // Return cached adapter if available
        if (this.adapterCache.has(source)) {
            return this.adapterCache.get(source)!;
        }

        // Create and initialize new adapter
        const adapter = adapterFactories[source]();
        await adapter.init();
        this.adapterCache.set(source, adapter);

        return adapter;
    }

    /**
     * Get home page data from a source
     */
    async getHome(source: SourceType): Promise<ApiResponse<NormalizedHomeData>> {
        try {
            const adapter = await this.getAdapter(source);
            return adapter.getHome();
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Search for dramas across a source
     */
    async search(
        source: SourceType,
        query: string
    ): Promise<ApiResponse<NormalizedDrama[]>> {
        try {
            const adapter = await this.getAdapter(source);
            return adapter.search(query);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get drama details with episode list
     */
    async getDrama(
        source: SourceType,
        id: string
    ): Promise<ApiResponse<NormalizedDramaDetail>> {
        try {
            const adapter = await this.getAdapter(source);
            return adapter.getDrama(id);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get a single episode's information
     */
    async getEpisode(
        source: SourceType,
        dramaId: string,
        episodeNumber: number
    ): Promise<ApiResponse<NormalizedEpisode>> {
        try {
            const adapter = await this.getAdapter(source);
            return adapter.getEpisode(dramaId, episodeNumber);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get trending content from a source
     */
    async getTrending(source: SourceType): Promise<ApiResponse<NormalizedDrama[]>> {
        try {
            const adapter = await this.getAdapter(source);
            return adapter.getTrending();
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get full stream info for the player
     * This includes episode data plus navigation helpers
     */
    async getStreamInfo(
        source: SourceType,
        dramaId: string,
        episodeNumber: number
    ): Promise<ApiResponse<StreamInfo>> {
        try {
            const adapter = await this.getAdapter(source);

            // Get full drama details to have episode list for navigation
            const dramaRes = await adapter.getDrama(dramaId);
            if (!dramaRes.data) {
                return { status: 404, data: null, error: "Drama not found" };
            }

            const { episodes } = dramaRes.data;
            const currentEpisode = episodes.find(
                (ep) => ep.episodeNumber === episodeNumber
            );

            if (!currentEpisode) {
                return { status: 404, data: null, error: "Episode not found" };
            }

            // Find prev/next episodes
            const sortedEpisodes = [...episodes].sort(
                (a, b) => a.episodeNumber - b.episodeNumber
            );
            const currentIndex = sortedEpisodes.findIndex(
                (ep) => ep.episodeNumber === episodeNumber
            );

            const previousEpisode =
                currentIndex > 0
                    ? {
                        episodeNumber: sortedEpisodes[currentIndex - 1].episodeNumber,
                        id: sortedEpisodes[currentIndex - 1].id,
                    }
                    : undefined;

            const nextEpisode =
                currentIndex < sortedEpisodes.length - 1
                    ? {
                        episodeNumber: sortedEpisodes[currentIndex + 1].episodeNumber,
                        id: sortedEpisodes[currentIndex + 1].id,
                    }
                    : undefined;

            const streamInfo: StreamInfo = {
                episodeId: currentEpisode.id,
                episodeNumber: currentEpisode.episodeNumber,
                title: `Episode ${currentEpisode.episodeNumber} - ${dramaRes.data.title}`,
                streams: currentEpisode.streams,
                subtitles: currentEpisode.subtitles || [],
                poster: dramaRes.data.poster,
                nextEpisode,
                previousEpisode,
            };

            return { status: 200, data: streamInfo };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Aggregate home data from multiple sources
     */
    async getAggregatedHome(): Promise<ApiResponse<{
        sources: { source: SourceType; data: NormalizedHomeData }[];
    }>> {
        try {
            const results = await Promise.allSettled(
                SUPPORTED_SOURCES.map(async (source) => {
                    const adapter = await this.getAdapter(source);
                    const home = await adapter.getHome();
                    return { source, data: home.data };
                })
            );

            const sources = results
                .filter(
                    (r): r is PromiseFulfilledResult<{ source: SourceType; data: NormalizedHomeData | null }> =>
                        r.status === "fulfilled" && r.value.data !== null
                )
                .map((r) => ({ source: r.value.source, data: r.value.data! }));

            return { status: 200, data: { sources } };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Standard error handler
     */
    private handleError<T>(error: unknown): ApiResponse<T> {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[StreamService] Error:", message);
        return { status: 500, data: null, error: message };
    }
}

// Singleton instance for convenience
export const streamService = new StreamService();
