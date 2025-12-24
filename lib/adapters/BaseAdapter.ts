// =============================================================================
// Base Adapter - Abstract interface that all streaming adapters must implement
// =============================================================================

import type {
    NormalizedDrama,
    NormalizedDramaDetail,
    NormalizedEpisode,
    NormalizedHomeData,
    ApiResponse,
    SourceType,
} from "../types";

export abstract class BaseAdapter {
    /**
     * Unique identifier for this adapter/source
     */
    abstract readonly source: SourceType;

    /**
     * Human-readable name for display
     */
    abstract readonly displayName: string;

    /**
     * Initialize the adapter (e.g., fetch auth tokens, setup clients)
     * Called once before any other methods
     */
    abstract init(): Promise<this>;

    /**
     * Get home page data including banners, trending, and latest content
     */
    abstract getHome(): Promise<ApiResponse<NormalizedHomeData>>;

    /**
     * Search for dramas by query string
     */
    abstract search(query: string): Promise<ApiResponse<NormalizedDrama[]>>;

    /**
     * Get full drama details including episode list
     */
    abstract getDrama(id: string): Promise<ApiResponse<NormalizedDramaDetail>>;

    /**
     * Get a single episode's stream information
     */
    abstract getEpisode(
        dramaId: string,
        episodeNumber: number
    ): Promise<ApiResponse<NormalizedEpisode>>;

    /**
     * Optional: Get trending/popular content
     */
    async getTrending(): Promise<ApiResponse<NormalizedDrama[]>> {
        const home = await this.getHome();
        return {
            status: home.status,
            data: home.data?.trending || null,
            error: home.error,
        };
    }

    /**
     * Optional: Get latest content
     */
    async getLatest(): Promise<ApiResponse<NormalizedDrama[]>> {
        const home = await this.getHome();
        return {
            status: home.status,
            data: home.data?.latest || null,
            error: home.error,
        };
    }
}
