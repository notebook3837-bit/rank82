import fetch from "node-fetch";
import type { InsertLeaderboardEntry } from "@shared/schema";

interface ApiResponse {
  success: boolean;
  data: {
    rank: number;
    username: string;
    twitterId: string;
    displayName: string;
    mindshare: number;
    mindshareDelta: number;
    snaps: number;
    snapsDelta: number;
  }[];
}

const API_BASE = "https://leaderboard-bice-mu.vercel.app/api/zama";

export async function scrapeZamaLeaderboard(
  season: string = "s5",
  timeframe: string = "30d"
): Promise<InsertLeaderboardEntry[]> {
  const allEntries: InsertLeaderboardEntry[] = [];
  let page = 1;
  let hasMore = true;
  
  console.log(`Fetching leaderboard data for ${season} (${timeframe})...`);
  
  try {
    while (hasMore && page <= 20) {
      const url = `${API_BASE}?timeframe=${timeframe}&sortBy=mindshare&page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        break;
      }
      
      const json = await response.json() as ApiResponse;
      
      if (!json.success || !json.data || json.data.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const entry of json.data) {
        allEntries.push({
          season,
          rank: entry.rank,
          username: entry.displayName || entry.username,
          handle: `@${entry.username}`,
          mindshare: entry.mindshare,
        });
      }
      
      console.log(`Fetched page ${page}: ${json.data.length} entries (total: ${allEntries.length})`);
      
      if (json.data.length < 100) {
        hasMore = false;
      }
      
      page++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`Total scraped: ${allEntries.length} entries for ${season} (${timeframe})`);
    return allEntries;
  } catch (error) {
    console.error("Error scraping Zama leaderboard:", error);
    return allEntries;
  }
}

export async function fetchLeaderboardByTimeframe(timeframe: string): Promise<InsertLeaderboardEntry[]> {
  return scrapeZamaLeaderboard("s5", timeframe);
}
