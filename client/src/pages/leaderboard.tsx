import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Flame, Trophy, Users, RefreshCw, ExternalLink, Loader2, Twitter, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardResponse {
  season: string;
  count: number;
  lastUpdated: string | null;
  message?: string;
  data: {
    id: number;
    season: string;
    rank: number;
    username: string;
    handle: string;
    avatarUrl?: string;
  }[];
}

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

interface SearchResponse {
  searchedUsername: string;
  displayName: string;
  handle: string;
  profilePic: string;
  results: UserRankResult[];
  s5: S5RankResult;
  timestamp: string;
}

interface Suggestion {
  username: string;
  handle: string;
  rank: number;
  season: string;
}

export default function Leaderboard() {
  const [tier, setTier] = useState("s4");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(6);
  const [resultsRevealed, setResultsRevealed] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasCompletedFollow, setHasCompletedFollow] = useState(() => {
    return localStorage.getItem('zama_follow_completed') === 'true';
  });
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirming && confirmCountdown > 0) {
      timer = setTimeout(() => {
        setConfirmCountdown(prev => prev - 1);
      }, 1000);
    } else if (isConfirming && confirmCountdown === 0) {
      setIsConfirming(false);
      setResultsRevealed(true);
      setShowFollowPrompt(false);
      localStorage.setItem('zama_follow_completed', 'true');
      setHasCompletedFollow(true);
    }
    return () => clearTimeout(timer);
  }, [isConfirming, confirmCountdown]);

  const handleFollowClick = () => {
    window.open('https://x.com/intent/follow?screen_name=sinceOctober8', '_blank');
    setIsConfirming(true);
    setConfirmCountdown(6);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim().length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/suggestions/${encodeURIComponent(search.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions?.length > 0);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleSuggestionClick = (handle: string) => {
    setSearch(handle);
    setShowSuggestions(false);
    searchMutation.mutate(handle);
  };
  
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
      if (hasCompletedFollow) {
        setShowFollowPrompt(false);
        setResultsRevealed(true);
      } else {
        setShowFollowPrompt(true);
        setResultsRevealed(false);
        setIsConfirming(false);
        setConfirmCountdown(6);
      }
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
    queryKey: ['leaderboard', tier],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/${tier}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      return response.json();
    },
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
      avatarUrl: entry.avatarUrl,
    }));
    
    if (search) {
      filtered = filtered.filter(
        d => 
          d.username.toLowerCase().includes(search.toLowerCase()) || 
          d.handle.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [apiData, search]);

  const seasonInfo: Record<string, { creators: number; prize: string }> = {
    s1: { creators: 223, prize: "$50,000" },
    s2: { creators: 436, prize: "$50,000" },
    s3: { creators: 726, prize: "$50,000" },
    s4: { creators: 571, prize: "$50,000" },
  };

  const currentSeasonInfo = seasonInfo[tier] || { creators: 0, prize: "$50,000" };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-black selection:text-white">
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        <div className="mb-8 bg-white border-2 border-black rounded-xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold uppercase tracking-wider text-black/70 mb-2">
                Search X Username
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black/50 z-10" />
                <Input 
                  placeholder="Search X username..." 
                  className="pl-14 pr-4 bg-yellow-50 border-2 border-black focus:ring-2 focus:ring-yellow-400 focus:border-black h-14 text-base sm:text-lg font-medium placeholder:text-black/40 rounded-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  data-testid="input-search"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 overflow-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.handle}-${index}`}
                        className="w-full px-4 py-3 text-left hover:bg-yellow-50 flex items-center gap-3 border-b border-black/10 last:border-b-0 transition-colors"
                        onMouseDown={() => handleSuggestionClick(suggestion.handle)}
                        data-testid={`suggestion-${index}`}
                      >
                        <img 
                          src={`https://unavatar.io/twitter/${suggestion.handle}`}
                          alt={suggestion.username}
                          className="w-8 h-8 rounded-full border border-black/20"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${suggestion.username}&background=000&color=fff&bold=true&size=32`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-black truncate">{suggestion.username}</div>
                          <div className="text-sm text-black/60">@{suggestion.handle}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">#{suggestion.rank}</span>
                          <span className="text-xs text-black/50 uppercase">{suggestion.season}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={handleSearch}
                disabled={searchMutation.isPending || search.trim().length < 2}
                className="flex-1 md:flex-initial h-12 sm:h-14 px-4 sm:px-8 border-2 border-black bg-yellow-400 text-black hover:bg-black hover:text-white transition-all text-base sm:text-lg font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
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
                className="h-12 sm:h-14 px-4 sm:px-6 border-2 border-black bg-white text-black hover:bg-black/5 transition-all text-lg font-bold rounded-lg"
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {searchResults && (
            <div className="mt-6 pt-6 border-t-2 border-black/10">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={searchResults.profilePic}
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
              
              <div className="relative">
                {showFollowPrompt && !resultsRevealed && (
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-white/60 backdrop-blur-sm rounded-xl">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-black rounded-xl p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-4 max-w-md">
                      <div className="text-2xl font-black text-black mb-3">
                        🎉 Found your rank!
                      </div>
                      <p className="text-lg font-bold text-black/80 mb-4">
                        Follow <a href="https://x.com/sinceOctober8" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@sinceOctober8</a> to see your live rank
                      </p>
                      <p className="text-sm text-black/60 mb-6">
                        Get ranking tips and alpha 🚀
                      </p>
                      
                      {isConfirming ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2 text-black font-bold">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Confirming if you already followed...</span>
                          </div>
                          <div className="text-3xl font-black text-yellow-600">{confirmCountdown}</div>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleFollowClick}
                          className="h-14 px-8 bg-black text-white hover:bg-black/80 transition-all text-lg font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(234,179,8,1)] flex items-center gap-2"
                          data-testid="button-follow"
                        >
                          <Twitter className="h-5 w-5" />
                          Follow to See Rank
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              
              <div className={`overflow-x-auto ${showFollowPrompt && !resultsRevealed ? 'blur-md pointer-events-none select-none' : ''}`}>
                {/* Season 5 Section - Always shown */}
                <div className="mb-6">
                  <h4 className="font-bold text-black text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-xs">S5</span>
                    Season 5 (Active)
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Timeframe</th>
                        <th className="text-center py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Rank</th>
                        <th className="text-right py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Mindshare</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/10 hover:bg-yellow-50">
                        <td className="py-3 px-3">
                          <span className="font-bold text-black">24 Hours</span>
                        </td>
                        <td className="text-center py-3 px-3">
                          {searchResults.s5.rank24h ? (
                            <span className="inline-block bg-yellow-400 text-black font-black text-lg px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">#{searchResults.s5.rank24h}</span>
                          ) : (
                            <span className="text-black/30">Not ranked</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-3">
                          {searchResults.s5.mindshare24h ? (
                            <span className="inline-block bg-black text-yellow-400 font-bold text-base px-3 py-1 rounded-lg">{searchResults.s5.mindshare24h.toFixed(4)}%</span>
                          ) : (
                            <span className="text-black/30">-</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-black/10 hover:bg-yellow-50">
                        <td className="py-3 px-3">
                          <span className="font-bold text-black">7 Days</span>
                        </td>
                        <td className="text-center py-3 px-3">
                          {searchResults.s5.rank7d ? (
                            <span className="inline-block bg-yellow-400 text-black font-black text-lg px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">#{searchResults.s5.rank7d}</span>
                          ) : (
                            <span className="text-black/30">Not ranked</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-3">
                          {searchResults.s5.mindshare7d ? (
                            <span className="inline-block bg-black text-yellow-400 font-bold text-base px-3 py-1 rounded-lg">{searchResults.s5.mindshare7d.toFixed(4)}%</span>
                          ) : (
                            <span className="text-black/30">-</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-black/10 hover:bg-yellow-50">
                        <td className="py-3 px-3">
                          <span className="font-bold text-black">30 Days</span>
                        </td>
                        <td className="text-center py-3 px-3">
                          {searchResults.s5.rank30d ? (
                            <span className="inline-block bg-yellow-400 text-black font-black text-lg px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">#{searchResults.s5.rank30d}</span>
                          ) : (
                            <span className="text-black/30">Not ranked</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-3">
                          {searchResults.s5.mindshare30d ? (
                            <span className="inline-block bg-black text-yellow-400 font-bold text-base px-3 py-1 rounded-lg">{searchResults.s5.mindshare30d.toFixed(4)}%</span>
                          ) : (
                            <span className="text-black/30">-</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Historical Seasons Section (S1-S4) */}
                <div>
                  <h4 className="font-bold text-black text-sm uppercase tracking-wider mb-3">Historical Seasons (Rank Only)</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Season</th>
                        <th className="text-center py-2 px-3 font-bold text-black/70 uppercase tracking-wider text-xs">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["s4", "s3", "s2", "s1"].map((season) => {
                        const result = searchResults.results.find(r => r.season === season);
                        
                        return (
                          <tr key={season} className="border-b border-black/10 hover:bg-yellow-50">
                            <td className="py-3 px-3">
                              <span className="font-bold text-black uppercase">{season}</span>
                            </td>
                            <td className="text-center py-3 px-3">
                              {result?.found ? (
                                <span className="inline-block bg-yellow-400 text-black font-black text-lg px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">#{result.rank}</span>
                              ) : (
                                <span className="text-black/30">Not ranked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>
          )}
          
          {search && !searchResults && !searchMutation.isPending && (
            <div className="mt-3 text-sm font-medium text-black/70">
              Showing results for "<span className="text-black font-bold">{search}</span>" - {filteredData.length} user{filteredData.length !== 1 ? 's' : ''} found in leaderboard
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
              <a 
                href="https://x.com/sinceOctober8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full font-bold text-base sm:text-lg hover:bg-black/80 transition-all shadow-[3px_3px_0px_0px_rgba(234,179,8,1)]"
                data-testid="link-creator"
              >
                <Twitter className="w-5 h-5" />
                @sinceOctober8
              </a>
              <a 
                href="https://t.me/alphaonly13" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] text-white px-5 py-3 rounded-full font-bold text-base sm:text-lg hover:scale-105 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-white/30"
                data-testid="link-telegram"
              >
                <Send className="w-6 h-6" />
                <span className="flex flex-col leading-tight">
                  <span className="text-xs opacity-80">JOIN FOR</span>
                  <span>Airdrop Alpha Calls</span>
                </span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-bounce">NEW</span>
              </a>
            </div>
            <p className="inline-block bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] text-black text-sm sm:text-base mt-3 font-bold px-4 py-2 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ⭐ Follow for ranking tips and alpha 🚀
            </p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-black">
              ZAMA<br/>LIVE RANK<br/>CHECKER
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-2">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatsCard 
            icon={Flame} 
            label="Season" 
            value={tier.toUpperCase()} 
            className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <StatsCard 
            icon={Trophy} 
            label="Prize Pool" 
            value={currentSeasonInfo.prize} 
            subValue="USD"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <StatsCard 
            icon={Users} 
            label="Creators" 
            value={apiData?.count.toString() || currentSeasonInfo.creators.toString()} 
            subValue="RANKED"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        <div className="flex flex-col gap-6 mb-6">
          <TierSelector currentTier={tier} onSelect={setTier} />
        </div>

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
          <p>Showing {filteredData.length} creators{search && ` matching "${search}"`} from {tier.toUpperCase()}.</p>
        </div>
      </div>
    </div>
  );
}
