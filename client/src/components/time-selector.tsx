import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  currentRange: string;
  onSelect: (range: string) => void;
}

const ranges = [
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

export function TimeSelector({ currentRange, onSelect }: TimeSelectorProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-lg bg-secondary/50 border border-border">
      {ranges.map((range) => (
        <button
          key={range.id}
          onClick={() => onSelect(range.id)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            currentRange === range.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
