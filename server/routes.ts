import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { db } from "./db";
import { leaderboardEntries } from "@shared/schema";
import { eq, ilike, or, lte, sql } from "drizzle-orm";

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

// Helper to extract Twitter username from various formats:
// - https://x.com/DeRonin_ -> deronin_
// - https://twitter.com/DeRonin_ -> deronin_
// - x.com/DeRonin_ -> deronin_
// - @DeRonin_ -> deronin_
// - DeRonin_ -> deronin_
function extractTwitterHandle(input: string): string {
  if (!input) return '';
  
  let handle = input.trim();
  
  // Remove URL parts if present
  handle = handle.replace(/^https?:\/\//i, ''); // Remove http:// or https://
  handle = handle.replace(/^(www\.)?(x\.com|twitter\.com)\//i, ''); // Remove x.com/ or twitter.com/
  handle = handle.replace(/\?.*$/, ''); // Remove query string
  handle = handle.replace(/\/$/, ''); // Remove trailing slash
  handle = handle.replace(/^@/, ''); // Remove leading @
  
  return handle.toLowerCase();
}

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

  // GET /api/suggestions/:query - Get search suggestions (top 1500 rank users only)
  app.get("/api/suggestions/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const searchTerm = query.replace('@', '').toLowerCase().trim();
      
      if (!searchTerm || searchTerm.length < 1) {
        return res.json({ suggestions: [] });
      }
      
      // Search in all seasons (s1-s4) for users with rank <= 1500
      const allSuggestions: { username: string; handle: string; rank: number; season: string }[] = [];
      
      // First, search historical seasons s1-s4 from database
      for (const season of ["s4", "s3", "s2", "s1"]) {
        const dbResults = await db
          .select()
          .from(leaderboardEntries)
          .where(eq(leaderboardEntries.season, season));
        
        const matches = dbResults
          .filter(entry => {
            const extractedHandle = extractTwitterHandle(entry.handle);
            const displayName = entry.username.toLowerCase();
            return (extractedHandle.includes(searchTerm) || displayName.includes(searchTerm)) && entry.rank <= 1500;
          })
          .map(entry => ({
            username: entry.username,
            handle: extractTwitterHandle(entry.handle),
            rank: entry.rank,
            season,
          }));
        
        allSuggestions.push(...matches);
      }
      
      // Also search S5 live data (fetch first 15 pages = top 1500 for 30d timeframe)
      try {
        const liveData = await fetchLiveLeaderboard("30d", 15);
        const s5Matches = liveData
          .filter(entry => {
            const handle = entry.username.toLowerCase();
            const displayName = (entry.displayName || '').toLowerCase();
            return (handle.includes(searchTerm) || displayName.includes(searchTerm)) && entry.rank <= 1500;
          })
          .map(entry => ({
            username: entry.displayName || entry.username,
            handle: entry.username,
            rank: entry.rank,
            season: "s5",
          }));
        allSuggestions.push(...s5Matches);
      } catch (e) {
        console.error("Error fetching S5 suggestions:", e);
      }
      
      // Deduplicate by handle and take top 4 by best rank
      const uniqueByHandle = new Map<string, typeof allSuggestions[0]>();
      for (const suggestion of allSuggestions) {
        const existing = uniqueByHandle.get(suggestion.handle);
        if (!existing || suggestion.rank < existing.rank) {
          uniqueByHandle.set(suggestion.handle, suggestion);
        }
      }
      
      const suggestions = Array.from(uniqueByHandle.values())
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 4);
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.json({ suggestions: [] });
    }
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
        
        // Search by Twitter handle (extracted from URL or @handle) or display name
        const found = dbResults.find(entry => {
          const extractedHandle = extractTwitterHandle(entry.handle);
          const displayName = entry.username.toLowerCase();
          return extractedHandle.includes(searchTerm) ||
            searchTerm.includes(extractedHandle) ||
            displayName.includes(searchTerm);
        });
        
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
      
      // Get the actual Twitter handle for profile picture using the helper
      let twitterHandle = searchTerm;
      let displayName = searchTerm;
      let handleDisplay = `@${searchTerm}`;
      
      if (s5User) {
        twitterHandle = s5User.username;
        displayName = s5User.displayName || s5User.username;
        handleDisplay = `@${s5User.username}`;
      } else if (foundResult?.handle) {
        // Extract handle from S1-S4 result using the helper (handles URLs, @handles, etc.)
        twitterHandle = extractTwitterHandle(foundResult.handle) || searchTerm;
        displayName = foundResult.username || twitterHandle;
        handleDisplay = `@${twitterHandle}`;
      }
      
      res.json({
        searchedUsername: twitterHandle,
        displayName,
        handle: handleDisplay,
        profilePic: `https://unavatar.io/twitter/${twitterHandle}`,
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
