// components/conversations/conversation-header.tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useOnlineStatus } from "@/components/providers/online-status-provider";
import type { Profile } from "@/lib/supabase/database.types";
import { formatDistanceToNow } from "date-fns";

export function ConversationHeader({ otherParticipant }: { otherParticipant: Profile }) {
  const { onlineUsers, isOnline } = useOnlineStatus();
  const userStatus = onlineUsers.get(otherParticipant.id);
  const online = isOnline(otherParticipant.id);

  const getStatusText = () => {
    if (!userStatus) return "Offline";
    if (online) return "Online";
    return `Last seen ${formatDistanceToNow(new Date(userStatus.last_seen), { addSuffix: true })}`;
  };

  return (
    <header className="border-b p-4 flex items-center gap-3">
      <div className="relative">
        <Avatar>
          <AvatarImage src={otherParticipant.avatar_url || undefined} />
          <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <div 
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
            online ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </div>
      <div>
        <h1 className="text-lg font-semibold">{otherParticipant.username}</h1>
        <p className="text-sm text-muted-foreground">{getStatusText()}</p>
      </div>
    </header>
  );
}