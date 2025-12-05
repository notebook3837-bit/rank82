import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Trophy, ExternalLink, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function Leaderboard() {
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
    },
    onError: () => {
      toast({
        title: "User Not Found",
        description: "Could not find this user. Please check the username.",
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

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return "bg-yellow-400 text-black";
    if (rank === 2) return "bg-gray-300 text-black";
    if (rank === 3) return "bg-amber-600 text-white";
    if (rank <= 10) return "bg-blue-500 text-white";
    if (rank <= 100) return "bg-green-500 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">Zama Creator Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Rank Checker
          </h1>
          <p className="text-gray-400 text-lg">
            Search your rankings across all seasons (S1 - S5)
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input 
                placeholder="Enter X username (e.g. Zun2025)" 
                className="pl-12 h-14 bg-gray-900/50 border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/20 text-lg rounded-xl placeholder:text-gray-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyPress}
                data-testid="input-search"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending || search.trim().length < 2}
              className="h-14 px-6 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all"
              data-testid="button-search"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {searchResults && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <img 
                  src={searchResults.profilePic}
                  alt={searchResults.displayName}
                  className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${searchResults.displayName}&background=1f2937&color=fbbf24&bold=true&size=128`;
                  }}
                />
                <div className="flex-1">
                  <h2 className="font-bold text-xl text-white">{searchResults.displayName}</h2>
                  <a 
                    href={`https://x.com/${searchResults.searchedUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1"
                  >
                    {searchResults.handle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl overflow-hidden">
              <div className="bg-yellow-400/10 border-b border-gray-700 px-5 py-3">
                <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                  <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded font-bold">LIVE</span>
                  Season 5 Rankings
                </h3>
              </div>
              <div className="divide-y divide-gray-700/50">
                {[
                  { label: "24 Hours", rank: searchResults.s5.rank24h, mindshare: searchResults.s5.mindshare24h },
                  { label: "7 Days", rank: searchResults.s5.rank7d, mindshare: searchResults.s5.mindshare7d },
                  { label: "30 Days", rank: searchResults.s5.rank30d, mindshare: searchResults.s5.mindshare30d },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-4">
                    <span className="text-gray-400 font-medium">{item.label}</span>
                    <div className="flex items-center gap-4">
                      {item.mindshare && (
                        <span className="text-gray-500 text-sm font-mono">
                          {item.mindshare.toFixed(4)}%
                        </span>
                      )}
                      {item.rank ? (
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${getRankBadge(item.rank)}`}>
                          #{item.rank}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">Not ranked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl overflow-hidden">
              <div className="bg-gray-700/30 border-b border-gray-700 px-5 py-3">
                <h3 className="font-bold text-gray-300">Historical Rankings</h3>
              </div>
              <div className="divide-y divide-gray-700/50">
                {["s4", "s3", "s2", "s1"].map((season) => {
                  const result = searchResults.results.find(r => r.season === season);
                  return (
                    <div key={season} className="flex items-center justify-between px-5 py-4">
                      <span className="text-gray-400 font-medium uppercase">{season}</span>
                      {result?.found ? (
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${getRankBadge(result.rank)}`}>
                          #{result.rank}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">Not ranked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!searchResults && !searchMutation.isPending && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Enter a username to check rankings</p>
            <p className="text-sm mt-2">Search works across S1, S2, S3, S4 & live S5 data</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <a 
            href="https://www.zama.org/programs/creator-program" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-yellow-400 transition-colors"
          >
            Learn more about Zama Creator Program
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
