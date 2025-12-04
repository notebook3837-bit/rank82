import { cn } from "@/lib/utils";

interface TierSelectorProps {
  currentTier: string;
  onSelect: (tier: string) => void;
}

const tiers = [
  { id: "s5", label: "Live - Season 5" },
  { id: "s4", label: "Season 4" },
  { id: "s3", label: "Season 3" },
  { id: "s2", label: "Season 2" },
  { id: "s1", label: "Season 1" },
];

export function TierSelector({ currentTier, onSelect }: TierSelectorProps) {
  return (
    <div className="flex items-center overflow-x-auto pb-2 md:pb-0 gap-2 no-scrollbar">
      {tiers.map((tier) => (
        <button
          key={tier.id}
          onClick={() => onSelect(tier.id)}
          className={cn(
            "relative px-4 py-2 text-sm font-bold transition-all whitespace-nowrap rounded-lg border-2",
            currentTier === tier.id
              ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]"
              : "bg-white text-black border-black hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          )}
        >
          {tier.label}
        </button>
      ))}
    </div>
  );
}
