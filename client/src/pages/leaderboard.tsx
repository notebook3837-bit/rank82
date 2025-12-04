import { useState, useMemo } from "react";
import { RankTable, RankData } from "@/components/rank-table";
import { StatsCard } from "@/components/stats-card";
import { TierSelector } from "@/components/tier-selector";
import { TimeSelector } from "@/components/time-selector";
import { Input } from "@/components/ui/input";
import { Search, Flame, Trophy, Users, Clock } from "lucide-react";
import bgImage from "@assets/generated_images/dark_zama-themed_cryptographic_background.png";

// Mock data generated based on the fetch
const MOCK_DATA: RankData[] = [
  { rank: 1, username: "RA randhindi", handle: "@randhindi", mindshare: 1.5902, change: 12.5 },
  { rank: 2, username: "ZU Zun2025", handle: "@Zun2025", mindshare: 1.1502, change: 5.2 },
  { rank: 3, username: "PS Paul___Shark", handle: "@Paul___Shark", mindshare: 0.8995, change: -2.1 },
  { rank: 4, username: "IG ig28eth", handle: "@ig28eth", mindshare: 0.8624, change: 0.8 },
  { rank: 5, username: "0P 0x Professor7", handle: "@0xProfessor7", mindshare: 0.6855, change: 1.5 },
  { rank: 6, username: "0X 0xbunny_", handle: "@0xbunny_", mindshare: 0.6819, change: -0.5 },
  { rank: 7, username: "0M 0x Mamareza", handle: "@0xMamareza", mindshare: 0.6478, change: 3.2 },
  { rank: 8, username: "CU cutemoon66", handle: "@cutemoon66", mindshare: 0.5540, change: 0 },
  { rank: 9, username: "TA tamonex2000", handle: "@tamonex2000", mindshare: 0.5255, change: 4.1 },
  { rank: 10, username: "BA barudkhanweb3", handle: "@barudkhanweb3", mindshare: 0.5145, change: -1.2 },
  { rank: 11, username: "MA Maezii1", handle: "@Maezii1", mindshare: 0.5011, change: 0.5 },
  { rank: 12, username: "MH mhrddmrd", handle: "@mhrddmrd", mindshare: 0.4786, change: 2.2 },
  { rank: 13, username: "TR Trungnguyen9888", handle: "@Trungnguyen9888", mindshare: 0.4616, change: 1.1 },
  { rank: 14, username: "HU humanbotcrypto", handle: "@humanbotcrypto", mindshare: 0.4559, change: -0.3 },
  { rank: 15, username: "LO lohith0001", handle: "@lohith0001", mindshare: 0.4548, change: 0 },
  { rank: 16, username: "0S 0x Stephen_", handle: "@0xStephen_", mindshare: 0.4522, change: 0.9 },
  { rank: 17, username: "TC Thanh Craffey", handle: "@ThanhCraffey", mindshare: 0.4329, change: -1.5 },
  { rank: 18, username: "CL cloudtechvn", handle: "@cloudtechvn", mindshare: 0.4068, change: 2.4 },
  { rank: 19, username: "AA Abid__Ahasan", handle: "@Abid__Ahasan", mindshare: 0.4046, change: 0.1 },
  { rank: 20, username: "ED Edward74470934", handle: "@Edward74470934", mindshare: 0.4024, change: -0.2 },
];

export default function Leaderboard() {
  const [tier, setTier] = useState("s5");
  const [range, setRange] = useState("24h");
  const [search, setSearch] = useState("");

  // Simulate different data for different ranges/tiers to make it feel alive
  const filteredData = useMemo(() => {
    let data = [...MOCK_DATA];
    
    // Randomize slightly based on range to simulate different data
    if (range === "7d") {
      data = data.map(d => ({ ...d, mindshare: d.mindshare * 1.5, change: d.change * 2 }));
    } else if (range === "30d") {
      data = data.map(d => ({ ...d, mindshare: d.mindshare * 4, change: d.change * 5 }));
    }

    // Filter by search
    if (search) {
      data = data.filter(
        d => 
          d.username.toLowerCase().includes(search.toLowerCase()) || 
          d.handle.toLowerCase().includes(search.toLowerCase())
      );
    }

    return data;
  }, [range, search, tier]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
         <div 
           className="absolute inset-0 bg-cover bg-center bg-no-repeat"
           style={{ backgroundImage: `url(${bgImage})` }}
         />
         <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              Creator Program <span className="text-primary">Season 5</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Join the Zama creator crew, explore the future of onchain confidentiality, and become a Zama OG.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 text-sm font-mono text-primary">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               LIVE UPDATES
             </div>
             <div className="text-xs text-muted-foreground font-mono">
               Snapshot: Dec 31, 23:59 AoE
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatsCard 
            icon={Flame} 
            label="Status" 
            value="Live" 
            className="border-primary/20"
          />
          <StatsCard 
            icon={Trophy} 
            label="Prize Pool" 
            value="$53,000" 
            subValue="USD"
          />
          <StatsCard 
            icon={Users} 
            label="Rewards" 
            value="1006" 
            subValue="OG NFTs"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TierSelector currentTier={tier} onSelect={setTier} />
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
               <TimeSelector currentRange={range} onSelect={setRange} />
               <div className="relative w-full sm:w-64">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search user..." 
                   className="pl-9 bg-secondary/30 border-border focus:border-primary/50 transition-all"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
               </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <RankTable data={filteredData} />
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Showing top 20 of 1500 creators. Data is simulated for this prototype.</p>
        </div>
      </div>
    </div>
  );
}
