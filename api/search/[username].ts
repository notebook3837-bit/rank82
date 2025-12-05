import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { leaderboardEntries } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { extractTwitterHandle, searchUserInLeaderboard } from '../_lib/utils';

interface UserRankResult {
  season: string;
  rank: number | null;
  username: string | null;
  handle: string | null;
  found: boolean;
}

interface S5RankResult {
  rank24h: number | null;
  rank7d: number | null;
  rank30d: number | null;
  mindshare24h: number | null;
  mindshare7d: number | null;
  mindshare30d: number | null;
  found: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    const usernameStr = Array.isArray(username) ? username[0] : username;
    const searchTerm = (usernameStr || '').replace('@', '').toLowerCase();
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({ error: "Username must be at least 2 characters" });
    }
    
    const results: UserRankResult[] = [];
    
    for (const season of ["s1", "s2", "s3", "s4"]) {
      const dbResults = await db
        .select()
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.season, season));
      
      const found = dbResults.find(entry => {
        const extractedHandle = extractTwitterHandle(entry.handle);
        const displayName = entry.username.toLowerCase();
        return extractedHandle.includes(searchTerm) ||
          searchTerm.includes(extractedHandle) ||
          displayName.includes(searchTerm);
      });
      
      results.push({
        season,
        rank: found?.rank || null,
        username: found?.username || null,
        handle: found?.handle || null,
        found: !!found,
      });
    }
    
    const [user24h, user7d, user30d] = await Promise.all([
      searchUserInLeaderboard(searchTerm, "24h"),
      searchUserInLeaderboard(searchTerm, "7d"),
      searchUserInLeaderboard(searchTerm, "30d"),
    ]);
    
    const s5Result: S5RankResult = {
      rank24h: user24h?.rank || null,
      rank7d: user7d?.rank || null,
      rank30d: user30d?.rank || null,
      mindshare24h: user24h?.mindshare || null,
      mindshare7d: user7d?.mindshare || null,
      mindshare30d: user30d?.mindshare || null,
      found: !!(user24h || user7d || user30d),
    };
    
    const foundResult = results.find(r => r.found);
    const s5User = user30d || user7d || user24h;
    
    let twitterHandle = searchTerm;
    let displayName = searchTerm;
    let handleDisplay = `@${searchTerm}`;
    
    if (s5User) {
      twitterHandle = s5User.username;
      displayName = s5User.displayName || s5User.username;
      handleDisplay = `@${s5User.username}`;
    } else if (foundResult?.handle) {
      twitterHandle = extractTwitterHandle(foundResult.handle) || searchTerm;
      displayName = foundResult.username || twitterHandle;
      handleDisplay = `@${twitterHandle}`;
    }
    
    return res.json({
      searchedUsername: twitterHandle,
      displayName,
      handle: handleDisplay,
      profilePic: `https://unavatar.io/twitter/${twitterHandle}`,
      results,
      s5: s5Result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error searching user:", error);
    return res.status(500).json({ error: "Failed to search for user" });
  }
}
