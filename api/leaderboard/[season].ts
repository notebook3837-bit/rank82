import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_lib/db';
import { leaderboardEntries } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { fetchLiveLeaderboard } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { season } = req.query;
    const seasonStr = Array.isArray(season) ? season[0] : season;

    if (!seasonStr) {
      return res.status(400).json({ error: 'Season parameter is required' });
    }

    if (["s1", "s2", "s3", "s4"].includes(seasonStr)) {
      const dbData = await db
        .select()
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.season, seasonStr))
        .orderBy(leaderboardEntries.rank);
      
      const data = dbData.map(entry => {
        const twitterHandle = entry.handle.replace('@', '');
        return {
          id: entry.id,
          season: entry.season,
          rank: entry.rank,
          username: entry.username,
          handle: entry.handle,
          avatarUrl: `https://unavatar.io/twitter/${twitterHandle}`,
        };
      });
      
      return res.json({
        season: seasonStr,
        count: data.length,
        lastUpdated: dbData[0]?.scrapedAt?.toISOString() || null,
        data,
      });
    } else if (seasonStr === "s5") {
      const { range } = req.query;
      let timeframe = "30d";
      if (range === "24h") timeframe = "24h";
      else if (range === "7d") timeframe = "7d";
      else if (range === "30d") timeframe = "30d";
      
      const liveData = await fetchLiveLeaderboard(timeframe);
      
      const data = liveData.map(entry => ({
        id: 0,
        season: seasonStr,
        rank: entry.rank,
        username: entry.displayName || entry.username,
        handle: `@${entry.username}`,
        avatarUrl: `https://unavatar.io/twitter/${entry.username}`,
      }));
      
      return res.json({
        season: seasonStr,
        count: data.length,
        lastUpdated: new Date().toISOString(),
        data,
      });
    } else {
      return res.json({
        season: seasonStr,
        count: 0,
        lastUpdated: null,
        message: `Season ${seasonStr} not found.`,
        data: [],
      });
    }
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
}
