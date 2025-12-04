import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { TimeSelector } from "@/components/time-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Flame, Trophy, Users, RefreshCw, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardResponse {
  season: string;
  range: string;
  count: number;
  lastUpdated: string | null;
  data: {
    id: number;
    season: string;
    rank: number;
    username: string;
    handle: string;
    mindshare: number;
    scrapedAt: string;
  }[];
}

export default function Leaderboard() {
  const [tier, setTier] = useState("s5");
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

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
      change: 0, // TODO: Calculate change from historical data
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

  const lastUpdated = apiData?.lastUpdated ? new Date(apiData.lastUpdated) : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-black selection:text-white">
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        {/* Prominent Search Section at Top */}
        <div className="mb-8 bg-white border-2 border-black rounded-xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold uppercase tracking-wider text-black/70 mb-2">
                Search Username
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black/50" />
                <Input 
                  placeholder="Enter X username to find your rank..." 
                  className="pl-14 pr-4 bg-yellow-50 border-2 border-black focus:ring-2 focus:ring-yellow-400 focus:border-black h-14 text-lg font-medium placeholder:text-black/40 rounded-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-14 px-8 border-2 border-black bg-black text-white hover:bg-yellow-400 hover:text-black transition-all text-lg font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
          {search && (
            <div className="mt-3 text-sm font-medium text-black/70">
              Showing results for "<span className="text-black font-bold">{search}</span>" - {filteredData.length} user{filteredData.length !== 1 ? 's' : ''} found
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
