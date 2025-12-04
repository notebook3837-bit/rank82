import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { TimeSelector } from "@/components/time-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Flame, Trophy, Users, RefreshCw, Clock, ExternalLink, Loader2, TrendingUp, TrendingDown, Award, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardResponse {
  season: string;
  range: string;
  count: number;
  lastUpdated: string | null;
  message?: string;
  data: {
    id: number;
    season: string;
    rank: number;
    username: string;
    handle: string;
    mindshare: number;
    mindshareDelta?: number;
    scrapedAt: string;
  }[];
}

interface UserRankResult {
  season: string;
  timeframe: string;
  rank: number | null;
  mindshare: number | null;
  username: string | null;
  handle: string | null;
  found: boolean;
}

interface SearchResponse {
  searchedUsername: string;
  displayName: string;
  handle: string;
  results: UserRankResult[];
  timestamp: string;
}

export default function Leaderboard() {
  const [tier, setTier] = useState("s5");
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const { toast } = useToast();
  
  const searchMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/search/${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to search for user');
      }
      return response.json() as Promise<SearchResponse>;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      toast({
        title: "Search Complete",
        description: `Found ranks for ${data.handle}`,
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Search Failed",
        description: "Could not find user data. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleSearch = () => {
    if (search.trim().length >= 2) {
      searchMutation.mutate(search.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim().length >= 2) {
      handleSearch();
    }
  };

  const { data: apiData, isLoading, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', tier, range],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/${tier}?range=${range}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Auto-refetch every minute
  });

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Data Updated",
      description: "Leaderboard data has been refreshed.",
      duration: 2000,
    });
  };

  const filteredData = useMemo(() => {
    if (!apiData?.data) return [];
    
    let filtered = apiData.data.map(entry => ({
      rank: entry.rank,
      username: entry.username,
      handle: entry.handle,
      mindshare: entry.mindshare,
      change: entry.mindshareDelta || 0,
    }));
    
    // Filter by search
    if (search) {
      filtered = filtered.filter(
        d => 
          d.username.toLowerCase().includes(search.toLowerCase()) || 
          d.handle.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [apiData, search]);

  const insights = useMemo(() => {
    if (!apiData?.data || apiData.data.length === 0) return null;
    
    const data = apiData.data;
    
    // Top 5 by mindshare
    const topPerformers = [...data]
      .sort((a, b) => b.mindshare - a.mindshare)
      .slice(0, 5);
    
    // Top 5 trending (biggest positive delta)
    const trending = [...data]
      .filter(d => (d.mindshareDelta || 0) > 0)
      .sort((a, b) => (b.mindshareDelta || 0) - (a.mindshareDelta || 0))
      .slice(0, 5);
    
    // Top 5 declining (biggest negative delta)
    const declining = [...data]
      .filter(d => (d.mindshareDelta || 0) < 0)
      .sort((a, b) => (a.mindshareDelta || 0) - (b.mindshareDelta || 0))
      .slice(0, 5);
    
    // Stats
    const totalMindshare = data.reduce((sum, d) => sum + d.mindshare, 0);
    const avgMindshare = totalMindshare / data.length;
    
    return {
      topPerformers,
      trending,
      declining,
      totalCreators: data.length,
      avgMindshare,
    };
  }, [apiData]);

  const lastUpdated = apiData?.lastUpdated ? new Date(apiData.lastUpdated) : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-black selection:text-white">
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        {/* Prominent Search Section at Top */}
        <div className="mb-8 bg-white border-2 border-black rounded-xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold uppercase tracking-wider text-black/70 mb-2">
                Search X Username
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black/50" />
                <Input 
                  placeholder="Search X username..." 
                  className="pl-14 pr-4 bg-yellow-50 border-2 border-black focus:ring-2 focus:ring-yellow-400 focus:border-black h-14 text-lg font-medium placeholder:text-black/40 rounded-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyPress}
                  data-testid="input-search"
                />
              </div>
            </div>
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending || search.trim().length < 2}
              className="h-14 px-8 border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-white transition-all text-lg font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
              data-testid="button-search"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Search className="h-5 w-5 mr-2" />
              )}
              Find Rank
            </Button>
            <Button 
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="h-14 px-6 border-2 border-black bg-white text-black hover:bg-black/5 transition-all text-lg font-bold rounded-lg"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* User Rank Summary */}
          {searchResults && (
            <div className="mt-6 pt-6 border-t-2 border-black/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://unavatar.io/twitter/${searchResults.searchedUsername}`}
                    alt={searchResults.displayName}
                    className="w-12 h-12 rounded-full border-2 border-black object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${searchResults.displayName}&background=000&color=fff&bold=true`;
                    }}
                  />
                  <div>
                    <h3 className="font-bold text-lg text-black">{searchResults.displayName}</h3>
                    <a 
                      href={`https://x.com/${searchResults.searchedUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {searchResults.handle}
                    </a>
                  </div>
                </div>
                {(() => {
                  const s5_30d = searchResults.results.find(r => r.season === "s5" && r.timeframe === "30d");
                  if (s5_30d?.found && s5_30d.mindshare) {
                    return (
                      <div className="text-right">
                        <div className="text-xs font-bold uppercase tracking-wider text-black/60">Mindshare</div>
                        <div className="text-2xl font-mono font-bold text-black">{s5_30d.mindshare.toFixed(4)}</div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {/* Rank Grid with Mindshare */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Season</th>
                      <th className="text-center py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">24h</th>
                      <th className="text-center py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">7 Days</th>
                      <th className="text-center py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">30 Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["s5", "s4", "s3", "s2", "s1"].map((season) => {
                      const seasonResults = searchResults.results.filter(r => r.season === season);
                      const r24h = seasonResults.find(r => r.timeframe === "24h");
                      const r7d = seasonResults.find(r => r.timeframe === "7d");
                      const r30d = seasonResults.find(r => r.timeframe === "30d");
                      
                      const isLive = season === "s5";
                      
                      const RankCell = ({ result }: { result: UserRankResult | undefined }) => {
                        if (!result?.found) {
                          return <span className="text-black/30">—</span>;
                        }
                        return (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-black text-base">#{result.rank}</span>
                            {result.mindshare !== null && result.mindshare !== undefined && (
                              <span className="text-xs font-mono text-black/60">{result.mindshare.toFixed(4)}</span>
                            )}
                          </div>
                        );
                      };
                      
                      return (
                        <tr key={season} className="border-b border-black/10 hover:bg-yellow-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-black uppercase">{season}</span>
                              {isLive && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">LIVE</span>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-3 px-3">
                            <RankCell result={r24h} />
                          </td>
                          <td className="text-center py-3 px-3">
                            <RankCell result={r7d} />
                          </td>
                          <td className="text-center py-3 px-3">
                            <RankCell result={r30d} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <p className="mt-3 text-xs text-black/50">
                S5 shows live ranks with mindshare. S1-S4 historical data coming soon.
              </p>
            </div>
          )}
          
          {search && !searchResults && !searchMutation.isPending && (
            <div className="mt-3 text-sm font-medium text-black/70">
              Showing results for "<span className="text-black font-bold">{search}</span>" - {filteredData.length} user{filteredData.length !== 1 ? 's' : ''} found in leaderboard
            </div>
          )}
        </div>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">
                Season 5
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-black/70">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                LIVE
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-black">
              CREATOR<br/>PROGRAM
            </h1>
            <p className="text-black/80 text-xl max-w-2xl font-medium">
              Join the Zama creator crew. Explore the future of onchain confidentiality.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <div className="text-right">
               <div className="text-xs font-bold uppercase tracking-wider text-black/60 mb-1">Snapshot</div>
               <div className="text-lg font-mono font-bold text-black">Dec 31, 23:59 AoE</div>
             </div>
             <a 
               href="https://www.zama.org/programs/creator-program" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm font-bold text-black hover:underline"
             >
               View on Zama <ExternalLink className="w-4 h-4" />
             </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatsCard 
            icon={Flame} 
            label="Status" 
            value="Live" 
            className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <StatsCard 
            icon={Trophy} 
            label="Prize Pool" 
            value="$53,000" 
            subValue="USD"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <StatsCard 
            icon={Users} 
            label="Creators" 
            value={apiData?.count.toString() || "0"} 
            subValue="RANKED"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        {/* Insights Section */}
        {insights && (
          <div className="mb-12 bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-black" />
              <h2 className="text-xl font-bold text-black">Leaderboard Analysis</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Performers */}
              <div className="bg-yellow-50 border-2 border-black rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-black">Top Performers</h3>
                </div>
                <div className="space-y-2">
                  {insights.topPerformers.map((user, idx) => (
                    <div key={`top-${user.handle}-${idx}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black/50">#{idx + 1}</span>
                        <img 
                          src={`https://unavatar.io/twitter/${user.handle.replace('@', '')}`}
                          alt={user.username}
                          className="w-6 h-6 rounded-full border border-black"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&size=24&background=000&color=fff`;
                          }}
                        />
                        <span className="font-medium text-black truncate max-w-[100px]">{user.username}</span>
                      </div>
                      <span className="font-mono text-xs text-black/70">{user.mindshare.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Trending Up */}
              <div className="bg-green-50 border-2 border-black rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-black">Trending Up</h3>
                </div>
                <div className="space-y-2">
                  {insights.trending.length > 0 ? insights.trending.map((user, idx) => (
                    <div key={`trend-${user.handle}-${idx}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://unavatar.io/twitter/${user.handle.replace('@', '')}`}
                          alt={user.username}
                          className="w-6 h-6 rounded-full border border-black"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&size=24&background=000&color=fff`;
                          }}
                        />
                        <span className="font-medium text-black truncate max-w-[100px]">{user.username}</span>
                      </div>
                      <span className="font-mono text-xs text-green-600 font-bold">+{(user.mindshareDelta || 0).toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-black/50">No trending data</p>
                  )}
                </div>
              </div>
              
              {/* Declining */}
              <div className="bg-red-50 border-2 border-black rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-black">Declining</h3>
                </div>
                <div className="space-y-2">
                  {insights.declining.length > 0 ? insights.declining.map((user, idx) => (
                    <div key={`decline-${user.handle}-${idx}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://unavatar.io/twitter/${user.handle.replace('@', '')}`}
                          alt={user.username}
                          className="w-6 h-6 rounded-full border border-black"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&size=24&background=000&color=fff`;
                          }}
                        />
                        <span className="font-medium text-black truncate max-w-[100px]">{user.username}</span>
                      </div>
                      <span className="font-mono text-xs text-red-600 font-bold">{(user.mindshareDelta || 0).toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-black/50">No declining data</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-xs text-black/60">
              <span>Avg Mindshare: <span className="font-mono font-bold">{insights.avgMindshare.toFixed(4)}</span></span>
              <span>Analysis based on {insights.totalCreators} creators</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TierSelector currentTier={tier} onSelect={setTier} />
            <TimeSelector currentRange={range} onSelect={setRange} />
          </div>
          
          <div className="flex items-center justify-between text-xs font-mono text-black/60 px-1">
            <div className="flex items-center gap-2">
               <Clock className="w-3 h-3" />
               {lastUpdated ? (
                 <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
               ) : (
                 <span>Loading...</span>
               )}
            </div>
            <div>
              Auto-refreshing every 60s
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && filteredData.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-black rounded-xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-black/60 font-bold">Loading leaderboard data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white border-2 border-black rounded-xl">
            <p className="text-red-600 font-bold mb-2">Error loading data</p>
            <p className="text-black/60 text-sm">Please try again later</p>
          </div>
        ) : (
          <RankTable data={filteredData} />
        )}
        
        <div className="mt-8 text-center text-sm text-black/60 font-medium">
          <p>Showing {filteredData.length} creators{search && ` matching "${search}"`}.</p>
        </div>
      </div>
    </div>
  );
}
