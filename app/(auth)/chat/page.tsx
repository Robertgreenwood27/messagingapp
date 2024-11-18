// app/(auth)/chat/page.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessagesProvider, useMessages } from "@/components/providers/messages-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import type { Profile } from "@/lib/supabase/database.types";

// Message input component (internal to page)
function MessageInput({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState("");
  const { sendMessage } = useMessages();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(message, conversationId);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}

// Message list component (internal to page)
function MessageList() {
  const { messages, isLoading, error } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) return <div className="flex-1 p-4">Loading messages...</div>;
  if (error) return <div className="flex-1 p-4 text-red-500">Error: {error}</div>;

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <Card
            key={message.id}
            className={`max-w-[80%] p-3 ${
              message.sender?.id === "currentUserId" // We'll replace this with actual user ID later
                ? "ml-auto bg-primary text-primary-foreground"
                : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={message.sender?.avatar_url || undefined} />
                <AvatarFallback>
                  {message.sender?.username?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p>{message.content}</p>
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

type ConversationDetails = {
  otherParticipant: Profile;
  conversationId: string;
};

// Conversation header component
function ConversationHeader({ otherParticipant }: { otherParticipant: Profile }) {
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

// Main chat page component
export default function ChatPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch conversation with participants
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
          .single();

        if (convError || !conversation) {
          setError("Conversation not found");
          setIsLoading(false);
          return;
        }

        // Determine the other participant
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
          Choose a conversation from the sidebar or start a new one.
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
      <div className="flex flex-col h-screen">
        <ConversationHeader otherParticipant={conversationDetails.otherParticipant} />
        <MessageList />
        <MessageInput conversationId={conversationDetails.conversationId} />
      </div>
    </MessagesProvider>
  );
}