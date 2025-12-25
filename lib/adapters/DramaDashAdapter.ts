// =============================================================================
// DramaDash Adapter - Wraps the existing DramaDash API
// =============================================================================

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { BaseAdapter } from "./BaseAdapter";
import type {
    NormalizedDrama,
    NormalizedDramaDetail,
    NormalizedEpisode,
    NormalizedHomeData,
    ApiResponse,
    SourceType,
    StreamSource,
    Subtitle,
} from "../types";

export class DramaDashAdapter extends BaseAdapter {
    readonly source: SourceType = "dramadash";
    readonly displayName = "DramaDash";

    private apiUrl = "https://www.dramadash.app/api/";
    private deviceId: string;
    private deviceToken: string | null = null;

    constructor() {
        super();
        this.deviceId = this.generateDeviceId();
    }

    private generateDeviceId(): string {
        return uuidv4().replace(/-/g, "").substring(0, 16);
    }

    private getDefaultHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            "app-version": "70",
            lang: "id",
            platform: "android",
            tz: "Asia/Bangkok",
            "device-type": "phone",
            "content-type": "application/json; charset=UTF-8",
            "accept-encoding": "gzip",
            "user-agent": "okhttp/5.1.0",
        };
        if (this.deviceToken) {
            headers.authorization = `Bearer ${this.deviceToken}`;
        }
        return headers;
    }

    private async request<T>(
        endpoint: string,
        method: "GET" | "POST" = "GET",
        data?: Record<string, unknown>
    ): Promise<T> {
        const config = {
            url: `${this.apiUrl}${endpoint}`,
            method,
            headers: this.getDefaultHeaders(),
            timeout: 15000,
            ...(data && { data }),
        };

        const res = await axios(config);
        return res.data;
    }

    async init(): Promise<this> {
        try {
            const payload = { android_id: this.deviceId };
            const res = await this.request<{ token: string }>("landing", "POST", payload);
            this.deviceToken = res?.token || null;
        } catch (error) {
            console.error("[DramaDash] Failed to get token:", error);
        }
        return this;
    }

    async getHome(): Promise<ApiResponse<NormalizedHomeData>> {
        try {
            const res = await this.request<{
                dramaList: { list: DramaDashDrama[] }[];
                bannerDramaList: { list: DramaDashDrama[] };
                trendingSearches: DramaDashDrama[];
                tabs: unknown[];
            }>("home", "GET");

            const { dramaList, bannerDramaList, trendingSearches } = res;

            // Transform banner items
            const banners: NormalizedDrama[] = (bannerDramaList?.list || []).map((item) =>
                this.transformDrama(item)
            );

            // Transform trending items
            const trending: NormalizedDrama[] = (trendingSearches || []).map((item) =>
                this.transformDrama(item)
            );

            // Transform drama list (flatten nested lists)
            let latest: NormalizedDrama[] = dramaList
                .filter((item) => Array.isArray(item.list))
                .flatMap((item) => item.list)
                .map((item) => this.transformDrama(item));

            // Enrich top items with detail data to get episode count
            latest = await this.enrichWithDetails(latest);

            return {
                status: 200,
                data: { banners, trending, latest },
            };
        } catch (err) {
            console.error("[DramaDash] Error fetching home:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    async search(query: string): Promise<ApiResponse<NormalizedDrama[]>> {
        try {
            const res = await this.request<{ result: DramaDashDrama[] }>(
                "search/text",
                "POST",
                { search: query }
            );

            const data = (res.result || []).map((item) => this.transformDrama(item));
            return { status: 200, data };
        } catch (err) {
            console.error("[DramaDash] Error searching:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    async getDrama(id: string): Promise<ApiResponse<NormalizedDramaDetail>> {
        try {
            const res = await this.request<{ drama: DramaDashDramaDetail }>(
                `drama/${id}`,
                "GET"
            );
            const { drama } = res;

            const episodes: NormalizedEpisode[] = (drama.episodes || []).map((ep) =>
                this.transformEpisode(ep)
            );

            const data: NormalizedDramaDetail = {
                id: String(drama.id),
                source: this.source,
                title: drama.name,
                poster: drama.poster,
                description: drama.description,
                genres: drama.genres?.map((g) => g.displayName) || [],
                totalEpisodes: episodes.length,
                episodes,
            };

            return { status: 200, data };
        } catch (err) {
            console.error("[DramaDash] Error fetching drama:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    async getEpisode(
        dramaId: string,
        episodeNumber: number
    ): Promise<ApiResponse<NormalizedEpisode>> {
        try {
            const dramaRes = await this.getDrama(dramaId);
            if (!dramaRes.data) {
                return { status: 404, data: null, error: "Drama not found" };
            }

            const episode = dramaRes.data.episodes.find(
                (ep) => ep.episodeNumber === episodeNumber
            );

            if (!episode) {
                return { status: 404, data: null, error: "Episode not found" };
            }

            return { status: 200, data: episode };
        } catch (err) {
            console.error("[DramaDash] Error fetching episode:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    // =============================================================================
    // Private Enrichment Methods
    // =============================================================================

    private async enrichWithDetails(dramas: NormalizedDrama[]): Promise<NormalizedDrama[]> {
        const enriched = [...dramas];
        // Only enrich top 15 to avoid API rate limits/slowness
        // This ensures the first screen of items has episode counts
        const itemsToEnrich = enriched.slice(0, 15);

        const details = await Promise.allSettled(
            itemsToEnrich.map(item => this.getDrama(item.id))
        );

        details.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value.status === 200 && result.value.data) {
                enriched[index].totalEpisodes = result.value.data.totalEpisodes;
            }
        });

        return enriched;
    }

    // =============================================================================
    // Private Transformation Methods
    // =============================================================================

    private transformDrama(item: DramaDashDrama): NormalizedDrama {
        return {
            id: String(item.id),
            source: this.source,
            title: item.name,
            poster: item.poster,
            description: item.desc || item.description || "",
            genres: item.genres?.map((g) => g.displayName) || [],
            viewCount: item.viewCount,
        };
    }

    private transformEpisode(ep: DramaDashEpisode): NormalizedEpisode {
        // DramaDash provides a single HLS URL
        const streams: StreamSource[] = [];
        if (ep.videoUrl) {
            streams.push({
                quality: "auto",
                url: ep.videoUrl,
                type: "hls",
            });
        }

        // Transform subtitles if available
        const subtitles: Subtitle[] = (ep.subtitles || []).map((sub) => ({
            label: sub.label || sub.language || "Unknown",
            language: sub.language || "en",
            url: sub.url,
        }));

        return {
            id: String(ep.id),
            episodeNumber: ep.episodeNumber,
            thumbnail: ep.thumbnail,
            duration: ep.duration,
            isLocked: ep.isLocked,
            streams,
            subtitles,
        };
    }
}

// =============================================================================
// DramaDash API Response Types (internal)
// =============================================================================

interface DramaDashDrama {
    id: number | string;
    name: string;
    poster: string;
    desc?: string;
    description?: string;
    viewCount?: number;
    genres?: { displayName: string }[];
    tags?: { displayName: string }[];
}

interface DramaDashDramaDetail extends DramaDashDrama {
    episodes: DramaDashEpisode[];
}

interface DramaDashEpisode {
    id: number | string;
    episodeNumber: number;
    videoUrl?: string;
    thumbnail?: string;
    duration?: number;
    isLocked?: boolean;
    subtitles?: {
        label?: string;
        language?: string;
        url: string;
    }[];
}
