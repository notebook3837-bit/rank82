import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { InsertLeaderboardEntry } from "@shared/schema";

interface ExtractedEntry {
  rank: number;
  username: string;
  handle: string;
  points: number;
  tier: string;
  season: string;
}

function extractFromOcrLine(line: string, season: string): ExtractedEntry | null {
  const patterns = [
    /^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/(\w+)\s+\$?([\d,]+)\s*\|?\s*(ZAMA\s*OG\s*NFT)?/i,
    /^(\d+)\s+(.+?)\s+hitps?:\/\/x\.?com\/(\w+)\s+\$?([\d,]+)\s*\|?\s*(ZAMA\s*OG\s*NFT)?/i,
    /^(\d+)\s+(.+?)\s+https?:\/\/x\s*\.?com\/(\w+)\s+[S\$]?([\d,]+)\s*\|?\s*(ZAMA\s*OG\s*NFT)?/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, rankStr, username, handle, pointsStr, tier] = match;
      const rank = parseInt(rankStr, 10);
      const points = parseInt(pointsStr.replace(/,/g, ''), 10);
      
      if (rank > 0 && rank < 1000 && points > 0) {
        return {
          rank,
          username: username.trim().replace(/\s+/g, ' '),
          handle: `@${handle}`,
          points,
          tier: tier ? 'ZAMA OG NFT' : 'Unknown',
          season,
        };
      }
    }
  }
  return null;
}

function detectSeason(text: string): string {
  const seasonMatch = text.match(/Season\s*(\d+)/i);
  if (seasonMatch) {
    return `s${seasonMatch[1]}`;
  }
  return "s1";
}

async function processAllPages(): Promise<ExtractedEntry[]> {
  const pagesDir = path.join(process.cwd(), "pdf_pages");
  const entries: ExtractedEntry[] = [];
  const seenRanks: Map<string, Set<number>> = new Map();

  const files = fs.readdirSync(pagesDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const [pdfA, pageA] = a.replace('.png', '').split('-');
      const [pdfB, pageB] = b.replace('.png', '').split('-');
      if (pdfA !== pdfB) return pdfA.localeCompare(pdfB);
      return parseInt(pageA) - parseInt(pageB);
    });

  console.log(`Processing ${files.length} pages...`);

  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    
    try {
      const ocrText = execSync(`tesseract "${filePath}" stdout --psm 6 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      
      const season = detectSeason(ocrText);
      
      if (!seenRanks.has(season)) {
        seenRanks.set(season, new Set());
      }
      const seasonRanks = seenRanks.get(season)!;

      const lines = ocrText.split('\n');
      
      for (const line of lines) {
        const entry = extractFromOcrLine(line.trim(), season);
        if (entry && !seasonRanks.has(entry.rank)) {
          entries.push(entry);
          seasonRanks.add(entry.rank);
          console.log(`  [${season}] #${entry.rank} ${entry.username} (${entry.handle}) - $${entry.points}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  return entries;
}

async function main() {
  console.log("Starting leaderboard extraction from PDF pages...\n");
  
  const entries = await processAllPages();
  
  entries.sort((a, b) => {
    if (a.season !== b.season) return a.season.localeCompare(b.season);
    return a.rank - b.rank;
  });
  
  console.log(`\n=== EXTRACTION COMPLETE ===`);
  console.log(`Total entries: ${entries.length}`);
  
  const bySeasonCount: Record<string, number> = {};
  for (const entry of entries) {
    bySeasonCount[entry.season] = (bySeasonCount[entry.season] || 0) + 1;
  }
  console.log("Entries by season:", bySeasonCount);

  const leaderboardEntries: InsertLeaderboardEntry[] = entries.map(e => ({
    season: e.season,
    rank: e.rank,
    username: e.username,
    handle: e.handle,
    mindshare: e.points,
  }));

  fs.writeFileSync(
    path.join(process.cwd(), "extracted-leaderboard.json"),
    JSON.stringify(leaderboardEntries, null, 2)
  );
  console.log("\nData saved to extracted-leaderboard.json");

  console.log("\nSample entries:");
  entries.slice(0, 20).forEach(e => {
    console.log(`  [${e.season}] #${e.rank} ${e.username} (${e.handle}) - $${e.points}`);
  });
}

main().catch(console.error);
