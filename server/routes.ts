import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET /api/leaderboard/:season - Get latest leaderboard data for a season
  app.get("/api/leaderboard/:season", async (req, res) => {
    try {
      const { season } = req.params;
      const { range } = req.query;
      
      let hoursAgo: number | undefined;
      
      // Map time ranges to hours
      if (range === '24h') {
        hoursAgo = 24;
      } else if (range === '7d') {
        hoursAgo = 24 * 7;
      } else if (range === '30d') {
        hoursAgo = 24 * 30;
      }
      
      const data = await storage.getLatestLeaderboardData(season);
      
      res.json({
        season,
        range: range || 'latest',
        count: data.length,
        lastUpdated: data[0]?.scrapedAt || null,
        data,
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard data" });
    }
  });

  // GET /api/leaderboard/:season/history - Get historical data with changes
  app.get("/api/leaderboard/:season/history", async (req, res) => {
    try {
      const { season } = req.params;
      const { hours } = req.query;
      
      const hoursAgo = hours ? parseInt(hours as string) : undefined;
      const entries = await storage.getLeaderboardEntries(season, hoursAgo);
      
      res.json({
        season,
        hoursAgo,
        count: entries.length,
        data: entries,
      });
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  // POST /api/scraper/trigger - Manually trigger scraper (for testing)
  app.post("/api/scraper/trigger", async (req, res) => {
    try {
      const { runScraper } = await import("./scheduler");
      await runScraper();
      res.json({ success: true, message: "Scraper triggered successfully" });
    } catch (error) {
      console.error("Error triggering scraper:", error);
      res.status(500).json({ error: "Failed to trigger scraper" });
    }
  });

  return httpServer;
}
