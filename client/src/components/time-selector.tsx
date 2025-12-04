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
    <div className="inline-flex items-center p-1 rounded-lg bg-white border-2 border-black">
      {ranges.map((range) => (
        <button
          key={range.id}
          onClick={() => onSelect(range.id)}
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
            currentRange === range.id
              ? "bg-black text-white"
              : "text-black hover:bg-black/5"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
