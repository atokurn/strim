// =============================================================================
// Database Schema - Drizzle ORM for Neon Postgres
// =============================================================================

import {
    pgTable,
    text,
    timestamp,
    integer,
    serial,
    varchar,
    uniqueIndex,
    index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// Videos Table - Normalized video metadata from all sources
// =============================================================================
export const videos = pgTable(
    "videos",
    {
        id: serial("id").primaryKey(),
        source: varchar("source", { length: 50 }).notNull(), // e.g., "dramadash", "dramabox"
        externalId: varchar("external_id", { length: 100 }).notNull(), // ID from the source API
        title: text("title").notNull(),
        poster: text("poster"),
        description: text("description"),
        genres: text("genres"), // JSON stringified array
        releaseYear: integer("release_year"),
        totalEpisodes: integer("total_episodes"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        // Unique constraint on source + externalId to prevent duplicates
        sourceExternalIdIdx: uniqueIndex("source_external_id_idx").on(
            table.source,
            table.externalId
        ),
        // Index for querying by source
        sourceIdx: index("source_idx").on(table.source),
    })
);

// =============================================================================
// Video Stats Table - View counts and analytics
// =============================================================================
export const videoStats = pgTable(
    "video_stats",
    {
        id: serial("id").primaryKey(),
        videoId: integer("video_id")
            .notNull()
            .references(() => videos.id, { onDelete: "cascade" }),
        viewsTotal: integer("views_total").default(0).notNull(),
        views24h: integer("views_24h").default(0).notNull(),
        lastViewedAt: timestamp("last_viewed_at"),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        videoIdIdx: uniqueIndex("video_stats_video_id_idx").on(table.videoId),
        viewsTotalIdx: index("views_total_idx").on(table.viewsTotal),
    })
);

// =============================================================================
// User Watch History Table - For per-user tracking (optional)
// =============================================================================
export const userWatchHistory = pgTable(
    "user_watch_history",
    {
        id: serial("id").primaryKey(),
        userId: varchar("user_id", { length: 100 }).notNull(), // Anonymous or authenticated user ID
        videoId: integer("video_id")
            .notNull()
            .references(() => videos.id, { onDelete: "cascade" }),
        episodeNumber: integer("episode_number").notNull(),
        progress: integer("progress").default(0), // Seconds watched
        watchedAt: timestamp("watched_at").defaultNow().notNull(),
    },
    (table) => ({
        userVideoIdx: index("user_video_idx").on(table.userId, table.videoId),
    })
);

// =============================================================================
// Relations
// =============================================================================
export const videosRelations = relations(videos, ({ one }) => ({
    stats: one(videoStats, {
        fields: [videos.id],
        references: [videoStats.videoId],
    }),
}));

export const videoStatsRelations = relations(videoStats, ({ one }) => ({
    video: one(videos, {
        fields: [videoStats.videoId],
        references: [videos.id],
    }),
}));

// =============================================================================
// Explore Index Table - Precomputed, denormalized for fast queries
// NO JOINS NEEDED - all data is pre-aggregated
// =============================================================================
export const exploreIndex = pgTable(
    "explore_index",
    {
        id: serial("id").primaryKey(),
        source: varchar("source", { length: 50 }).notNull(),
        externalId: varchar("external_id", { length: 100 }).notNull(),
        title: text("title").notNull(),
        poster: text("poster"),
        description: text("description"),
        genres: text("genres"), // JSON array
        releaseYear: integer("release_year"),
        totalEpisodes: integer("total_episodes"),
        // Precomputed scores - NO runtime calculation needed
        popularityScore: integer("popularity_score").default(0).notNull(),
        latestScore: integer("latest_score").default(0).notNull(),
        ratingScore: integer("rating_score").default(0).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        // Unique constraint to prevent duplicates
        sourceExternalIdx: uniqueIndex("explore_source_external_idx").on(
            table.source,
            table.externalId
        ),
        // Indexes for fast sorted queries
        popularityIdx: index("explore_popularity_idx").on(table.popularityScore),
        latestIdx: index("explore_latest_idx").on(table.latestScore),
        ratingIdx: index("explore_rating_idx").on(table.ratingScore),
        sourceIdx: index("explore_source_idx").on(table.source),

        // Composite indexes for filtering by source AND sorting
        sourcePopularityIdx: index("explore_source_popularity_idx").on(table.source, table.popularityScore),
        sourceLatestIdx: index("explore_source_latest_idx").on(table.source, table.latestScore),
        sourceRatingIdx: index("explore_source_rating_idx").on(table.source, table.ratingScore),
    })
);

// =============================================================================
// TypeScript Types (inferred from schema)
// =============================================================================
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoStats = typeof videoStats.$inferSelect;
export type NewVideoStats = typeof videoStats.$inferInsert;
export type UserWatchHistory = typeof userWatchHistory.$inferSelect;
export type NewUserWatchHistory = typeof userWatchHistory.$inferInsert;
export type ExploreIndexEntry = typeof exploreIndex.$inferSelect;
export type NewExploreIndexEntry = typeof exploreIndex.$inferInsert;

