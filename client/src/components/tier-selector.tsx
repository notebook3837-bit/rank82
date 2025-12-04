import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <div className="flex items-center overflow-x-auto pb-2 md:pb-0 gap-1 no-scrollbar">
      {tiers.map((tier) => (
        <button
          key={tier.id}
          onClick={() => onSelect(tier.id)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-md",
            currentTier === tier.id
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTier === tier.id && (
            <motion.div
              layoutId="activeTier"
              className="absolute inset-0 bg-primary rounded-md"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{tier.label}</span>
        </button>
      ))}
    </div>
  );
}
