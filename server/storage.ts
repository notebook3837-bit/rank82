import { 
  type User, 
  type InsertUser, 
  type LeaderboardEntry, 
  type InsertLeaderboardEntry,
  users,
  leaderboardEntries 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql, max } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  saveLeaderboardEntries(entries: InsertLeaderboardEntry[]): Promise<void>;
  getLeaderboardEntries(season: string, hoursAgo?: number): Promise<LeaderboardEntry[]>;
  getLatestLeaderboardData(season: string): Promise<LeaderboardEntry[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async saveLeaderboardEntries(entries: InsertLeaderboardEntry[]): Promise<void> {
    if (entries.length === 0) return;
    
    await db.insert(leaderboardEntries).values(entries);
  }

  async getLeaderboardEntries(season: string, hoursAgo?: number): Promise<LeaderboardEntry[]> {
    if (hoursAgo !== undefined) {
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      return db
        .select()
        .from(leaderboardEntries)
        .where(
          and(
            eq(leaderboardEntries.season, season),
            gte(leaderboardEntries.scrapedAt, cutoffTime)
          )
        )
        .orderBy(desc(leaderboardEntries.scrapedAt));
    }

    return db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.season, season))
      .orderBy(desc(leaderboardEntries.scrapedAt));
  }

  async getLatestLeaderboardData(season: string): Promise<LeaderboardEntry[]> {
    // First get all entries for this season ordered by scrape time
    const allEntries = await db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.season, season))
      .orderBy(desc(leaderboardEntries.scrapedAt));

    if (allEntries.length === 0) {
      return [];
    }

    // Get the most recent scrape time
    const latestTime = allEntries[0].scrapedAt;

    // Filter to only entries from that scrape time
    return allEntries.filter(entry => 
      entry.scrapedAt.getTime() === latestTime.getTime()
    ).sort((a, b) => a.rank - b.rank);
  }
}

export const storage = new DatabaseStorage();
