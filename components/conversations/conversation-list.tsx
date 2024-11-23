// components/conversations/conversation-list.tsx

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/components/providers/online-status-provider";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

// Updated type definitions
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

interface ConversationWithProfiles extends Conversation {
  participant1: Profile;
  participant2: Profile;
}

export function ConversationList({ 
  activeConversationId,
  onConversationSelect 
}: { 
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const { onlineUsers } = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 0.02) % (Math.PI * 2));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase.auth]);

  useEffect(() => {
    if (!currentUserId) return;

    async function fetchConversations() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            participant1:profiles!conversations_participant1_id_fkey (*),
            participant2:profiles!conversations_participant2_id_fkey (*)
          `)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        if (data) {
          const typedData = data as unknown as ConversationWithProfiles[];
          setConversations(typedData.filter(conv => 
            conv.participant1_id !== conv.participant2_id
          ));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
        setLoading(false);
      }
    }

    fetchConversations();

    const subscription = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, 
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 p-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center p-2">
            <div 
              className="w-12 h-12 rounded-full relative overflow-hidden mb-2"
              style={{
                background: `linear-gradient(${phase * 30}deg, rgba(0, 183, 255, 0.05), rgba(0, 255, 179, 0.08))`,
              }}
            >
              <div className="absolute inset-0 animate-pulse-move" />
            </div>
            <div 
              className="h-4 w-20 rounded-full relative overflow-hidden"
              style={{
                background: `linear-gradient(${phase * 20}deg, rgba(0, 183, 255, 0.05), rgba(0, 255, 179, 0.08))`,
              }}
            >
              <div className="absolute inset-0 animate-pulse-move" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 p-6 text-red-500/70 bg-red-500/5 border border-red-500/10 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-white/30">
        <div className="text-center space-y-3">
          <p className="text-lg">No conversations yet</p>
          <div className="w-full h-[1px] relative overflow-hidden">
            <div className="absolute inset-0 animate-pulse-move" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-2">
      {conversations.map((conversation) => {
        const otherParticipant = 
          conversation.participant1.id === currentUserId 
            ? conversation.participant2 
            : conversation.participant1;
        
        const online = onlineUsers.get(otherParticipant.id)?.is_online;
        const isActive = activeConversationId === conversation.id;
        const isHovered = hoveredId === conversation.id;
        const displayName = otherParticipant.username || 'Anonymous';
        
        return (
          <Button
            key={conversation.id}
            variant="ghost"
            className={cn(
              "p-2 hover:bg-transparent flex flex-col items-center",
              "h-auto min-h-24 text-center",
              isActive && "bg-black/20"
            )}
            onMouseEnter={() => setHoveredId(conversation.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onConversationSelect(conversation.id)}
          >
            <div className="relative mb-2">
              <div 
                className={cn(
                  "w-12 h-12 rounded-full relative overflow-hidden",
                  "ring-1 ring-white/5"
                )}
                style={{
                  background: `linear-gradient(${phase * 30}deg, 
                    ${isActive || isHovered 
                      ? 'rgba(0, 183, 255, 0.1), rgba(0, 255, 179, 0.15)'
                      : 'rgba(0, 183, 255, 0.05), rgba(0, 255, 179, 0.08)'}
                  )`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-lg text-white/70">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div 
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full",
                  "transition-all duration-300",
                  online ? "bg-emerald-500" : "bg-white/20"
                )}
                style={{
                  boxShadow: online 
                    ? '0 0 10px rgba(16,185,129,0.5)' 
                    : 'none'
                }}
              />
            </div>

            <div className="space-y-1 w-full">
              <div 
                className={cn(
                  "text-sm font-medium text-white/70 truncate",
                  "transition-all duration-300",
                  isActive || isHovered ? "text-white/90" : ""
                )}
                title={displayName}
              >
                {displayName}
              </div>
              {online && (
                <div className="text-xs text-emerald-500/70">
                  online
                </div>
              )}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
