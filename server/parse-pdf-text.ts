import * as fs from "fs";
import * as path from "path";
import { db } from "./db";
import { leaderboardEntries } from "@shared/schema";
import type { InsertLeaderboardEntry } from "@shared/schema";
import { PDFParse } from "pdf-parse";

interface ParsedEntry {
  rank: number;
  username: string;
  handle: string;
  prize: number;
  season: string;
}

function extractHandle(url: string): string {
  const match = url.match(/x\.com\/([^\s\)]+)/);
  return match ? `@${match[1]}` : "";
}

function sanitizeText(text: string): string {
  return text
    .replace(/\x00/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function parsePdfText(text: string, season: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  
  const pattern = /(\d+)\s+https:\/\/x\.com\/([^\s]+)\s+(\$[\d,]+|–)\s+ZAMA OG NFT([^\d]+?)(?=\d+\s+https|$)/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, rankStr, handle, , username] = match;
    const rank = parseInt(rankStr, 10);
    
    if (rank > 0 && handle) {
      entries.push({
        rank,
        username: sanitizeText(username),
        handle: `@${sanitizeText(handle)}`,
        prize: 0,
        season
      });
    }
  }
  
  return entries;
}

async function extractPdfText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return result.text;
}

async function parseAndSaveLeaderboard(): Promise<void> {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  
  const pdfFiles = [
    { file: "Zama_Creator_Program__Season_1_-_Airtable_1764873138374.pdf", season: "s1" },
    { file: "Zama_Creator_Program__Season_2_-_Airtable_1764873229276.pdf", season: "s2" },
    { file: "Zama_Creator_Program__Season_3_-_Airtable_1764873229275.pdf", season: "s3" },
    { file: "Zama_Creator_Program__Season_4_-_Airtable_1764873229275.pdf", season: "s4" },
  ];
  
  const allEntries: InsertLeaderboardEntry[] = [];
  
  for (const { file, season } of pdfFiles) {
    const filePath = path.join(assetsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    
    console.log(`\nExtracting text from ${season.toUpperCase()} PDF...`);
    
    try {
      const text = await extractPdfText(filePath);
      console.log(`Text extracted: ${text.length} characters`);
      console.log("Sample text:", text.substring(0, 500));
      
      const entries = parsePdfText(text, season);
      console.log(`Parsed ${entries.length} entries from ${season.toUpperCase()}`);
      
      entries.slice(0, 5).forEach(e => {
        console.log(`  #${e.rank} ${e.username} (${e.handle}) - $${e.prize}`);
      });
      
      for (const e of entries) {
        allEntries.push({
          season: e.season,
          rank: e.rank,
          username: e.username,
          handle: e.handle,
          mindshare: e.prize,
        });
      }
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
    console.log(`\nClearing existing entries and saving ${allEntries.length} entries to database...`);
    
    await db.delete(leaderboardEntries);
    
    const batchSize = 100;
    for (let i = 0; i < allEntries.length; i += batchSize) {
      const batch = allEntries.slice(i, i + batchSize);
      await db.insert(leaderboardEntries).values(batch);
      console.log(`  Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allEntries.length / batchSize)}`);
    }
    
    console.log("\nDone! All leaderboard entries saved to database.");
    
    const outputPath = path.join(process.cwd(), "leaderboard-data.json");
    fs.writeFileSync(outputPath, JSON.stringify(allEntries, null, 2));
    console.log(`Data also saved to ${outputPath}`);
  } else {
    console.log("\nNo entries were parsed. Please check the PDF format.");
  }
}

parseAndSaveLeaderboard()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
