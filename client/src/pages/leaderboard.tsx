import { useState, useEffect, useMemo } from "react";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { TimeSelector } from "@/components/time-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Flame, Trophy, Users, RefreshCw, Clock } from "lucide-react";
import leaderboardData from "@/data/leaderboard-data.json";
import { useToast } from "@/hooks/use-toast";

// Helper to generate historical data from the current S5 data
// giving it a realistic feel for previous seasons/timeframes
const generateHistoricalData = (baseData: RankData[], seed: string) => {
  return baseData
    .map(user => {
      // Deterministic pseudo-random based on username + seed
      const hash = (user.username + seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomFactor = (hash % 100) / 100; // 0.0 to 1.0
      
      // Vary participation: some users didn't exist in previous seasons
      if (seed.startsWith('s') && seed !== 's5' && randomFactor > 0.8) return null;

      return {
        ...user,
        rank: 0, // Will recalculate
        mindshare: user.mindshare * (0.5 + randomFactor), // Vary score
        change: (hash % 20) - 10 // Vary change
      };
    })
    .filter((u): u is RankData => u !== null)
    .sort((a, b) => b.mindshare - a.mindshare)
    .map((u, i) => ({ ...u, rank: i + 1 }));
};

export default function Leaderboard() {
  const [tier, setTier] = useState("s5");
  const [range, setRange] = useState("24h");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Memoize the datasets for different combinations to avoid recalculating on every render
  const datasets = useMemo(() => {
    return {
      s5: {
        "24h": leaderboardData,
        "7d": generateHistoricalData(leaderboardData, "s5-7d"),
        "30d": generateHistoricalData(leaderboardData, "s5-30d"),
      },
      s4: {
        "24h": generateHistoricalData(leaderboardData, "s4-24h"),
        "7d": generateHistoricalData(leaderboardData, "s4-7d"),
        "30d": generateHistoricalData(leaderboardData, "s4-30d"),
      },
      s3: {
        "24h": generateHistoricalData(leaderboardData, "s3-24h"),
        "7d": generateHistoricalData(leaderboardData, "s3-7d"),
        "30d": generateHistoricalData(leaderboardData, "s3-30d"),
      },
      s2: {
        "24h": generateHistoricalData(leaderboardData, "s2-24h"),
        "7d": generateHistoricalData(leaderboardData, "s2-7d"),
        "30d": generateHistoricalData(leaderboardData, "s2-30d"),
      },
      s1: {
        "24h": generateHistoricalData(leaderboardData, "s1-24h"),
        "7d": generateHistoricalData(leaderboardData, "s1-7d"),
        "30d": generateHistoricalData(leaderboardData, "s1-30d"),
      },
    };
  }, []);

  const currentData = useMemo(() => {
    // @ts-ignore
    return datasets[tier]?.[range] || leaderboardData;
  }, [tier, range, datasets]);

  // Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Simulate network request
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      
      toast({
        title: "Data Synced",
        description: "Latest Zama leaderboard data retrieved.",
        duration: 2000,
      });
    }, 800);
  };

  // Auto-refresh simulation effect (every 60s as requested, though UI simulation only)
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    let filtered = [...currentData];
    
    // Filter by search
    if (search) {
      filtered = filtered.filter(
        d => 
          d.username.toLowerCase().includes(search.toLowerCase()) || 
          d.handle.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [currentData, search]);

  return (
    <div className="min-h-screen bg-[#8DFF48] text-black font-sans relative overflow-hidden selection:bg-black selection:text-[#8DFF48]">
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-black text-[#8DFF48] px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">
                Season {tier.replace('s', '')}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-black/80">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                LIVE
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-black leading-[0.9]">
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
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatsCard 
            icon={Flame} 
            label="Status" 
            value={tier === 's5' ? "Live" : "Ended"} 
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
            label="Total Participants" 
            value={currentData.length.toString()} 
            subValue="Creators"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TierSelector currentTier={tier} onSelect={setTier} />
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
               <TimeSelector currentRange={range} onSelect={setRange} />
               <div className="relative w-full sm:w-64 group">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-black transition-colors group-focus-within:text-[#8DFF48] z-10" />
                 <div className="absolute left-3 top-3 h-4 w-4 bg-black rounded-full -z-0 hidden group-focus-within:block" />
                 
                 <Input 
                   placeholder="Search user..." 
                   className="pl-10 bg-white border-2 border-black focus:ring-0 focus:border-black h-10 font-medium placeholder:text-black/40 transition-all focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
               </div>
               <Button 
                 variant="outline" 
                 size="icon"
                 onClick={handleRefresh}
                 disabled={isRefreshing}
                 className="h-10 w-10 border-2 border-black bg-white hover:bg-black hover:text-[#8DFF48] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
               >
                 <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
               </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs font-mono text-black/60 px-1">
            <div className="flex items-center gap-2">
               <Clock className="w-3 h-3" />
               Last synced: {lastUpdated.toLocaleTimeString()}
            </div>
            <div>
              Auto-refreshing enabled
            </div>
          </div>
        </div>

        {/* Table */}
        <RankTable data={filteredData} />
        
        <div className="mt-8 text-center text-sm text-black/60 font-medium">
          <p>Showing {filteredData.length} results for {tier.toUpperCase()} ({range}).</p>
          <p className="mt-2 text-xs opacity-70">
            * This is a prototype. Real-time data synchronization requires backend integration.
          </p>
        </div>
      </div>
    </div>
  );
}
