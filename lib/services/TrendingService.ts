// =============================================================================
// Trending Service - Local-only trending queries (Redis-first, DB fallback)
// NEVER calls external APIs - all data comes from local DB/Redis
// =============================================================================

import { cacheService } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { exploreIndex, videos, videoStats } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

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
     * Get trending videos (Popularity Score)
     * Queries precomputed explore_index table
     */
    async getTrending(limit: number = 20): Promise<TrendingVideo[]> {
        if (!db) return [];

        const results = await db
            .select()
            .from(exploreIndex)
            .orderBy(desc(exploreIndex.popularityScore), desc(exploreIndex.id))
            .limit(limit);

        return results.map(this.mapExploreIndexToTrending);
    }

    /**
     * Get hot/latest videos (Latest Score)
     * Queries precomputed explore_index table
     */
    async getHot(limit: number = 20): Promise<TrendingVideo[]> {
        if (!db) return [];

        const results = await db
            .select()
            .from(exploreIndex)
            .orderBy(desc(exploreIndex.latestScore), desc(exploreIndex.id))
            .limit(limit);

        return results.map(this.mapExploreIndexToTrending);
    }

    /**
     * Get explore videos with cursor-based pagination
     * Queries precomputed explore_index table
     */
    async getExplore(options: {
        limit?: number;
        cursor?: string | null;
        source?: string;
        sortBy?: "latest" | "popular" | "rating";
    } = {}): Promise<CursorPaginatedResult> {
        const { limit = 20, cursor, source, sortBy = "popular" } = options;

        if (!db) {
            return { videos: [], nextCursor: null, hasMore: false };
        }

        // Determine sort column
        const sortColumn = sortBy === "latest"
            ? exploreIndex.latestScore
            : sortBy === "rating"
                ? exploreIndex.ratingScore
                : exploreIndex.popularityScore;

        // Parse cursor
        let cursorScore: number | null = null;
        let cursorId: number | null = null;

        if (cursor) {
            const [scoreStr, idStr] = cursor.split(":");
            cursorScore = parseInt(scoreStr, 10);
            cursorId = parseInt(idStr, 10);
        }

        // Build query
        let query = db
            .select()
            .from(exploreIndex)
            .limit(limit + 1);

        // Apply source filter
        if (source && source !== "all") {
            query = query.where(eq(exploreIndex.source, source)) as typeof query;
        }

        // Apply cursor condition
        if (cursorScore !== null && cursorId !== null) {
            // WHERE (score, id) < (cursorScore, cursorId)
            query = query.where(
                sql`(${sortColumn}, ${exploreIndex.id}) < (${cursorScore}, ${cursorId})`
            ) as typeof query;
        }

        // Apply sorting
        query = query.orderBy(desc(sortColumn), desc(exploreIndex.id)) as typeof query;

        const results = await query;

        const hasMore = results.length > limit;
        const videosToReturn = hasMore ? results.slice(0, limit) : results;

        // Build next cursor
        let nextCursor: string | null = null;
        if (hasMore && videosToReturn.length > 0) {
            const lastVideo = videosToReturn[videosToReturn.length - 1];
            const scoreVal = sortBy === "latest"
                ? lastVideo.latestScore
                : sortBy === "rating"
                    ? lastVideo.ratingScore
                    : lastVideo.popularityScore;
            nextCursor = `${scoreVal}:${lastVideo.id}`;
        }

        return {
            videos: videosToReturn.map(this.mapExploreIndexToTrending),
            nextCursor,
            hasMore,
        };
    }

    /**
     * Helper to map explore_index entry to TrendingVideo interface
     */
    private mapExploreIndexToTrending(entry: typeof exploreIndex.$inferSelect): TrendingVideo {
        return {
            id: entry.id,
            source: entry.source,
            externalId: entry.externalId,
            title: entry.title,
            poster: entry.poster,
            description: entry.description,
            genres: entry.genres,
            releaseYear: entry.releaseYear,
            totalEpisodes: entry.totalEpisodes,
            // Use popularityScore as proxy for views in UI if needed, 
            // or we could join with videoStats if strictly required, but we want to avoid joins.
            // For now, let's just use popularityScore as "score" and 0 for views to indicate they are abstract.
            viewsTotal: entry.popularityScore,
            views24h: 0,
            score: entry.popularityScore,
        };
    }
}

// Singleton instance
export const trendingService = new TrendingService();
