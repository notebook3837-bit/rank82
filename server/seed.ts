import { storage } from "./storage";
import type { InsertLeaderboardEntry } from "@shared/schema";

// Seeded data from Zama website (Season 5, as of scrape time)
const SEASON_5_DATA: Omit<InsertLeaderboardEntry, 'season'>[] = [
  { rank: 1, username: "randhindi", handle: "@randhindi", mindshare: 1.5902789 },
  { rank: 2, username: "Zun2025", handle: "@Zun2025", mindshare: 1.1502398 },
  { rank: 3, username: "Paul___Shark", handle: "@Paul___Shark", mindshare: 0.89951676 },
  { rank: 4, username: "ig28eth", handle: "@ig28eth", mindshare: 0.8624195 },
  { rank: 5, username: "0x Professor7", handle: "@0xProfessor7", mindshare: 0.68552864 },
  { rank: 6, username: "0xbunny_", handle: "@0xbunny_", mindshare: 0.681903 },
  { rank: 7, username: "0x Mamareza", handle: "@0xMamareza", mindshare: 0.64788234 },
  { rank: 8, username: "cutemoon66", handle: "@cutemoon66", mindshare: 0.5540372 },
  { rank: 9, username: "tamonex2000", handle: "@tamonex2000", mindshare: 0.5255955 },
  { rank: 10, username: "barudkhanweb3", handle: "@barudkhanweb3", mindshare: 0.5145741 },
  { rank: 11, username: "Maezii1", handle: "@Maezii1", mindshare: 0.5011035 },
  { rank: 12, username: "mhrddmrd", handle: "@mhrddmrd", mindshare: 0.47867042 },
  { rank: 13, username: "Trungnguyen9888", handle: "@Trungnguyen9888", mindshare: 0.46160418 },
  { rank: 14, username: "humanbotcrypto", handle: "@humanbotcrypto", mindshare: 0.45592865 },
  { rank: 15, username: "lohith0001", handle: "@lohith0001", mindshare: 0.45484963 },
  { rank: 16, username: "0x Stephen_", handle: "@0xStephen_", mindshare: 0.45221996 },
  { rank: 17, username: "Thanh Craffey", handle: "@ThanhCraffey", mindshare: 0.43292844 },
  { rank: 18, username: "cloudtechvn", handle: "@cloudtechvn", mindshare: 0.4068031 },
  { rank: 19, username: "Abid__Ahasan", handle: "@Abid__Ahasan", mindshare: 0.40463296 },
  { rank: 20, username: "Edward74470934", handle: "@Edward74470934", mindshare: 0.40243816 },
  { rank: 21, username: "zenerbabax", handle: "@zenerbabax", mindshare: 0.39106828 },
  { rank: 22, username: "mertozbk034", handle: "@mertozbk034", mindshare: 0.3903814 },
  { rank: 23, username: "realchriswilder", handle: "@realchriswilder", mindshare: 0.382935 },
  { rank: 24, username: "dabit3", handle: "@dabit3", mindshare: 0.37584424 },
  { rank: 25, username: "Phi Duongng1691", handle: "@PhiDuongng1691", mindshare: 0.37502643 },
  { rank: 26, username: "melanthaia", handle: "@melanthaia", mindshare: 0.37383732 },
  { rank: 27, username: "Prity Afroz18740", handle: "@PrityAfroz18740", mindshare: 0.37374243 },
  { rank: 28, username: "1Cilineth", handle: "@1Cilineth", mindshare: 0.37088785 },
  { rank: 29, username: "wangni88", handle: "@wangni88", mindshare: 0.36749125 },
  { rank: 30, username: "tepewantsyou", handle: "@tepewantsyou", mindshare: 0.36634 },
  { rank: 31, username: "Alfathuss", handle: "@Alfathuss", mindshare: 0.36085302 },
  { rank: 32, username: "elektrik3468", handle: "@elektrik3468", mindshare: 0.36040303 },
  { rank: 33, username: "bandanaranas", handle: "@bandanaranas", mindshare: 0.35742167 },
  { rank: 34, username: "Jun666Xx", handle: "@Jun666Xx", mindshare: 0.34393993 },
  { rank: 35, username: "0x Amne", handle: "@0xAmne", mindshare: 0.3436147 },
  { rank: 36, username: "yi_juanmao", handle: "@yi_juanmao", mindshare: 0.34188166 },
  { rank: 37, username: "E Erinmez82864", handle: "@EErinmez82864", mindshare: 0.3140669 },
  { rank: 38, username: "Digi Tektrades", handle: "@DigiTektrades", mindshare: 0.31317046 },
  { rank: 39, username: "0xsapien_", handle: "@0xsapien_", mindshare: 0.30982104 },
  { rank: 40, username: "Blum_OG", handle: "@Blum_OG", mindshare: 0.29782978 },
  { rank: 41, username: "Rivuus", handle: "@Rivuus", mindshare: 0.29400986 },
  { rank: 42, username: "0xgokdeniz", handle: "@0xgokdeniz", mindshare: 0.29352307 },
  { rank: 43, username: "crypto_yagiz", handle: "@crypto_yagiz", mindshare: 0.29281503 },
  { rank: 44, username: "baybaginsss", handle: "@baybaginsss", mindshare: 0.2842165 },
  { rank: 45, username: "mrahsok", handle: "@mrahsok", mindshare: 0.28398785 },
  { rank: 46, username: "Ortegas Crypto", handle: "@OrtegasCrypto", mindshare: 0.28385922 },
  { rank: 47, username: "0x Rohitz", handle: "@0xRohitz", mindshare: 0.2810023 },
  { rank: 48, username: "carrotxbt", handle: "@carrotxbt", mindshare: 0.28052267 },
  { rank: 49, username: "0x Advocatus", handle: "@0xAdvocatus", mindshare: 0.2775329 },
  { rank: 50, username: "yayamoku", handle: "@yayamoku", mindshare: 0.27447915 },
];

export async function seedDatabase() {
  console.log("Seeding database with initial leaderboard data...");
  
  try {
    // Seed Season 5 data (expand to other seasons later)
    const s5Entries: InsertLeaderboardEntry[] = SEASON_5_DATA.map(entry => ({
      ...entry,
      season: 's5'
    }));
    
    await storage.saveLeaderboardEntries(s5Entries);
    console.log(`Seeded ${s5Entries.length} entries for Season 5`);
    
    // Generate some mock data for older seasons
    const olderSeasons = ['s4', 's3', 's2', 's1'];
    for (const season of olderSeasons) {
      const mockEntries: InsertLeaderboardEntry[] = SEASON_5_DATA.map((entry, idx) => ({
        ...entry,
        season,
        mindshare: entry.mindshare * (0.7 + Math.random() * 0.3), // Randomize slightly
        rank: idx + 1
      }));
      
      await storage.saveLeaderboardEntries(mockEntries);
      console.log(`Seeded ${mockEntries.length} entries for ${season}`);
    }
    
    console.log("Database seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
