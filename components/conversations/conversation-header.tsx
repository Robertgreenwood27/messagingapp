import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useOnlineStatus } from "@/components/providers/online-status-provider";
import type { Profile } from "@/lib/supabase/database.types";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";

export function ConversationHeader({ otherParticipant }: { otherParticipant: Profile }) {
  const { onlineUsers, isOnline } = useOnlineStatus();
  const userStatus = onlineUsers.get(otherParticipant.id);
  const online = isOnline(otherParticipant.id);
  const [heatPhase, setHeatPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeatPhase(p => (p + 0.02) % (Math.PI * 2));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    if (!userStatus) return "Offline";
    if (online) return "Online";
    return `Last seen ${formatDistanceToNow(new Date(userStatus.last_seen), { addSuffix: true })}`;
  };

  return (
    <header className="relative border-b border-white/5 overflow-hidden">
      {/* Ambient background effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(${heatPhase * 30}deg, 
            rgba(0, 183, 255, 0.03), 
            rgba(0, 255, 179, 0.05)
          )`
        }}
      >
        <div className="absolute inset-0 animate-pulse-move" />
      </div>

      <div className="relative flex items-center gap-3 p-4 bg-black/10">
        <div className="relative">
          <Avatar className="ring-1 ring-white/5 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <AvatarImage src={otherParticipant.avatar_url || undefined} />
            <AvatarFallback className="bg-black/20">
              {otherParticipant.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div 
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full 
              border-2 border-black/90 transition-all duration-300
              ${online 
                ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                : 'bg-white/20'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate text-white/90">
            {otherParticipant.username}
          </h1>
          <p className={`text-sm transition-colors duration-300 
            ${online ? 'text-emerald-500/70' : 'text-white/50'}`}>
            {getStatusText()}
          </p>
        </div>
      </div>
    </header>
  );
}