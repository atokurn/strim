// =============================================================================
// Aggregator Service - Fetches, normalizes, stores and caches videos from all sources
// =============================================================================

import { eq, and, desc, sql, lt, or } from "drizzle-orm";
import { db, getDb, videos, videoStats, type Video, type NewVideo } from "../db";
import { cacheService, CacheService } from "../cache/redis";
import { streamService, SUPPORTED_SOURCES } from "./StreamService";
import type { NormalizedDrama, SourceType } from "../types";

// =============================================================================
// Types
// =============================================================================
export interface VideoWithStats extends Video {
    viewsTotal: number;
    views24h: number;
}

export interface AggregatedVideosResult {
    videos: VideoWithStats[];
    total: number;
    sources: SourceType[];
}

export interface CursorPaginatedResult {
    videos: VideoWithStats[];
    nextCursor: string | null;
    hasMore: boolean;
}

// =============================================================================
// Aggregator Service
// =============================================================================
export class AggregatorService {
    // =========================================================================
    // Sync Operations - Fetch from adapters and store in DB
    // =========================================================================

    /**
     * Sync all sources: fetch from all adapters and upsert to database
     */
    async syncAllSources(): Promise<{ synced: number; errors: string[] }> {
        const errors: string[] = [];
        let totalSynced = 0;

        for (const source of SUPPORTED_SOURCES) {
            try {
                const result = await this.syncSource(source);
                totalSynced += result;
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                errors.push(`${source}: ${msg}`);
            }
        }

        // Invalidate caches after sync
        await cacheService.invalidateHomeCache();

        return { synced: totalSynced, errors };
    }

    /**
     * Sync a single source
     */
    async syncSource(source: SourceType): Promise<number> {
        const homeRes = await streamService.getHome(source);
        if (!homeRes.data) {
            throw new Error(`Failed to fetch home for ${source}`);
        }

        // Combine all videos from home data
        const allVideos: NormalizedDrama[] = [
            ...(homeRes.data.banners || []),
            ...(homeRes.data.trending || []),
            ...(homeRes.data.latest || []),
        ];

        // Dedupe by id
        const uniqueVideos = this.dedupeVideos(allVideos);

        // Upsert to database
        await this.upsertVideos(uniqueVideos);

        return uniqueVideos.length;
    }

    /**
     * Upsert videos to database
     */
    async upsertVideos(normalizedVideos: NormalizedDrama[]): Promise<void> {
        if (!db || normalizedVideos.length === 0) return;

        const database = getDb();

        for (const video of normalizedVideos) {
            try {
                // Check if exists
                const existing = await database
                    .select()
                    .from(videos)
                    .where(
                        and(
                            eq(videos.source, video.source),
                            eq(videos.externalId, video.id)
                        )
                    )
                    .limit(1);

                const videoData: NewVideo = {
                    source: video.source,
                    externalId: video.id,
                    title: video.title,
                    poster: video.poster,
                    description: video.description,
                    genres: video.genres ? JSON.stringify(video.genres) : null,
                    releaseYear: video.releaseYear,
                    totalEpisodes: video.totalEpisodes,
                    updatedAt: new Date(),
                };

                if (existing.length > 0) {
                    // Update
                    await database
                        .update(videos)
                        .set(videoData)
                        .where(eq(videos.id, existing[0].id));
                } else {
                    // Insert
                    const [inserted] = await database
                        .insert(videos)
                        .values(videoData)
                        .returning();

                    // Create stats record
                    if (inserted) {
                        await database.insert(videoStats).values({
                            videoId: inserted.id,
                            viewsTotal: 0,
                            views24h: 0,
                        });
                    }
                }
            } catch (error) {
                console.error(`[Aggregator] Upsert error for ${video.id}:`, error);
            }
        }
    }

    // =========================================================================
    // Read Operations - Get videos with caching
    // =========================================================================

    /**
     * Get all videos with optional caching
     */
    async getAllVideos(options: {
        limit?: number;
        offset?: number;
        source?: SourceType;
        cached?: boolean;
    } = {}): Promise<AggregatedVideosResult> {
        const { limit = 20, offset = 0, source, cached = true } = options;

        // Check cache first
        if (cached && !source) {
            const cachedData = await cacheService.getCachedAllVideos<AggregatedVideosResult>();
            if (cachedData) return cachedData;
        }

        if (!db) {
            return { videos: [], total: 0, sources: SUPPORTED_SOURCES };
        }

        const database = getDb();

        // Build query
        let query = database
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
                updatedAt: videos.updatedAt,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(videos.updatedAt))
            .limit(limit)
            .offset(offset);

        if (source) {
            query = query.where(eq(videos.source, source)) as typeof query;
        }

        const result = await query;

        // Get total count
        const countResult = await database
            .select({ count: sql<number>`count(*)` })
            .from(videos);
        const total = countResult[0]?.count || 0;

        const response: AggregatedVideosResult = {
            videos: result as VideoWithStats[],
            total,
            sources: SUPPORTED_SOURCES,
        };

        // Cache if not filtered by source
        if (cached && !source) {
            await cacheService.setCachedAllVideos(response);
        }

        return response;
    }

    /**
     * Get videos with cursor-based pagination
     * Cursor format: "timestamp:id" (e.g., "1703487600000:42")
     * Uses (createdAt, id) for stable ordering - O(1) performance unlike OFFSET
     */
    async getVideosByCursor(options: {
        limit?: number;
        cursor?: string | null;
        source?: SourceType;
        sortBy?: "latest" | "popular" | "rating";
    } = {}): Promise<CursorPaginatedResult> {
        const { limit = 20, cursor, source, sortBy = "latest" } = options;

        if (!db) {
            return { videos: [], nextCursor: null, hasMore: false };
        }

        const database = getDb();

        // Parse cursor if provided
        let cursorTimestamp: Date | null = null;
        let cursorId: number | null = null;

        if (cursor) {
            const [timestamp, id] = cursor.split(":");
            cursorTimestamp = new Date(parseInt(timestamp, 10));
            cursorId = parseInt(id, 10);
        }

        // Build base query with stats
        const baseSelect = {
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
            updatedAt: videos.updatedAt,
            viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
            views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
        };

        // Build where conditions
        const conditions = [];

        // Source filter
        if (source) {
            conditions.push(eq(videos.source, source));
        }

        // Cursor condition - for stable pagination with compound cursor
        // We want items with (createdAt < cursorTimestamp) OR (createdAt = cursorTimestamp AND id < cursorId)
        if (cursorTimestamp && cursorId) {
            conditions.push(
                or(
                    lt(videos.createdAt, cursorTimestamp),
                    and(
                        eq(videos.createdAt, cursorTimestamp),
                        lt(videos.id, cursorId)
                    )
                )
            );
        }

        // Build query - fetch limit + 1 to check hasMore
        let query = database
            .select(baseSelect)
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(videos.createdAt), desc(videos.id))
            .limit(limit + 1);

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as typeof query;
        }

        const result = await query;

        // Check if there are more items
        const hasMore = result.length > limit;
        const videosToReturn = hasMore ? result.slice(0, limit) : result;

        // Build next cursor from the last item
        let nextCursor: string | null = null;
        if (hasMore && videosToReturn.length > 0) {
            const lastVideo = videosToReturn[videosToReturn.length - 1];
            nextCursor = `${lastVideo.createdAt.getTime()}:${lastVideo.id}`;
        }

        return {
            videos: videosToReturn as VideoWithStats[],
            nextCursor,
            hasMore,
        };
    }

    /**
     * Get trending videos (sorted by total views)
     */
    async getTrending(limit: number = 20): Promise<VideoWithStats[]> {
        // Try Redis sorted set first
        const redisScores = await cacheService.getTrendingScores(limit);

        if (redisScores.length > 0 && db) {
            // Fetch videos by keys
            return this.getVideosByKeys(redisScores.map((s) => s.key));
        }

        // Fallback to database
        if (!db) return [];

        const database = getDb();
        const result = await database
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
                updatedAt: videos.updatedAt,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(videoStats.viewsTotal))
            .limit(limit);

        return result as VideoWithStats[];
    }

    /**
     * Get hot videos (time-weighted 24h views)
     */
    async getHot(limit: number = 20): Promise<VideoWithStats[]> {
        // Try Redis sorted set first
        const redisScores = await cacheService.getHotScores(limit);

        if (redisScores.length > 0 && db) {
            return this.getVideosByKeys(redisScores.map((s) => s.key));
        }

        // Fallback to database (using 24h views)
        if (!db) return [];

        const database = getDb();
        const result = await database
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
                updatedAt: videos.updatedAt,
                viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
            })
            .from(videos)
            .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
            .orderBy(desc(videoStats.views24h))
            .limit(limit);

        return result as VideoWithStats[];
    }

    // =========================================================================
    // View Tracking
    // =========================================================================

    /**
     * Record a view for a video
     */
    async recordView(source: string, externalId: string): Promise<void> {
        const videoKey = CacheService.createVideoKey(source, externalId);

        // Update Redis
        await cacheService.incrementViewCount(videoKey);
        await cacheService.recordHotView(videoKey);

        // Update database
        if (db) {
            try {
                const database = getDb();

                // Find video
                const [video] = await database
                    .select()
                    .from(videos)
                    .where(
                        and(
                            eq(videos.source, source),
                            eq(videos.externalId, externalId)
                        )
                    )
                    .limit(1);

                if (video) {
                    // Update stats
                    await database
                        .update(videoStats)
                        .set({
                            viewsTotal: sql`${videoStats.viewsTotal} + 1`,
                            views24h: sql`${videoStats.views24h} + 1`,
                            lastViewedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(videoStats.videoId, video.id));
                }
            } catch (error) {
                console.error("[Aggregator] Record view DB error:", error);
            }
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private dedupeVideos(videos: NormalizedDrama[]): NormalizedDrama[] {
        const seen = new Set<string>();
        return videos.filter((v) => {
            const key = `${v.source}:${v.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    private async getVideosByKeys(keys: string[]): Promise<VideoWithStats[]> {
        if (!db || keys.length === 0) return [];

        const database = getDb();
        const results: VideoWithStats[] = [];

        for (const key of keys) {
            const parsed = CacheService.parseVideoKey(key);
            if (!parsed) continue;

            const [video] = await database
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
                    updatedAt: videos.updatedAt,
                    viewsTotal: sql<number>`COALESCE(${videoStats.viewsTotal}, 0)`,
                    views24h: sql<number>`COALESCE(${videoStats.views24h}, 0)`,
                })
                .from(videos)
                .leftJoin(videoStats, eq(videos.id, videoStats.videoId))
                .where(
                    and(
                        eq(videos.source, parsed.source),
                        eq(videos.externalId, parsed.externalId)
                    )
                )
                .limit(1);

            if (video) {
                results.push(video as VideoWithStats);
            }
        }

        return results;
    }
}

// Singleton instance
export const aggregatorService = new AggregatorService();
