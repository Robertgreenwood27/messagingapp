// components/messages/message-skeleton.tsx
import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  align?: "start" | "end";
}

export function MessageSkeleton({ align = "start" }: MessageSkeletonProps) {
  return (
    <div className={cn(
      "flex gap-2 w-full",
      align === "end" && "justify-end"
    )}>
      {align === "start" && (
        <div className="w-6 h-6 rounded-full bg-black/20 animate-pulse" />
      )}
      <div className={cn(
        "max-w-[80%] space-y-2",
        align === "end" && "items-end"
      )}>
        <div className="h-4 bg-black/20 animate-pulse rounded-lg w-48 relative overflow-hidden">
          <div 
            className="w-1/3 h-full animate-pulse-move"
            style={{
              background: `linear-gradient(
                90deg,
                transparent 0%,
                rgba(0, 183, 255, 0.03) 25%,
                rgba(0, 255, 179, 0.05) 50%,
                rgba(0, 183, 255, 0.03) 75%,
                transparent 100%
              )`
            }}
          />
        </div>
        <div className="h-3 bg-black/20 animate-pulse rounded-lg w-24" />
      </div>
    </div>
  );
}