// components/conversations/conversation-header.tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/database.types";

export function ConversationHeader({ otherParticipant }: { otherParticipant: Profile }) {
  return (
    <header className="border-b p-4 flex items-center gap-3">
      <Avatar>
        <AvatarImage src={otherParticipant.avatar_url || undefined} />
        <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
      </Avatar>
      <div>
        <h1 className="text-lg font-semibold">{otherParticipant.username}</h1>
        <p className="text-sm text-muted-foreground">Online</p>
      </div>
    </header>
  );
}