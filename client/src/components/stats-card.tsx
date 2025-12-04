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
    <Card className={cn("border-border bg-card/50 backdrop-blur-sm", className)}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-display tracking-tight">{value}</h3>
            {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
