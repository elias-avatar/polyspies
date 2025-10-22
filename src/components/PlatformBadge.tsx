import { Badge } from "./ui/badge";
import { Platform } from "@/lib/unified/types";

interface PlatformBadgeProps {
  platform: Platform;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <Badge
      variant={platform === "polymarket" ? "default" : "secondary"}
      className={
        platform === "polymarket"
          ? "bg-blue-500 hover:bg-blue-600"
          : "bg-purple-500 hover:bg-purple-600"
      }
    >
      {platform === "polymarket" ? "Polymarket" : "Kalshi"}
    </Badge>
  );
}

