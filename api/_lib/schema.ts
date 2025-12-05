import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, real, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  season: text("season").notNull(),
  rank: integer("rank").notNull(),
  username: text("username").notNull(),
  handle: text("handle").notNull(),
  mindshare: real("mindshare").notNull(),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});
