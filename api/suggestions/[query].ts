import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { leaderboardEntries } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { extractTwitterHandle, fetchLiveLeaderboard } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.query;
    const queryStr = Array.isArray(query) ? query[0] : query;
    const searchTerm = (queryStr || '').replace('@', '').toLowerCase().trim();
    
    if (!searchTerm || searchTerm.length < 1) {
      return res.json({ suggestions: [] });
    }
    
    const allSuggestions: { username: string; handle: string; rank: number; season: string }[] = [];
    
    for (const season of ["s4", "s3", "s2", "s1"]) {
      const dbResults = await db
        .select()
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.season, season));
      
      const matches = dbResults
        .filter(entry => {
          const extractedHandle = extractTwitterHandle(entry.handle);
          const displayName = entry.username.toLowerCase();
          return (extractedHandle.includes(searchTerm) || displayName.includes(searchTerm)) && entry.rank <= 1500;
        })
        .map(entry => ({
          username: entry.username,
          handle: extractTwitterHandle(entry.handle),
          rank: entry.rank,
          season,
        }));
      
      allSuggestions.push(...matches);
    }
    
    try {
      const liveData = await fetchLiveLeaderboard("30d", 15);
      const s5Matches = liveData
        .filter(entry => {
          const handle = entry.username.toLowerCase();
          const displayName = (entry.displayName || '').toLowerCase();
          return (handle.includes(searchTerm) || displayName.includes(searchTerm)) && entry.rank <= 1500;
        })
        .map(entry => ({
          username: entry.displayName || entry.username,
          handle: entry.username,
          rank: entry.rank,
          season: "s5",
        }));
      allSuggestions.push(...s5Matches);
    } catch (e) {
      console.error("Error fetching S5 suggestions:", e);
    }
    
    const uniqueByHandle = new Map<string, typeof allSuggestions[0]>();
    for (const suggestion of allSuggestions) {
      const existing = uniqueByHandle.get(suggestion.handle);
      if (!existing || suggestion.rank < existing.rank) {
        uniqueByHandle.set(suggestion.handle, suggestion);
      }
    }
    
    const suggestions = Array.from(uniqueByHandle.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 4);
    
    return res.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return res.json({ suggestions: [] });
  }
}
