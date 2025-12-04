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

export default function Leaderboard() {
  const [tier, setTier] = useState("s5");
  const [range, setRange] = useState("24h");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RankData[]>(leaderboardData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Simulate network request
    setTimeout(() => {
      // Shuffle mindshare slightly to simulate live updates
      const updatedData = data.map(d => ({
        ...d,
        mindshare: d.mindshare + (Math.random() * 0.001 - 0.0005),
        change: d.change + (Math.random() * 2 - 1)
      }));
      
      // Re-sort by mindshare
      updatedData.sort((a, b) => b.mindshare - a.mindshare);
      
      // Re-rank
      const rerankedData = updatedData.map((d, index) => ({
        ...d,
        rank: index + 1
      }));

      setData(rerankedData);
      setLastUpdated(new Date());
      setIsRefreshing(false);
      
      toast({
        title: "Data Updated",
        description: "Leaderboard data has been refreshed from the network.",
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
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    // Filter by search
    if (search) {
      filtered = filtered.filter(
        d => 
          d.username.toLowerCase().includes(search.toLowerCase()) || 
          d.handle.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [data, range, search, tier]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden selection:bg-black selection:text-white">
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
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
            label="Rewards" 
            value="1006" 
            subValue="OG NFTs"
             className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TierSelector currentTier={tier} onSelect={setTier} />
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
               <TimeSelector currentRange={range} onSelect={setRange} />
               <div className="relative w-full sm:w-64">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-black/50" />
                 <Input 
                   placeholder="Search user..." 
                   className="pl-10 bg-white border-2 border-black focus:ring-0 focus:border-black h-10 font-medium placeholder:text-black/40"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
               </div>
               <Button 
                 variant="outline" 
                 size="icon"
                 onClick={handleRefresh}
                 disabled={isRefreshing}
                 className="h-10 w-10 border-2 border-black bg-white hover:bg-black hover:text-white transition-all"
               >
                 <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
               </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs font-mono text-black/60 px-1">
            <div className="flex items-center gap-2">
               <Clock className="w-3 h-3" />
               Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <div>
              Auto-refreshing every 60s
            </div>
          </div>
        </div>

        {/* Table */}
        <RankTable data={filteredData} />
        
        <div className="mt-8 text-center text-sm text-black/60 font-medium">
          <p>Showing top {filteredData.length} creators.</p>
        </div>
      </div>
    </div>
  );
}
