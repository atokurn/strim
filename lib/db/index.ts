// =============================================================================
// Database Connection - Neon Serverless Postgres with Drizzle ORM
// =============================================================================

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Validate environment variable
if (!process.env.DATABASE_URL) {
    console.warn("[DB] DATABASE_URL not set - database features will be disabled");
}

// Create Neon SQL client
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// Create Drizzle instance with schema
export const db = sql ? drizzle(sql, { schema }) : null;

// Export schema for convenience
export * from "./schema";

// Type helper for when DB is available
export function getDb() {
    if (!db) {
        throw new Error("Database not configured. Set DATABASE_URL environment variable.");
    }
    return db;
}
