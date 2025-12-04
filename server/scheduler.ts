import { scrapeZamaLeaderboard } from "./scraper";
import { storage } from "./storage";

const SCRAPE_INTERVAL = 60 * 1000; // 60 seconds (1 minute)
const SEASONS = ['s5', 's4', 's3', 's2', 's1'];

let isScrapingActive = false;

export async function runScraper() {
  if (isScrapingActive) {
    console.log("Scraper already running, skipping...");
    return;
  }

  isScrapingActive = true;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting scraper run...`);
    
    // For now, only scrape the active season (S5)
    // Historical seasons would need archived data or separate endpoints
    const activeSeason = 's5';
    const entries = await scrapeZamaLeaderboard(activeSeason);
    
    if (entries.length > 0) {
      await storage.saveLeaderboardEntries(entries);
      console.log(`[${new Date().toISOString()}] Saved ${entries.length} entries for ${activeSeason}`);
    } else {
      console.log(`[${new Date().toISOString()}] No entries scraped for ${activeSeason}`);
    }
  } catch (error) {
    console.error("Error during scraper run:", error);
  } finally {
    isScrapingActive = false;
  }
}

export function startScheduler() {
  console.log("Starting leaderboard scraper scheduler (runs every minute)...");
  
  // Run immediately on startup
  runScraper();
  
  // Then run every minute
  setInterval(runScraper, SCRAPE_INTERVAL);
}
