import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { db } from "./db";
import { leaderboardEntries } from "@shared/schema";
import type { InsertLeaderboardEntry } from "@shared/schema";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

interface ParsedEntry {
  rank: number;
  username: string;
  handle: string;
  prize: number;
  season: string;
}

function sanitizeText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .trim();
}

async function extractPdfText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return result.text;
}

function parseSeasonData(text: string, season: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const patterns = [
      /^(\d+)\s+https?:\/\/x\.com\/([^\s]+)\s+\$([\d,]+)\s+ZAMA OG NFT(.*)$/i,
      /^(\d+)\s+https?:\/\/x\.com\/([^\s]+)\s+–\s+ZAMA OG NFT(.*)$/i,
      /^(\d+)\s+https?:\/\/x\.com\/([^\s]+)\s+-\s+ZAMA OG NFT(.*)$/i,
      /^(\d+)\s+https?:\/\/x\.com\/([^\s]+)\s+ZAMA OG NFT(.*)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const rank = parseInt(match[1], 10);
        let handle = match[2].replace(/[,\.\)\|]+$/, '').trim();
        let prize = 0;
        let username = "";
        
        if (match[3] && /^\d/.test(match[3].replace(/,/g, ''))) {
          prize = parseInt(match[3].replace(/,/g, ''), 10);
          username = match[4] ? match[4].trim() : "";
        } else {
          username = match[3] ? match[3].trim() : "";
        }
        
        if (rank > 0 && rank <= 1500 && handle && handle.length > 0) {
          const existingIdx = entries.findIndex(e => e.rank === rank);
          if (existingIdx === -1) {
            const sanitizedUsername = sanitizeText(username || handle);
            const sanitizedHandle = sanitizeText(handle);
            entries.push({
              rank,
              username: sanitizedUsername,
              handle: `@${sanitizedHandle}`,
              prize,
              season,
            });
          }
        }
        break;
      }
    }
  }
  
  return entries.sort((a, b) => a.rank - b.rank);
}

async function main() {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  
  const pdfFiles = [
    { file: "Zama_Creator_Program__Season_1_-_Airtable_1764875157802.pdf", season: "s1", expectedCount: 249 },
    { file: "Zama_Creator_Program__Season_2_-_Airtable_1764875157802.pdf", season: "s2", expectedCount: 500 },
    { file: "Zama_Creator_Program__Season_3_-_Airtable_1764875157802.pdf", season: "s3", expectedCount: 834 },
    { file: "Zama_Creator_Program__Season_4_-_Airtable_1764875157801.pdf", season: "s4", expectedCount: 1167 },
  ];
  
  const allEntries: ParsedEntry[] = [];
  
  for (const { file, season, expectedCount } of pdfFiles) {
    const filePath = path.join(assetsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    
    console.log(`\nProcessing ${season.toUpperCase()} from ${file}...`);
    
    try {
      const text = await extractPdfText(filePath);
      console.log(`  Extracted ${text.length} characters`);
      
      const entries = parseSeasonData(text, season);
      console.log(`  Parsed ${entries.length} entries (expected ${expectedCount})`);
      
      if (entries.length > 0) {
        console.log(`  First 5 entries:`);
        entries.slice(0, 5).forEach(e => {
          console.log(`    #${e.rank} ${e.username} (${e.handle}) - $${e.prize}`);
        });
        
        const withPrize = entries.filter(e => e.prize > 0).length;
        console.log(`  Entries with prize: ${withPrize}`);
      }
      
      allEntries.push(...entries);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
  
  console.log(`\n=== TOTAL: ${allEntries.length} entries ===`);
  
  const bySeasonCount: Record<string, number> = {};
  for (const entry of allEntries) {
    bySeasonCount[entry.season] = (bySeasonCount[entry.season] || 0) + 1;
  }
  console.log("Entries by season:", bySeasonCount);
  
  if (allEntries.length > 0) {
    const dbEntries: InsertLeaderboardEntry[] = allEntries.map(e => ({
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
    
    const outputPath = path.join(process.cwd(), "leaderboard-data-new.json");
    fs.writeFileSync(outputPath, JSON.stringify(allEntries, null, 2));
    console.log(`Data also saved to ${outputPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
