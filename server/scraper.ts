import fetch from "node-fetch";
import * as cheerio from "cheerio";
import type { InsertLeaderboardEntry } from "@shared/schema";

interface ScrapedEntry {
  rank: number;
  username: string;
  handle: string;
  mindshare: number;
}

export async function scrapeZamaLeaderboard(season: string = "s5"): Promise<InsertLeaderboardEntry[]> {
  try {
    const response = await fetch("https://www.zama.org/programs/creator-program");
    const html = await response.text();
    const $ = cheerio.load(html);

    const entries: InsertLeaderboardEntry[] = [];
    
    // The Zama website uses a table structure for leaderboard
    // We need to parse the HTML to extract rank, username, handle, and mindshare
    // This is a simplified parser - adjust selectors based on actual HTML structure
    
    $('tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');
      
      if (cells.length >= 3) {
        const rankText = $(cells[0]).text().trim();
        const rank = parseInt(rankText.replace(/[^\d]/g, ''));
        
        if (!isNaN(rank)) {
          const usernameCell = $(cells[1]);
          const username = usernameCell.find('span').first().text().trim() || 
                          usernameCell.text().split('@')[0].trim();
          
          const handleMatch = usernameCell.text().match(/@[\w_]+/);
          const handle = handleMatch ? handleMatch[0] : `@user${rank}`;
          
          const mindshareText = $(cells[2]).text().trim();
          const mindshare = parseFloat(mindshareText) || 0;
          
          if (username && mindshare > 0) {
            entries.push({
              season,
              rank,
              username,
              handle,
              mindshare,
            });
          }
        }
      }
    });

    // Fallback to parsing from text content if table parsing fails
    if (entries.length === 0) {
      console.log("Table parsing failed, trying text parsing...");
      const textEntries = parseLeaderboardFromText(html, season);
      return textEntries;
    }

    console.log(`Scraped ${entries.length} entries for ${season}`);
    return entries;
  } catch (error) {
    console.error("Error scraping Zama leaderboard:", error);
    return [];
  }
}

function parseLeaderboardFromText(html: string, season: string): InsertLeaderboardEntry[] {
  const entries: InsertLeaderboardEntry[] = [];
  
  // Pattern: rank emoji/number, username, @handle, mindshare number
  const patterns = [
    /(?:🥇|🥈|🥉|(\d+))\s+([A-Z]{2})\s+([\w\s]+?)\s+(@[\w_]+)\s+([\d.]+)/g,
    /(\d+)\s+([\w\s]+?)\s+(@[\w_]+)\s+([\d.]+)/g
  ];

  for (const pattern of patterns) {
    const matchesArray = Array.from(html.matchAll(pattern));
    for (const match of matchesArray) {
      let rank: number;
      let username: string;
      let handle: string;
      let mindshare: number;

      if (match[1] && match[2] && match[3] && match[4] && match[5]) {
        // First pattern with emoji
        rank = parseInt(match[1]) || (match[0].includes('🥇') ? 1 : match[0].includes('🥈') ? 2 : 3);
        username = match[3].trim();
        handle = match[4];
        mindshare = parseFloat(match[5]);
      } else if (match[1] && match[2] && match[3] && match[4]) {
        // Second pattern
        rank = parseInt(match[1]);
        username = match[2].trim();
        handle = match[3];
        mindshare = parseFloat(match[4]);
      } else {
        continue;
      }

      if (!isNaN(rank) && username && handle && !isNaN(mindshare) && mindshare > 0) {
        entries.push({
          season,
          rank,
          username,
          handle,
          mindshare,
        });
      }
    }

    if (entries.length > 0) break;
  }

  return entries;
}
