import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  className?: string;
}

export function StatsCard({ icon: Icon, label, value, subValue, className }: StatsCardProps) {
  return (
    <Card className={cn("rounded-xl", className)}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-black text-white shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-black/60 font-bold uppercase tracking-wide mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold font-display tracking-tighter text-black">{value}</h3>
            {subValue && <span className="text-xs font-bold text-black/50 uppercase">{subValue}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
