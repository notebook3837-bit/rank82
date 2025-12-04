import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface RankData {
  rank: number;
  username: string;
  handle: string;
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
            <TableHead className="text-white font-bold">Creator</TableHead>
            <TableHead className="text-right text-white font-bold">Profile</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={`${item.handle}-${item.rank}-${index}`} className="border-black/10 hover:bg-black/5 transition-colors group" data-testid={`row-creator-${item.rank}`}>
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
                  <span className="font-bold text-black text-base">{item.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <a 
                  href={`https://x.com/${item.handle.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-mono font-medium hover:underline"
                  data-testid={`link-profile-${item.rank}`}
                >
                  {item.handle}
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
