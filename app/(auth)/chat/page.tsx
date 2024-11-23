// app/(auth)/chat/page.tsx
"use client";
import { MessagesProvider } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Profile } from "@/lib/supabase/database.types";
import { MessageList } from "@/components/messages/message-list";
import { MessageInput } from "@/components/messages/message-input";
import { ConversationHeader } from "@/components/conversations/conversation-header";
import { TypingIndicator } from "@/components/messages/typing-indicator";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConversationDetails = {
  otherParticipant: Profile;
  conversationId: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    async function loadConversationDetails() {
      if (!conversationId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        const { data: conversation, error: convError } = await supabase
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
          .eq('id', conversationId)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .single();

        if (convError || !conversation) {
          setError("You don't have access to this conversation");
          setIsLoading(false);
          return;
        }

        const otherParticipant = 
          conversation.participant1.id === user.id 
            ? conversation.participant2 
            : conversation.participant1;

        setConversationDetails({
          otherParticipant,
          conversationId: conversation.id
        });
        setIsLoading(false);

      } catch (err) {
        console.error('Error loading conversation:', err);
        setError("Failed to load conversation");
        setIsLoading(false);
      }
    }

    loadConversationDetails();
  }, [conversationId]);

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center space-y-4">
        <h1 className="text-xl font-semibold">Select a Conversation</h1>
        <p className="text-muted-foreground">
          {isMobile 
            ? "Tap the menu icon to choose a conversation" 
            : "Choose a conversation from the sidebar or start a new one"}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading conversation...</div>;
  }

  if (error || !conversationDetails) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error || "Conversation not found"}</div>;
  }

  return (
    <MessagesProvider conversationId={conversationDetails.conversationId}>
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="flex-none">
          <ConversationHeader 
            otherParticipant={conversationDetails.otherParticipant}
            isMobile={isMobile}
          />
        </div>
        
        {/* Messages */}
        <div className="flex-1 min-h-0">
          <MessageList />
        </div>
        
        {/* Typing Indicator & Input */}
        <div className="flex-none">
          <TypingIndicator 
            conversationId={conversationDetails.conversationId}
            otherUserId={conversationDetails.otherParticipant.id}
          />
          <MessageInput 
            conversationId={conversationDetails.conversationId}
            isMobile={isMobile}
          />
        </div>
      </div>
    </MessagesProvider>
  );
}