import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { db } from "./db";
import { leaderboardEntries } from "@shared/schema";
import { eq, ilike, or } from "drizzle-orm";

interface ApiEntry {
  rank: number;
  username: string;
  twitterId: string;
  displayName: string;
  mindshare: number;
  mindshareDelta: number;
  snaps: number;
  snapsDelta: number;
}

interface ApiResponse {
  success: boolean;
  data: ApiEntry[];
}

interface UserRankResult {
  season: string;
  rank: number | null;
  username: string | null;
  handle: string | null;
  found: boolean;
}

interface S5RankResult {
  rank24h: number | null;
  rank7d: number | null;
  rank30d: number | null;
  mindshare24h: number | null;
  mindshare7d: number | null;
  mindshare30d: number | null;
  found: boolean;
}

const API_BASE = "https://leaderboard-bice-mu.vercel.app/api/zama";

async function fetchLiveLeaderboard(timeframe: string, maxPages: number = 15): Promise<ApiEntry[]> {
  const allEntries: ApiEntry[] = [];
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${API_BASE}?timeframe=${timeframe}&sortBy=mindshare&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) break;
      
      const json = await response.json() as ApiResponse;
      
      if (!json.success || !json.data || json.data.length === 0) break;
      
      allEntries.push(...json.data);
      
      if (json.data.length < 100) break;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allEntries;
}

async function searchUserInLeaderboard(username: string, timeframe: string): Promise<ApiEntry | null> {
  const searchTerm = username.toLowerCase().replace('@', '');
  let page = 1;
  const maxPages = 50;
  
  while (page <= maxPages) {
    try {
      const url = `${API_BASE}?timeframe=${timeframe}&sortBy=mindshare&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) break;
      
      const json = await response.json() as ApiResponse;
      
      if (!json.success || !json.data || json.data.length === 0) break;
      
      const found = json.data.find(entry => 
        entry.username.toLowerCase() === searchTerm ||
        entry.displayName.toLowerCase().includes(searchTerm)
      );
      
      if (found) return found;
      
      if (json.data.length < 100) break;
      page++;
    } catch (error) {
      console.error(`Error searching page ${page}:`, error);
      break;
    }
  }
  
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET /api/leaderboard/:season - Get leaderboard data for a season
  app.get("/api/leaderboard/:season", async (req, res) => {
    try {
      const { season } = req.params;
      
      // For historical seasons (s1-s4), fetch from database
      if (["s1", "s2", "s3", "s4"].includes(season)) {
        const dbData = await db
          .select()
          .from(leaderboardEntries)
          .where(eq(leaderboardEntries.season, season))
          .orderBy(leaderboardEntries.rank);
        
        const data = dbData.map(entry => {
          const twitterHandle = entry.handle.replace('@', '');
          return {
            id: entry.id,
            season: entry.season,
            rank: entry.rank,
            username: entry.username,
            handle: entry.handle,
            avatarUrl: `https://unavatar.io/twitter/${twitterHandle}`,
          };
        });
        
        res.json({
          season,
          count: data.length,
          lastUpdated: dbData[0]?.scrapedAt?.toISOString() || null,
          data,
        });
      } else if (season === "s5") {
        // For Season 5, fetch live data
        const { range } = req.query;
        let timeframe = "30d";
        if (range === "24h") timeframe = "24h";
        else if (range === "7d") timeframe = "7d";
        else if (range === "30d") timeframe = "30d";
        
        const liveData = await fetchLiveLeaderboard(timeframe);
        
        const data = liveData.map(entry => ({
          id: 0,
          season,
          rank: entry.rank,
          username: entry.displayName || entry.username,
          handle: `@${entry.username}`,
          avatarUrl: `https://unavatar.io/twitter/${entry.username}`,
        }));
        
        res.json({
          season,
          count: data.length,
          lastUpdated: new Date().toISOString(),
          data,
        });
      } else {
        res.json({
          season,
          count: 0,
          lastUpdated: null,
          message: `Season ${season} not found.`,
          data: [],
        });
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard data" });
    }
  });

  // POST /api/refresh - Manually refresh data (for testing)
  app.post("/api/refresh", async (_req, res) => {
    res.json({ success: true, message: "Data is fetched live from API" });
  });

  // GET /api/search/:username - Search for a user across all seasons
  app.get("/api/search/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const searchTerm = username.replace('@', '').toLowerCase();
      
      if (!searchTerm || searchTerm.length < 2) {
        return res.status(400).json({ error: "Username must be at least 2 characters" });
      }
      
      const results: UserRankResult[] = [];
      
      // Search S1-S4 in database
      for (const season of ["s1", "s2", "s3", "s4"]) {
        const dbResults = await db
          .select()
          .from(leaderboardEntries)
          .where(eq(leaderboardEntries.season, season));
        
        const found = dbResults.find(entry => 
          entry.handle.toLowerCase().includes(searchTerm) ||
          entry.username.toLowerCase().includes(searchTerm)
        );
        
        results.push({
          season,
          rank: found?.rank || null,
          username: found?.username || null,
          handle: found?.handle || null,
          found: !!found,
        });
      }
      
      // Search S5 with all timeframes in parallel
      const [user24h, user7d, user30d] = await Promise.all([
        searchUserInLeaderboard(searchTerm, "24h"),
        searchUserInLeaderboard(searchTerm, "7d"),
        searchUserInLeaderboard(searchTerm, "30d"),
      ]);
      
      const s5Result: S5RankResult = {
        rank24h: user24h?.rank || null,
        rank7d: user7d?.rank || null,
        rank30d: user30d?.rank || null,
        mindshare24h: user24h?.mindshare || null,
        mindshare7d: user7d?.mindshare || null,
        mindshare30d: user30d?.mindshare || null,
        found: !!(user24h || user7d || user30d),
      };
      
      // Find user info from any found result
      const foundResult = results.find(r => r.found);
      const s5User = user30d || user7d || user24h;
      
      res.json({
        searchedUsername: searchTerm,
        displayName: s5User?.displayName || foundResult?.username || searchTerm,
        handle: s5User ? `@${s5User.username}` : (foundResult?.handle || `@${searchTerm}`),
        profilePic: s5User ? `https://unavatar.io/twitter/${s5User.username}` : `https://unavatar.io/twitter/${searchTerm}`,
        results,
        s5: s5Result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error searching user:", error);
      res.status(500).json({ error: "Failed to search for user" });
    }
  });

  return httpServer;
}
