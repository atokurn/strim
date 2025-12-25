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
// TypeScript Types (inferred from schema)
// =============================================================================
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoStats = typeof videoStats.$inferSelect;
export type NewVideoStats = typeof videoStats.$inferInsert;
export type UserWatchHistory = typeof userWatchHistory.$inferSelect;
export type NewUserWatchHistory = typeof userWatchHistory.$inferInsert;
