import * as fs from "fs";
import * as path from "path";
import type { InsertLeaderboardEntry } from "@shared/schema";
import { PDFParse } from "pdf-parse";

interface ParsedLeaderboardData {
  entries: InsertLeaderboardEntry[];
  pdfFile: string;
  pageCount: number;
}

async function parsePdfFile(filePath: string): Promise<ParsedLeaderboardData> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  console.log(`\n=== Parsing: ${path.basename(filePath)} ===`);
  console.log(`Pages: ${data.numpages}`);
  console.log(`Text length: ${data.text.length} characters`);
  
  const entries: InsertLeaderboardEntry[] = [];
  const text = data.text;
  
  console.log("\n--- Raw text sample (first 2000 chars) ---");
  console.log(text.substring(0, 2000));
  console.log("\n--- Full text ---");
  console.log(text);
  
  const lines = text.split('\n').filter((line: string) => line.trim());
  
  console.log("\n--- Lines found ---");
  lines.forEach((line: string, i: number) => {
    console.log(`[${i}] ${line}`);
  });
  
  const rankPattern = /^(\d+)\s+(.+?)\s+@(\w+)\s+([\d.]+)%?$/;
  const altPattern = /(\d+)\s+([^@]+?)\s*@(\w+)\s+([\d.]+)/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    let match = trimmed.match(rankPattern);
    if (!match) {
      match = trimmed.match(altPattern);
    }
    
    if (match) {
      const [, rankStr, username, handle, mindshareStr] = match;
      entries.push({
        season: "s5",
        rank: parseInt(rankStr, 10),
        username: username.trim(),
        handle: `@${handle}`,
        mindshare: parseFloat(mindshareStr),
      });
    }
  }
  
  return {
    entries,
    pdfFile: path.basename(filePath),
    pageCount: data.numpages,
  };
}

async function parseAllPdfs(): Promise<void> {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  
  const pdfFiles = fs.readdirSync(assetsDir)
    .filter(file => file.endsWith(".pdf"))
    .sort((a, b) => {
      const numA = parseInt(a.split("_")[0], 10) || 0;
      const numB = parseInt(b.split("_")[0], 10) || 0;
      return numA - numB;
    });
  
  console.log(`Found ${pdfFiles.length} PDF files:`, pdfFiles);
  
  const allEntries: InsertLeaderboardEntry[] = [];
  
  for (const pdfFile of pdfFiles) {
    const filePath = path.join(assetsDir, pdfFile);
    const result = await parsePdfFile(filePath);
    
    console.log(`\nExtracted ${result.entries.length} entries from ${result.pdfFile}`);
    allEntries.push(...result.entries);
  }
  
  console.log(`\n=== TOTAL: ${allEntries.length} entries extracted ===`);
  
  if (allEntries.length > 0) {
    console.log("\nSample entries:");
    allEntries.slice(0, 10).forEach(entry => {
      console.log(`  #${entry.rank} ${entry.username} (${entry.handle}) - ${entry.mindshare}%`);
    });
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), "parsed-leaderboard.json"),
    JSON.stringify(allEntries, null, 2)
  );
  console.log("\nData saved to parsed-leaderboard.json");
}

parseAllPdfs().catch(console.error);
