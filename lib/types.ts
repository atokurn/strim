// =============================================================================
// Unified Data Contract for Multi-Platform Streaming
// =============================================================================

// Stream quality options
export type StreamQuality = "1080p" | "720p" | "540p" | "480p" | "360p" | "auto";
export type StreamType = "hls" | "mp4" | "dash";

// Supported streaming sources
export type SourceType = "dramadash" | "dramabox";

// Subtitle track
export interface Subtitle {
    label: string;       // e.g., "English", "Indonesian"
    language: string;    // ISO 639-1 code, e.g., "en", "id"
    url: string;         // URL to VTT/SRT file
}

// Individual stream source (one quality level)
export interface StreamSource {
    quality: StreamQuality;
    url: string;
    type: StreamType;
}

// Normalized episode data
export interface NormalizedEpisode {
    id: string;
    episodeNumber: number;
    title?: string;
    thumbnail?: string;
    duration?: number;        // seconds
    isLocked?: boolean;
    streams: StreamSource[];  // Multiple qualities
    subtitles?: Subtitle[];
}

// Normalized drama/show data (list item)
export interface NormalizedDrama {
    id: string;
    source: SourceType;
    title: string;
    poster: string;
    description?: string;
    genres?: string[];
    releaseYear?: number;
    rating?: number;
    totalEpisodes?: number;
    viewCount?: number;
}

// Full drama detail with episodes
export interface NormalizedDramaDetail extends NormalizedDrama {
    episodes: NormalizedEpisode[];
}

// Home page content
export interface NormalizedHomeData {
    banners: NormalizedDrama[];
    trending: NormalizedDrama[];
    latest: NormalizedDrama[];
    categories?: { name: string; items: NormalizedDrama[] }[];
}

// API response wrapper
export interface ApiResponse<T> {
    status: number;
    data: T | null;
    error?: string;
}

// Stream info for player consumption
export interface StreamInfo {
    episodeId: string;
    episodeNumber: number;
    title: string;
    streams: StreamSource[];
    subtitles: Subtitle[];
    poster?: string;
    nextEpisode?: {
        episodeNumber: number;
        id: string;
    };
    previousEpisode?: {
        episodeNumber: number;
        id: string;
    };
}
