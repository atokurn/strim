// =============================================================================
// Trending Service - Local-only trending queries (Redis-first, DB fallback)
// NEVER calls external APIs - all data comes from local DB/Redis
// =============================================================================

import { cacheService, CacheService } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { videos, videoStats } from "@/lib/db/schema";
import { desc, eq, and, sql, gt, inArray } from "drizzle-orm";
import type { Video, VideoStats } from "@/lib/db/schema";

// =============================================================================
// Types
// =============================================================================
export interface TrendingVideo {
    id: number;
    source: string;
    externalId: string;
    title: string;
    poster: string | null;
    description: string | null;
    genres: string | null;
    releaseYear: number | null;
    totalEpisodes: number | null;
    viewsTotal: number;
    views24h: number;
    score: number;
}

export interface CursorPaginatedResult {
    videos: TrendingVideo[];
    nextCursor: string | null;
    hasMore: boolean;
}

// =============================================================================
// Trending Service
// =============================================================================
class TrendingService {
    /**
     * Get trending videos - sorted by total views
     * 1. Try Redis sorted set first
     * 2. Fallback to DB query
     */
    async getTrending(limit: number = 20): Promise<TrendingVideo[]> {
        // Try Redis first
        const redisResults = await cacheService.getTrendingScores(limit);

        if (redisResults.length > 0) {
            // Fetch video details from DB for Redis keys
            const videoKeys = redisResults.map((r) => r.key);
            const videosFromDb = await this.getVideosByKeys(videoKeys);

            // Merge scores from Redis
            return videosFromDb.map((v) => {
                const redisEntry = redisResults.find(
                    (r) => r.key === CacheService.createVideoKey(v.source, v.externalId)
                );
                return {
                    ...v,
                    score: redisEntry?.score ?? v.viewsTotal,
                };
            });
        }

        // Fallback to DB
        return this.getTrendingFromDb(limit);
    }

    /**
     * Get hot videos - time-weighted 24h views
     * Uses exponential decay scoring from Redis
     */
    async getHot(limit: number = 20): Promise<TrendingVideo[]> {
        // Try Redis first
        const redisResults = await cacheService.getHotScores(limit);

        if (redisResults.length > 0) {
            const videoKeys = redisResults.map((r) => r.key);
            const videosFromDb = await this.getVideosByKeys(videoKeys);

            return videosFromDb.map((v) => {
                const redisEntry = redisResults.find(
                    (r) => r.key === CacheService.createVideoKey(v.source, v.externalId)
                );
                return {
                    ...v,
                    score: redisEntry?.score ?? v.views24h,
                };
            });
        }

        // Fallback to DB - use views_24h column
        return this.getHotFromDb(limit);
    }

    /**
     * Get explore videos with cursor-based pagination
     * Cursor format: "timestamp:id"
     */
    async getExplore(options: {
        limit?: number;
        cursor?: string | null;
        source?: string;
        sortBy?: "latest" | "popular" | "hot";
    } = {}): Promise<CursorPaginatedResult> {
        const { limit = 20, cursor, source, sortBy = "latest" } = options;

        if (!db) {
            return { videos: [], nextCursor: null, hasMore: false };
        }

        // Parse cursor
        let cursorTimestamp: Date | null = null;
        let cursorId: number | null = null;

        if (cursor) {
            const [ts, id] = cursor.split(":");
            cursorTimestamp = new Date(parseInt(ts, 10));
            cursorId = parseInt(id, 10);
        }

        // Build query
        let query = db
            .select({
                id: videos.id,
                source: videos.source,
                externalId: videos.externalId,
                title: videos.title,
                poster: videos.poster,
                description: videos.description,
                genres: videos.genres,
                releaseYear: videos.releaseYear,
                totalEpisodes: videos.totalEpisodes,
                createdAt: videos.createdAt,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .limit(limit + 1); // +1 to check hasMore

        // Apply source filter
        if (source) {
            query = query.where(eq(videos.source, source)) as typeof query;
        }

        // Apply cursor condition
        if (cursorTimestamp && cursorId) {
            query = query.where(
                sql`(${videos.createdAt}, ${videos.id}) < (${cursorTimestamp}, ${cursorId})`
            ) as typeof query;
        }

        // Apply sorting
        switch (sortBy) {
            case "popular":
                query = query.orderBy(
                    desc(sql`COALESCE(${videoStats.viewsTotal}, 0)`),
                    desc(videos.id)
                ) as typeof query;
                break;
            case "hot":
                query = query.orderBy(
                    desc(sql`COALESCE(${videoStats.views24h}, 0)`),
                    desc(videos.id)
                ) as typeof query;
                break;
            case "latest":
            default:
                query = query.orderBy(desc(videos.createdAt), desc(videos.id)) as typeof query;
                break;
        }

        const results = await query;

        // Check if there are more results
        const hasMore = results.length > limit;
        const videosToReturn = hasMore ? results.slice(0, limit) : results;

        // Build next cursor
        let nextCursor: string | null = null;
        if (hasMore && videosToReturn.length > 0) {
            const lastVideo = videosToReturn[videosToReturn.length - 1];
            nextCursor = `${lastVideo.createdAt.getTime()}:${lastVideo.id}`;
        }

        return {
            videos: videosToReturn.map((v) => ({
                id: v.id,
                source: v.source,
                externalId: v.externalId,
                title: v.title,
                poster: v.poster,
                description: v.description,
                genres: v.genres,
                releaseYear: v.releaseYear,
                totalEpisodes: v.totalEpisodes,
                viewsTotal: v.viewsTotal,
                views24h: v.views24h,
                score: v.viewsTotal,
            })),
            nextCursor,
            hasMore,
        };
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    /**
     * Get videos by their Redis keys (source:externalId)
     */
    private async getVideosByKeys(keys: string[]): Promise<TrendingVideo[]> {
        if (!db || keys.length === 0) return [];

        // Parse keys into source+externalId pairs
        const parsedKeys = keys
            .map(CacheService.parseVideoKey)
            .filter((k): k is { source: string; externalId: string } => k !== null);

        if (parsedKeys.length === 0) return [];

        // Build OR conditions for each key
        const conditions = parsedKeys.map(
            (k) => and(eq(videos.source, k.source), eq(videos.externalId, k.externalId))
        );

        const results = await db
            .select({
                id: videos.id,
                source: videos.source,
                externalId: videos.externalId,
                title: videos.title,
                poster: videos.poster,
                description: videos.description,
                genres: videos.genres,
                releaseYear: videos.releaseYear,
                totalEpisodes: videos.totalEpisodes,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .where(sql`${conditions.map((c) => sql`(${c})`).reduce((a, b) => sql`${a} OR ${b}`)}`);

        // Sort by original Redis order
        return keys
            .map((key) => {
                const parsed = CacheService.parseVideoKey(key);
                if (!parsed) return null;
                return results.find(
                    (r) => r.source === parsed.source && r.externalId === parsed.externalId
                );
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
            .map((v) => ({
                ...v,
                score: v.viewsTotal,
            }));
    }

    /**
     * Get trending from database (fallback)
     */
    private async getTrendingFromDb(limit: number): Promise<TrendingVideo[]> {
        if (!db) return [];

        const results = await db
            .select({
                id: videos.id,
                source: videos.source,
                externalId: videos.externalId,
                title: videos.title,
                poster: videos.poster,
                description: videos.description,
                genres: videos.genres,
                releaseYear: videos.releaseYear,
                totalEpisodes: videos.totalEpisodes,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(sql`COALESCE(${videoStats.viewsTotal}, 0)`))
            .limit(limit);

        return results.map((v) => ({
            ...v,
            score: v.viewsTotal,
        }));
    }

    /**
     * Get hot from database (fallback)
     */
    private async getHotFromDb(limit: number): Promise<TrendingVideo[]> {
        if (!db) return [];

        const results = await db
            .select({
                id: videos.id,
                source: videos.source,
                externalId: videos.externalId,
                title: videos.title,
                poster: videos.poster,
                description: videos.description,
                genres: videos.genres,
                releaseYear: videos.releaseYear,
                totalEpisodes: videos.totalEpisodes,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(sql`COALESCE(${videoStats.views24h}, 0)`))
            .limit(limit);

        return results.map((v) => ({
            ...v,
            score: v.views24h,
        }));
    }
}

// Singleton instance
export const trendingService = new TrendingService();
