// components/conversations/conversation-list.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useOnlineStatus } from "@/components/providers/online-status-provider";
import type { Database } from "@/lib/supabase/database.types";

function ConversationSkeleton() {
  return (
    <div className="p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded w-32" />
        <div className="h-3 bg-muted animate-pulse rounded w-48" />
      </div>
    </div>
  );
}

type ConversationWithProfiles = Database["public"]["Tables"]["conversations"]["Row"] & {
  participant1: Database["public"]["Tables"]["profiles"]["Row"];
  participant2: Database["public"]["Tables"]["profiles"]["Row"];
  latest_message?: {
    content: string;
    created_at: string;
  };
};

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
  const { onlineUsers } = useOnlineStatus();
  const supabase = createClient();

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

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

        // First, fetch conversations with participants
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            participant1:profiles!conversations_participant1_id_fkey (
              id, username, avatar_url, updated_at
            ),
            participant2:profiles!conversations_participant2_id_fkey (
              id, username, avatar_url, updated_at
            )
          `)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (conversationsError) {
          setError(conversationsError.message);
          setLoading(false);
          return;
        }

        // Filter out self-conversations and ensure unique conversations
        const filteredConversations = conversationsData.filter(conv => 
          conv.participant1_id !== conv.participant2_id
        );

        // Modified message fetching to fix 406 error
        const conversationsWithMessages = await Promise.all(
          filteredConversations.map(async (conversation) => {
            const { data: latestMessage } = await supabase
              .from('messages')
              .select('id, content, created_at')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...conversation,
              latest_message: latestMessage || undefined
            };
          })
        );

        setConversations(conversationsWithMessages);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
        setLoading(false);
      }
    }

    fetchConversations();

    // Subscribe to message updates
    const subscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations(); // Reload conversations when new messages arrive
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="space-y-1">
        <ConversationSkeleton />
        <ConversationSkeleton />
        <ConversationSkeleton />
        <ConversationSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (conversations.length === 0) {
    return <div className="p-4 text-muted-foreground">No conversations yet</div>;
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const otherParticipant = 
          conversation.participant1.id === currentUserId 
            ? conversation.participant2 
            : conversation.participant1;
        
        const online = onlineUsers.get(otherParticipant.id)?.is_online;
        
        return (
          <Button
            key={conversation.id}
            variant="ghost"
            className={`w-full justify-start p-3 ${
              activeConversationId === conversation.id
                ? "bg-muted"
                : ""
            }`}
            onClick={() => onConversationSelect(conversation.id)}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="relative">
                <Avatar>
                  <AvatarImage src={otherParticipant.avatar_url || undefined} />
                  <AvatarFallback>
                    {otherParticipant.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    online ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium truncate">
                    {otherParticipant.username}
                  </span>
                  {conversation.latest_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.latest_message.created_at), { 
                        addSuffix: true 
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {online && (
                    <span className="text-xs text-green-500">online</span>
                  )}
                  {conversation.latest_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.latest_message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
