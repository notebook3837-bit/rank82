import fetch from "node-fetch";
import type { InsertLeaderboardEntry } from "@shared/schema";

interface LeaderboardEntry {
  rank: number;
  username: string;
  handle: string;
  mindshare: number;
}

export async function fetchZamaLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch("https://www.zama.org/programs/creator-program", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    return parseLeaderboardFromHtml(html);
  } catch (error) {
    console.error("Error fetching Zama leaderboard:", error);
    return [];
  }
}

function parseLeaderboardFromHtml(html: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  
  const handlePattern = /\[@([\w_]+)\]\(https:\/\/x\.com\/[\w_]+\)/g;
  const handleMatches = Array.from(html.matchAll(handlePattern));
  
  const mindsharePattern = /(\d+\.\d{4,})/g;
  const mindshareMatches = Array.from(html.matchAll(mindsharePattern));
  
  let rank = 1;
  const seenHandles = new Set<string>();
  
  for (let i = 0; i < handleMatches.length && i < mindshareMatches.length; i++) {
    const handle = `@${handleMatches[i][1]}`;
    const mindshare = parseFloat(mindshareMatches[i][1]);
    
    if (!seenHandles.has(handle) && mindshare > 0 && mindshare < 100) {
      seenHandles.add(handle);
      
      const username = handleMatches[i][1]
        .replace(/_/g, ' ')
        .replace(/(\d+)$/, ' $1')
        .trim();
      
      entries.push({
        rank: rank++,
        username: handleMatches[i][1],
        handle,
        mindshare,
      });
    }
  }
  
  return entries;
}

export async function scrapeAndSaveLeaderboard(season: string = "s5"): Promise<InsertLeaderboardEntry[]> {
  const entries = await fetchZamaLeaderboard();
  
  return entries.map(entry => ({
    ...entry,
    season,
  }));
}
