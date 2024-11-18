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

// Main chat page component
export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSingleUser, setIsSingleUser] = useState(false);

  useEffect(() => {
    async function initializeConversation() {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        // Get or verify profile exists (don't try to create it)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError("Failed to load profile");
          setIsLoading(false);
          return;
        }

        // Count total users to check if we're the only one
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!countError && count === 1) {
          setIsSingleUser(true);
          setIsLoading(false);
          return;
        }

        // Try to find existing conversation
        const { data: existingConversations, error: conversationError } = await supabase
          .from('conversations')
          .select(`
            *,
            participant1:profiles!conversations_participant1_id_fkey (
              id,
              username,
              avatar_url
            ),
            participant2:profiles!conversations_participant2_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (conversationError) {
          console.error('Error fetching conversations:', conversationError);
          setError("Failed to load conversations");
          setIsLoading(false);
          return;
        }

        if (existingConversations && existingConversations.length > 0) {
          setConversationId(existingConversations[0].id);
          setIsLoading(false);
          return;
        }

        // Find another user to chat with
        const { data: otherUsers, error: otherUsersError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id)
          .limit(1);

        if (otherUsersError || !otherUsers || otherUsers.length === 0) {
          setIsSingleUser(true);
          setIsLoading(false);
          return;
        }

        // Create new conversation with other user
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: otherUsers[0].id
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          setError("Failed to create conversation");
          setIsLoading(false);
          return;
        }

        setConversationId(newConversation.id);
        setIsLoading(false);

      } catch (error) {
        console.error('Conversation initialization error:', error);
        setError("Something went wrong");
        setIsLoading(false);
      }
    }

    initializeConversation();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading conversation...</div>;
  }

  if (isSingleUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center space-y-4">
        <h1 className="text-xl font-semibold">Welcome to the Chat App!</h1>
        <p className="text-muted-foreground">
          You're currently the only user in the system. 
          Invite others to join so you can start chatting!
        </p>
        <p className="text-sm text-muted-foreground">
          Share the signup link with others to get started.
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  }

  if (!conversationId) {
    return <div className="flex items-center justify-center h-screen">No conversation available</div>;
  }

  return (
    <MessagesProvider conversationId={conversationId}>
      <div className="flex flex-col h-screen">
        <header className="border-b p-4 flex items-center gap-3">
          <Avatar>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold">Chat</h1>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </header>

        <MessageList />
        <MessageInput conversationId={conversationId} />
      </div>
    </MessagesProvider>
  );
}
