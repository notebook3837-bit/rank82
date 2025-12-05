import fetch from "node-fetch";

export interface ApiEntry {
  rank: number;
  username: string;
  twitterId: string;
  displayName: string;
  mindshare: number;
  mindshareDelta: number;
  snaps: number;
  snapsDelta: number;
}

export interface ApiResponse {
  success: boolean;
  data: ApiEntry[];
}

export const API_BASE = "https://leaderboard-bice-mu.vercel.app/api/zama";

export function extractTwitterHandle(input: string): string {
  if (!input) return '';
  
  let handle = input.trim();
  handle = handle.replace(/^https?:\/\//i, '');
  handle = handle.replace(/^(www\.)?(x\.com|twitter\.com)\//i, '');
  handle = handle.replace(/\?.*$/, '');
  handle = handle.replace(/\/$/, '');
  handle = handle.replace(/^@/, '');
  
  return handle.toLowerCase();
}

export async function fetchLiveLeaderboard(timeframe: string, maxPages: number = 15): Promise<ApiEntry[]> {
  const allEntries: ApiEntry[] = [];
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${API_BASE}?timeframe=${timeframe}&sortBy=mindshare&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) break;
      
      const json = await response.json() as ApiResponse;
      
      if (!json.success || !json.data || json.data.length === 0) break;
      
      allEntries.push(...json.data);
      
      if (json.data.length < 100) break;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return allEntries;
}

export async function searchUserInLeaderboard(username: string, timeframe: string): Promise<ApiEntry | null> {
  const searchTerm = username.toLowerCase().replace('@', '');
  let page = 1;
  const maxPages = 50;
  
  while (page <= maxPages) {
    try {
      const url = `${API_BASE}?timeframe=${timeframe}&sortBy=mindshare&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) break;
      
      const json = await response.json() as ApiResponse;
      
      if (!json.success || !json.data || json.data.length === 0) break;
      
      const found = json.data.find(entry => 
        entry.username.toLowerCase() === searchTerm ||
        entry.displayName.toLowerCase().includes(searchTerm)
      );
      
      if (found) return found;
      
      if (json.data.length < 100) break;
      page++;
    } catch (error) {
      console.error(`Error searching page ${page}:`, error);
      break;
    }
  }
  
  return null;
}
