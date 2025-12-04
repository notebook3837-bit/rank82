import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankData {
  rank: number;
  username: string;
  handle: string;
  mindshare: number;
  change: number; // Positive, negative, or zero
  avatarUrl?: string;
}

interface RankTableProps {
  data: RankData[];
}

export function RankTable({ data }: RankTableProps) {
  return (
    <div className="rounded-xl border-2 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <Table>
        <TableHeader className="bg-black">
          <TableRow className="hover:bg-black border-none">
            <TableHead className="w-[80px] text-center text-white font-bold">Rank</TableHead>
            <TableHead className="text-white font-bold">User</TableHead>
            <TableHead className="text-right text-white font-bold">Mindshare</TableHead>
            <TableHead className="text-right w-[100px] text-white font-bold">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.handle} className="border-black/10 hover:bg-black/5 transition-colors group">
              <TableCell className="font-bold text-center text-lg">
                <div className="flex items-center justify-center">
                  {item.rank === 1 && <span className="text-2xl drop-shadow-md">🥇</span>}
                  {item.rank === 2 && <span className="text-2xl drop-shadow-md">🥈</span>}
                  {item.rank === 3 && <span className="text-2xl drop-shadow-md">🥉</span>}
                  {item.rank > 3 && <span className="text-black/50 font-mono">#{item.rank}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-black">
                    <AvatarImage src={item.avatarUrl} alt={item.username} />
                    <AvatarFallback className="bg-yellow-400 text-black font-bold border-2 border-transparent">
                      {item.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-black text-base">{item.username}</span>
                    <a 
                      href={`https://x.com/${item.handle.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-mono font-medium hover:underline"
                    >
                      {item.handle}
                    </a>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono font-bold text-black text-lg tracking-tight">
                  {item.mindshare.toFixed(4)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.change > 0.001 && <ArrowUp className="w-4 h-4 text-green-600 stroke-[3px]" />}
                  {item.change < -0.001 && <ArrowDown className="w-4 h-4 text-red-600 stroke-[3px]" />}
                  {Math.abs(item.change) <= 0.001 && <Minus className="w-4 h-4 text-black/20" />}
                  
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    item.change > 0.001 && "text-green-600",
                    item.change < -0.001 && "text-red-600",
                    Math.abs(item.change) <= 0.001 && "text-black/40"
                  )}>
                    {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
