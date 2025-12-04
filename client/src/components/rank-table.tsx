import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, Trophy } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md overflow-hidden">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[80px] text-center">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Mindshare</TableHead>
            <TableHead className="text-right w-[100px]">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.handle} className="border-border hover:bg-secondary/20 transition-colors group">
              <TableCell className="font-medium text-center">
                <div className="flex items-center justify-center">
                  {item.rank === 1 && <span className="text-2xl">🥇</span>}
                  {item.rank === 2 && <span className="text-2xl">🥈</span>}
                  {item.rank === 3 && <span className="text-2xl">🥉</span>}
                  {item.rank > 3 && <span className="text-muted-foreground font-mono">#{item.rank}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={item.avatarUrl} alt={item.username} />
                    <AvatarFallback className="bg-secondary text-xs font-medium">
                      {item.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.username}</span>
                    <span className="text-xs text-muted-foreground">{item.handle}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono font-medium text-foreground">
                  {item.mindshare.toFixed(4)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.change > 0 && <ArrowUp className="w-3 h-3 text-primary" />}
                  {item.change < 0 && <ArrowDown className="w-3 h-3 text-destructive" />}
                  {item.change === 0 && <Minus className="w-3 h-3 text-muted-foreground" />}
                  
                  <span className={cn(
                    "text-xs font-mono",
                    item.change > 0 && "text-primary",
                    item.change < 0 && "text-destructive",
                    item.change === 0 && "text-muted-foreground"
                  )}>
                    {Math.abs(item.change)}%
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
