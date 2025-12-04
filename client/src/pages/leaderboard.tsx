import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Flame, Trophy, Users, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
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
  }[];
}

interface UserRankResult {
  season: string;
  rank: number | null;
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
  const [tier, setTier] = useState("s4");
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
          
          {searchResults && (
            <div className="mt-6 pt-6 border-t-2 border-black/10">
              <div className="flex items-center gap-3 mb-4">
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
              
              <div className="overflow-x-auto">
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
                              <span className="font-bold text-black text-base">#{result.rank}</span>
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
          )}
          
          {search && !searchResults && !searchMutation.isPending && (
            <div className="mt-3 text-sm font-medium text-black/70">
              Showing results for "<span className="text-black font-bold">{search}</span>" - {filteredData.length} user{filteredData.length !== 1 ? 's' : ''} found in leaderboard
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">
                Historical Data
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-black">
              ZAMA<br/>CREATOR<br/>PROGRAM
            </h1>
            <p className="text-black/80 text-xl max-w-2xl font-medium">
              Historical leaderboard rankings from Seasons 1-4.
            </p>
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
