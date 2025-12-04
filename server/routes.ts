import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET /api/leaderboard/:season - Get live leaderboard data for a season
  app.get("/api/leaderboard/:season", async (req, res) => {
    try {
      const { season } = req.params;
      const { range } = req.query;
      
      // Map our range params to API timeframe
      let timeframe = "30d";
      if (range === "24h") timeframe = "24h";
      else if (range === "7d") timeframe = "7d";
      else if (range === "30d") timeframe = "30d";
      
      // Only fetch live data for Season 5 (current season)
      if (season === "s5") {
        const liveData = await fetchLiveLeaderboard(timeframe);
        
        const data = liveData.map(entry => ({
          id: 0,
          season,
          rank: entry.rank,
          username: entry.displayName || entry.username,
          handle: `@${entry.username}`,
          mindshare: entry.mindshare,
          mindshareDelta: entry.mindshareDelta,
          scrapedAt: new Date().toISOString(),
        }));
        
        res.json({
          season,
          range: timeframe,
          count: data.length,
          lastUpdated: new Date().toISOString(),
          data,
        });
      } else {
        // For older seasons, return empty or historical data message
        res.json({
          season,
          range: range || "30d",
          count: 0,
          lastUpdated: null,
          message: `Season ${season.toUpperCase()} is closed. Historical data not available via live API.`,
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

  return httpServer;
}
