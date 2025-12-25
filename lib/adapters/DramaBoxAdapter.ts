// =============================================================================
// DramaBox Adapter - Wraps the DramaBox API from dramabox.sansekai.my.id
// =============================================================================

import axios from "axios";
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

export class DramaBoxAdapter extends BaseAdapter {
    readonly source: SourceType = "dramabox";
    readonly displayName = "DramaBox";

    private apiUrl = "https://dramabox.sansekai.my.id/api/dramabox";

    constructor() {
        super();
    }

    private async request<T>(endpoint: string): Promise<T> {
        const url = `${this.apiUrl}${endpoint}`;
        const res = await axios.get(url, {
            timeout: 60000, // DramaBox /allepisode can be slow - increased to 60s
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Strim/1.0)",
                Accept: "application/json",
            },
        });
        return res.data;
    }

    async init(): Promise<this> {
        // DramaBox API doesn't require authentication
        return this;
    }

    async getHome(): Promise<ApiResponse<NormalizedHomeData>> {
        try {
            // Fetch multiple endpoints in parallel for home page
            const [trendingRes, latestRes, forYouRes] = await Promise.allSettled([
                this.request<DramaBoxListResponse>("/trending"),
                this.request<DramaBoxListResponse>("/latest"),
                this.request<DramaBoxListResponse>("/foryou"),
            ]);

            const trending =
                trendingRes.status === "fulfilled"
                    ? this.transformDramaList(trendingRes.value)
                    : [];

            let latest =
                latestRes.status === "fulfilled"
                    ? this.transformDramaList(latestRes.value)
                    : [];

            // Enrich top items to get episode count
            latest = await this.enrichWithDetails(latest);

            const banners =
                forYouRes.status === "fulfilled"
                    ? this.transformDramaList(forYouRes.value).slice(0, 5)
                    : [];

            return {
                status: 200,
                data: { banners, trending, latest },
            };
        } catch (err) {
            console.error("[DramaBox] Error fetching home:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    async search(query: string): Promise<ApiResponse<NormalizedDrama[]>> {
        try {
            const res = await this.request<DramaBoxListResponse>(
                `/search?query=${encodeURIComponent(query)}`
            );
            const data = this.transformDramaList(res);
            return { status: 200, data };
        } catch (err) {
            console.error("[DramaBox] Error searching:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    async getDrama(id: string): Promise<ApiResponse<NormalizedDramaDetail>> {
        try {
            // Fetch detail and episodes in parallel
            const [detailRes, episodesRes] = await Promise.all([
                this.request<DramaBoxDetailResponse>(`/detail?bookId=${id}`),
                this.request<DramaBoxEpisode[] | DramaBoxEpisodesResponse>(`/allepisode?bookId=${id}`),
            ]);

            // Detail response is { data: { book: {...} } }
            const drama = (detailRes as any)?.data?.book || detailRes.data || detailRes;

            // Episode response is an array directly
            const episodeList = Array.isArray(episodesRes)
                ? episodesRes
                : (episodesRes as DramaBoxEpisodesResponse).data || (episodesRes as DramaBoxEpisodesResponse).episodes || [];

            const episodes: NormalizedEpisode[] = this.transformEpisodeList(
                Array.isArray(episodeList) ? episodeList : []
            );

            const data: NormalizedDramaDetail = {
                id: String(drama.bookId || drama.id || id),
                source: this.source,
                title: drama.bookName || drama.name || drama.title || "Unknown",
                poster: drama.coverWap || drama.cover || drama.poster || "",
                description: drama.introduction || drama.description || "",
                genres: this.parseGenres(drama),
                totalEpisodes: episodes.length,
                episodes,
            };

            return { status: 200, data };
        } catch (err) {
            console.error("[DramaBox] Error fetching drama:", err);
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
            console.error("[DramaBox] Error fetching episode:", err);
            return { status: 500, data: null, error: String(err) };
        }
    }

    // =============================================================================
    // Private Enrichment Methods
    // =============================================================================

    private async enrichWithDetails(dramas: NormalizedDrama[]): Promise<NormalizedDrama[]> {
        const enriched = [...dramas];
        // Only enrich top 15 to avoid API rate limits/slowness
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

    private transformDramaList(res: DramaBoxListResponse | DramaBoxDrama[]): NormalizedDrama[] {
        // Handle array response directly (API returns array)
        if (Array.isArray(res)) {
            return res.map((item) => this.transformDrama(item));
        }

        // Handle object response with nested arrays
        const items = res.data || res.list || res.result || [];
        if (!Array.isArray(items)) return [];

        return items.map((item) => this.transformDrama(item));
    }

    private transformDrama(item: DramaBoxDrama): NormalizedDrama {
        return {
            id: String(item.bookId || item.id),
            source: this.source,
            title: item.bookName || item.name || item.title || "Unknown",
            poster: item.coverWap || item.cover || item.poster || "",
            description: item.introduction || item.description || "",
            genres: this.parseGenres(item),
            viewCount: item.viewCount || item.readCount,
        };
    }

    private transformEpisodeList(
        episodes: DramaBoxEpisode[]
    ): NormalizedEpisode[] {
        return episodes.map((ep, index) => {
            const streams: StreamSource[] = [];

            // Handle DramaBox's cdnList structure with videoPathList
            if (ep.cdnList && Array.isArray(ep.cdnList)) {
                // Find the default CDN or use the first one
                const defaultCdn = ep.cdnList.find(cdn => cdn.isDefault === 1) || ep.cdnList[0];
                if (defaultCdn?.videoPathList && Array.isArray(defaultCdn.videoPathList)) {
                    defaultCdn.videoPathList.forEach((videoPath) => {
                        const quality = String(videoPath.quality || "auto");
                        streams.push({
                            quality: this.parseQuality(quality),
                            url: videoPath.videoPath,
                            type: videoPath.videoPath.includes(".m3u8") ? "hls" : "mp4",
                        });
                    });
                }
            }

            // Fallback: Direct video URL
            const videoUrl = ep.videoUrl || ep.playUrl || ep.url;
            if (videoUrl && streams.length === 0) {
                const type = videoUrl.includes(".m3u8") ? "hls" : "mp4";
                streams.push({
                    quality: "auto",
                    url: videoUrl,
                    type,
                });
            }

            // Handle multiple quality sources if provided via sources array
            if (ep.sources && Array.isArray(ep.sources)) {
                ep.sources.forEach((src) => {
                    streams.push({
                        quality: this.parseQuality(src.quality || src.label),
                        url: src.url,
                        type: src.url.includes(".m3u8") ? "hls" : "mp4",
                    });
                });
            }

            const subtitles: Subtitle[] = (ep.subtitles || []).map((sub) => ({
                label: sub.label || sub.language || "Unknown",
                language: sub.language || "en",
                url: sub.url,
            }));

            // Parse episode number from chapterName (e.g., "EP 1" -> 1) or use chapterIndex
            let episodeNumber = ep.episodeNumber || ep.serialNumber || (ep.chapterIndex !== undefined ? ep.chapterIndex + 1 : index + 1);
            if (ep.chapterName) {
                const match = ep.chapterName.match(/\d+/);
                if (match) {
                    episodeNumber = parseInt(match[0], 10);
                }
            }

            return {
                id: String(ep.chapterId || ep.id || ep.episodeId || index + 1),
                episodeNumber,
                title: ep.chapterName || ep.title || ep.name,
                thumbnail: ep.cover || ep.thumbnail,
                duration: ep.duration,
                isLocked: ep.isCharge === 1 || ep.isLock || ep.isLocked || false,
                streams,
                subtitles,
            };
        });
    }

    private parseGenres(item: DramaBoxDrama): string[] {
        if (item.genres && Array.isArray(item.genres)) {
            return item.genres.map((g) =>
                typeof g === "string" ? g : g.name || g.displayName || ""
            );
        }
        if (item.categoryName) {
            return [item.categoryName];
        }
        return [];
    }

    private parseQuality(
        quality?: string
    ): "1080p" | "720p" | "540p" | "480p" | "360p" | "auto" {
        if (!quality) return "auto";
        const q = quality.toLowerCase();
        if (q.includes("1080")) return "1080p";
        if (q.includes("720")) return "720p";
        if (q.includes("540")) return "540p";
        if (q.includes("480")) return "480p";
        if (q.includes("360")) return "360p";
        return "auto";
    }
}

// =============================================================================
// DramaBox API Response Types (internal)
// =============================================================================

interface DramaBoxListResponse {
    data?: DramaBoxDrama[];
    list?: DramaBoxDrama[];
    result?: DramaBoxDrama[];
}

interface DramaBoxDetailResponse {
    data?: DramaBoxDrama;
    bookId?: string;
    bookName?: string;
    coverWap?: string;
    cover?: string;
    poster?: string;
    introduction?: string;
    description?: string;
    id?: string;
    name?: string;
    title?: string;
}

interface DramaBoxEpisodesResponse {
    data?: DramaBoxEpisode[];
    episodes?: DramaBoxEpisode[];
}

interface DramaBoxDrama {
    bookId?: string;
    id?: string | number;
    bookName?: string;
    name?: string;
    title?: string;
    coverWap?: string;
    cover?: string;
    poster?: string;
    introduction?: string;
    description?: string;
    viewCount?: number;
    readCount?: number;
    categoryName?: string;
    genres?: (string | { name?: string; displayName?: string })[];
}

interface DramaBoxEpisode {
    id?: string | number;
    episodeId?: string | number;
    episodeNumber?: number;
    serialNumber?: number;
    title?: string;
    name?: string;
    videoUrl?: string;
    playUrl?: string;
    url?: string;
    cover?: string;
    thumbnail?: string;
    duration?: number;
    isLock?: boolean;
    isLocked?: boolean;
    // DramaBox-specific properties
    chapterId?: string;
    chapterIndex?: number;
    chapterName?: string;
    isCharge?: number; // 0 = free, 1 = paid/locked
    cdnList?: {
        cdnDomain: string;
        isDefault: number;
        videoPathList: {
            quality: number;
            videoPath: string;
            isDefault: number;
            isEntry?: number;
            isVipEquity?: number;
        }[];
    }[];
    sources?: {
        quality?: string;
        label?: string;
        url: string;
    }[];
    subtitles?: {
        label?: string;
        language?: string;
        url: string;
    }[];
}
