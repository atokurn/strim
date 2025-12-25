// =============================================================================
// Redis Cache Service - Caching and view counting for trending/hot
// =============================================================================

import Redis from "ioredis";

// =============================================================================
// Redis Client Singleton
// =============================================================================
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
    if (!process.env.REDIS_URL) {
        console.warn("[Redis] REDIS_URL not set - caching disabled");
        return null;
    }

    if (!redisClient) {
        redisClient = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        redisClient.on("error", (err) => {
            console.error("[Redis] Connection error:", err.message);
        });
    }

    return redisClient;
}

// =============================================================================
// Cache Keys
// =============================================================================
const KEYS = {
    HOME_CACHE: "cache:home",
    ALL_VIDEOS_CACHE: "cache:videos:all",
    TRENDING_SORTED_SET: "trending:videos",
    HOT_SORTED_SET: "hot:videos",
    VIEW_PREFIX: "views:",
    VIEW_24H_PREFIX: "views_24h:",
} as const;

// TTL values in seconds
const TTL = {
    HOME_CACHE: 300, // 5 minutes
    ALL_VIDEOS: 300, // 5 minutes
    VIEW_24H: 86400, // 24 hours
} as const;

// =============================================================================
// Cache Service
// =============================================================================
export class CacheService {
    private redis: Redis | null;

    constructor() {
        this.redis = getRedisClient();
    }

    // =========================================================================
    // Basic Cache Operations
    // =========================================================================

    /**
     * Get cached value by key
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.redis) return null;
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error("[Cache] Get error:", error);
            return null;
        }
    }

    /**
     * Set cache with optional TTL
     */
    async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
        if (!this.redis) return false;
        try {
            const data = JSON.stringify(value);
            if (ttlSeconds) {
                await this.redis.setex(key, ttlSeconds, data);
            } else {
                await this.redis.set(key, data);
            }
            return true;
        } catch (error) {
            console.error("[Cache] Set error:", error);
            return false;
        }
    }

    /**
     * Delete cache key
     */
    async del(key: string): Promise<boolean> {
        if (!this.redis) return false;
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error("[Cache] Del error:", error);
            return false;
        }
    }

    // =========================================================================
    // Home Page Cache
    // =========================================================================

    async getCachedHome<T>(): Promise<T | null> {
        return this.get<T>(KEYS.HOME_CACHE);
    }

    async setCachedHome(data: unknown): Promise<boolean> {
        return this.set(KEYS.HOME_CACHE, data, TTL.HOME_CACHE);
    }

    async invalidateHomeCache(): Promise<boolean> {
        return this.del(KEYS.HOME_CACHE);
    }

    // =========================================================================
    // All Videos Cache
    // =========================================================================

    async getCachedAllVideos<T>(): Promise<T | null> {
        return this.get<T>(KEYS.ALL_VIDEOS_CACHE);
    }

    async setCachedAllVideos(data: unknown): Promise<boolean> {
        return this.set(KEYS.ALL_VIDEOS_CACHE, data, TTL.ALL_VIDEOS);
    }

    // =========================================================================
    // View Counting (for Trending)
    // =========================================================================

    /**
     * Increment total view count for a video
     * Uses Redis sorted set for efficient ranking
     */
    async incrementViewCount(videoKey: string): Promise<number> {
        if (!this.redis) return 0;
        try {
            // Increment in sorted set (ZINCRBY)
            const newScore = await this.redis.zincrby(
                KEYS.TRENDING_SORTED_SET,
                1,
                videoKey
            );
            return parseFloat(newScore);
        } catch (error) {
            console.error("[Cache] View increment error:", error);
            return 0;
        }
    }

    /**
     * Get top trending videos by view count
     */
    async getTrendingScores(limit: number = 20): Promise<{ key: string; score: number }[]> {
        if (!this.redis) return [];
        try {
            // ZREVRANGE with scores (highest first)
            const results = await this.redis.zrevrange(
                KEYS.TRENDING_SORTED_SET,
                0,
                limit - 1,
                "WITHSCORES"
            );

            // Parse results: [key1, score1, key2, score2, ...]
            const trending: { key: string; score: number }[] = [];
            for (let i = 0; i < results.length; i += 2) {
                trending.push({
                    key: results[i],
                    score: parseFloat(results[i + 1]),
                });
            }
            return trending;
        } catch (error) {
            console.error("[Cache] Get trending error:", error);
            return [];
        }
    }

    // =========================================================================
    // Hot Scoring (Time-Weighted 24h Views)
    // =========================================================================

    /**
     * Record a view for hot scoring (24h window)
     * Uses a separate key with TTL for natural expiration
     */
    async recordHotView(videoKey: string): Promise<void> {
        if (!this.redis) return;
        try {
            const hourKey = `${KEYS.VIEW_24H_PREFIX}${videoKey}:${this.getCurrentHour()}`;

            // Increment hourly counter with 24h TTL
            await this.redis.incr(hourKey);
            await this.redis.expire(hourKey, TTL.VIEW_24H);

            // Update hot score (calculated on read)
        } catch (error) {
            console.error("[Cache] Hot view record error:", error);
        }
    }

    /**
     * Calculate hot score for a video
     * Score = sum of (views_in_hour × decay_factor)
     * decay_factor = e^(-hours_ago / 24)
     */
    async calculateHotScore(videoKey: string): Promise<number> {
        if (!this.redis) return 0;
        try {
            const currentHour = this.getCurrentHour();
            let totalScore = 0;

            // Check last 24 hours
            for (let hoursAgo = 0; hoursAgo < 24; hoursAgo++) {
                const hour = currentHour - hoursAgo;
                const hourKey = `${KEYS.VIEW_24H_PREFIX}${videoKey}:${hour}`;
                const views = await this.redis.get(hourKey);

                if (views) {
                    // Exponential decay: more recent = higher weight
                    const decayFactor = Math.exp(-hoursAgo / 24);
                    totalScore += parseInt(views) * decayFactor;
                }
            }

            return totalScore;
        } catch (error) {
            console.error("[Cache] Hot score calculation error:", error);
            return 0;
        }
    }

    /**
     * Update hot sorted set with calculated scores
     */
    async updateHotScores(videoKeys: string[]): Promise<void> {
        if (!this.redis || videoKeys.length === 0) return;
        try {
            // Calculate scores for all videos
            const scores = await Promise.all(
                videoKeys.map(async (key) => ({
                    key,
                    score: await this.calculateHotScore(key),
                }))
            );

            // Update sorted set
            const pipeline = this.redis.pipeline();
            for (const { key, score } of scores) {
                pipeline.zadd(KEYS.HOT_SORTED_SET, score, key);
            }
            await pipeline.exec();
        } catch (error) {
            console.error("[Cache] Hot scores update error:", error);
        }
    }

    /**
     * Get hot videos (time-weighted)
     */
    async getHotScores(limit: number = 20): Promise<{ key: string; score: number }[]> {
        if (!this.redis) return [];
        try {
            const results = await this.redis.zrevrange(
                KEYS.HOT_SORTED_SET,
                0,
                limit - 1,
                "WITHSCORES"
            );

            const hot: { key: string; score: number }[] = [];
            for (let i = 0; i < results.length; i += 2) {
                hot.push({
                    key: results[i],
                    score: parseFloat(results[i + 1]),
                });
            }
            return hot;
        } catch (error) {
            console.error("[Cache] Get hot error:", error);
            return [];
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private getCurrentHour(): number {
        return Math.floor(Date.now() / 3600000); // Hours since epoch
    }

    /**
     * Create a video key from source and ID
     */
    static createVideoKey(source: string, externalId: string): string {
        return `${source}:${externalId}`;
    }

    /**
     * Parse a video key into source and ID
     */
    static parseVideoKey(key: string): { source: string; externalId: string } | null {
        const parts = key.split(":");
        if (parts.length !== 2) return null;
        return { source: parts[0], externalId: parts[1] };
    }

    /**
     * Check if Redis is available
     */
    isAvailable(): boolean {
        return this.redis !== null;
    }

    /**
     * Close connection (for cleanup)
     */
    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            redisClient = null;
        }
    }
}

// Singleton instance
export const cacheService = new CacheService();
