import * as fs from "fs";
import * as path from "path";
import { db } from "./db";
import { leaderboardEntries } from "@shared/schema";
import type { InsertLeaderboardEntry } from "@shared/schema";

interface ParsedEntry {
  rank: number;
  username: string;
  handle: string;
  prize: number;
  season: string;
}

function extractHandle(text: string): string | null {
  const match = text.match(/https?:\/\/x\.com\/([^\s\)]+)/i);
  if (match) {
    let handle = match[1].replace(/[,\.\)]+$/, '');
    return `@${handle}`;
  }
  return null;
}

function extractPrize(text: string): number {
  const match = text.match(/\$[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/[$,]/g, ''), 10);
  }
  return 0;
}

function parseOcrText(ocrText: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const lines = ocrText.split('\n');
  
  let currentSeason = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes("Season 1")) {
      currentSeason = "s1";
    } else if (line.includes("Season 2")) {
      currentSeason = "s2";
    } else if (line.includes("Season 3")) {
      currentSeason = "s3";
    } else if (line.includes("Season 4")) {
      currentSeason = "s4";
    }
    
    if (!currentSeason) continue;
    
    const rankMatch = line.match(/^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/([^\s]+)\s+(\$[\d,]+|-)/i);
    if (rankMatch) {
      const [, rankStr, username, handle, prizeStr] = rankMatch;
      const rank = parseInt(rankStr, 10);
      const prize = prizeStr === '-' ? 0 : parseInt(prizeStr.replace(/[$,]/g, ''), 10);
      
      if (rank > 0 && handle) {
        entries.push({
          rank,
          username: username.trim(),
          handle: `@${handle.replace(/[,\.\)]+$/, '')}`,
          prize,
          season: currentSeason,
        });
      }
      continue;
    }
    
    const simpleMatch = line.match(/^(\d+)\s+(.+?)\s+(https?:\/\/[^\s]+)/i);
    if (simpleMatch) {
      const [, rankStr, username, url] = simpleMatch;
      const rank = parseInt(rankStr, 10);
      const handleMatch = url.match(/x\.com\/([^\s\)]+)/i);
      
      if (rank > 0 && handleMatch) {
        const handle = handleMatch[1].replace(/[,\.\)]+$/, '');
        const prizeMatch = line.match(/\$[\d,]+/);
        const prize = prizeMatch ? parseInt(prizeMatch[0].replace(/[$,]/g, ''), 10) : 0;
        
        entries.push({
          rank,
          username: username.trim(),
          handle: `@${handle}`,
          prize,
          season: currentSeason,
        });
      }
    }
  }
  
  return entries;
}

function parseDetailedOcr(ocrText: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const seasonBlocks = ocrText.split(/===\s*\d+_\d+-\d+\.png\s*===/);
  
  let currentSeason = "";
  
  for (const block of seasonBlocks) {
    if (block.includes("Season 1 - Airtable") || block.includes("Season 1")) {
      currentSeason = "s1";
    } else if (block.includes("Season 2 - Airtable") || block.includes("Season 2")) {
      currentSeason = "s2";
    } else if (block.includes("Season 3 - Airtable") || block.includes("Season 3")) {
      currentSeason = "s3";
    } else if (block.includes("Season 4 - Airtable") || block.includes("Season 4")) {
      currentSeason = "s4";
    }
    
    if (!currentSeason) continue;
    
    const lines = block.split('\n');
    
    for (const line of lines) {
      if (line.includes('airtable.com') || line.includes('RANK') || line.includes('CREATOR') || 
          line.includes('LEADERBOARD') || line.includes('CREATORS AWARDED') || line.includes('PM Zama')) {
        continue;
      }
      
      const patterns = [
        /^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/([^\s]+)\s+\$?([\d,]+)\s*\|/i,
        /^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/([^\s]+)\s+\$?([\d,]+)/i,
        /^(\d+)\s+(.+?)\s+hitps?:\/\/x\.com\/([^\s]+)\s+\$?([\d,]+)/i,
        /^(\d+)\s+(.+?)\s+hitps?:\/\/x\s*\.?\s*com\/([^\s]+)\s+\$?([\d,]+)/i,
        /^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/([^\s]+)\s+-\s*\|/i,
        /^(\d+)\s+(.+?)\s+hitps?:\/\/x\.com\/([^\s]+)\s+-\s*\|/i,
        /^(\d+)\s+(.+?)\s+https?:\/\/x\.com\/([^\s]+)\s+-\s*/i,
        /^(\d+)\s+(.+?)\s+hitps?:\/\/x\.com\/([^\s]+)\s+-/i,
        /^(\d+)\s+(.+?)\s+https?:\/\/x\.?comy?\/([^\s]+)/i,
        /^(\d+)\s+(.+?)\s+hitps?:\/\/x\.?comy?\/([^\s]+)/i,
        /^(\d+)\s+(.+?)\s+httes?:\/\/x\.?com\/([^\s]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const rank = parseInt(match[1], 10);
          let username = match[2].trim();
          let handle = match[3].replace(/[,\.\)\|]+$/, '').trim();
          let prize = 0;
          
          if (match[4]) {
            prize = parseInt(match[4].replace(/,/g, ''), 10);
          } else {
            const prizeMatch = line.match(/\$([\d,]+)/);
            if (prizeMatch) {
              prize = parseInt(prizeMatch[1].replace(/,/g, ''), 10);
            }
          }
          
          if (rank > 0 && handle && !handle.includes('airtable')) {
            const existingIdx = entries.findIndex(e => e.season === currentSeason && e.rank === rank);
            if (existingIdx === -1) {
              entries.push({
                rank,
                username,
                handle: `@${handle}`,
                prize,
                season: currentSeason,
              });
            }
          }
          break;
        }
      }
    }
  }
  
  return entries;
}

async function fixLeaderboardData(): Promise<void> {
  const ocrPath = path.join(process.cwd(), "ocr_all.txt");
  
  if (!fs.existsSync(ocrPath)) {
    console.error("OCR file not found:", ocrPath);
    return;
  }
  
  console.log("Reading OCR data...");
  const ocrText = fs.readFileSync(ocrPath, 'utf-8');
  
  console.log("Parsing OCR data...");
  const entries = parseDetailedOcr(ocrText);
  
  console.log(`Parsed ${entries.length} entries total`);
  
  const bySeasonCount: Record<string, number> = {};
  const bySeasonWithPrize: Record<string, number> = {};
  
  for (const entry of entries) {
    bySeasonCount[entry.season] = (bySeasonCount[entry.season] || 0) + 1;
    if (entry.prize > 0) {
      bySeasonWithPrize[entry.season] = (bySeasonWithPrize[entry.season] || 0) + 1;
    }
  }
  
  console.log("\nEntries by season:", bySeasonCount);
  console.log("Entries with prizes:", bySeasonWithPrize);
  
  console.log("\nSample entries:");
  for (const season of ['s1', 's2', 's3', 's4']) {
    const seasonEntries = entries.filter(e => e.season === season);
    console.log(`\n${season.toUpperCase()}:`);
    seasonEntries.slice(0, 5).forEach(e => {
      console.log(`  #${e.rank} ${e.username} (${e.handle}) - $${e.prize}`);
    });
  }
  
  if (entries.length === 0) {
    console.log("\nNo entries parsed. Exiting.");
    return;
  }
  
  const dbEntries: InsertLeaderboardEntry[] = entries.map(e => ({
    season: e.season,
    rank: e.rank,
    username: e.username,
    handle: e.handle,
    mindshare: e.prize,
  }));
  
  console.log(`\nClearing existing entries and saving ${dbEntries.length} entries to database...`);
  
  await db.delete(leaderboardEntries);
  
  const batchSize = 100;
  for (let i = 0; i < dbEntries.length; i += batchSize) {
    const batch = dbEntries.slice(i, i + batchSize);
    await db.insert(leaderboardEntries).values(batch);
    console.log(`  Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dbEntries.length / batchSize)}`);
  }
  
  console.log("\nDone! All leaderboard entries saved to database.");
  
  const outputPath = path.join(process.cwd(), "leaderboard-data-fixed.json");
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`Data also saved to ${outputPath}`);
}

fixLeaderboardData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
