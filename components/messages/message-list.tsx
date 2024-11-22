// components/messages/message-list.tsx
import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import { MessageSkeleton } from "./message-skeleton";
import { MessageBubble } from "./message-bubble";

export function MessageList() {
  const { messages, isLoading, error, retryMessage, deleteFailedMessage, deleteMessage } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageAges, setMessageAges] = useState<Map<string, number>>(new Map());
  const supabase = createClient();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    const messageTimestamps = new Map();
    messages.forEach(msg => {
      messageTimestamps.set(msg.id, Date.now() - new Date(msg.created_at).getTime());
    });
    setMessageAges(messageTimestamps);

    const interval = setInterval(() => {
      setMessageAges(new Map(messageTimestamps));
    }, 50);

    return () => clearInterval(interval);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8">
          <MessageSkeleton align="start" />
          <MessageSkeleton align="end" />
          <MessageSkeleton align="start" />
          <MessageSkeleton align="end" />
          <MessageSkeleton align="start" />
        </div>
      </ScrollArea>
    );
  }

  if (error) return (
    <div className="flex-1 p-4 text-red-500/70 bg-red-500/5 border border-red-500/10">
      Error: {error}
    </div>
  );

  let lastMessageDate: string | null = null;

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4" ref={scrollRef}>
        {messages.map((message) => {
          const messageDate = new Date(message.created_at);
          const messageDateStr = format(messageDate, 'yyyy-MM-dd');
          const showDateDivider = lastMessageDate !== messageDateStr;
          
          if (showDateDivider) {
            lastMessageDate = messageDateStr;
          }
          
          return (
            <div key={message.id} className="relative">
              {showDateDivider && (
                <div className="flex items-center justify-center my-6">
                  <div className="bg-black/20 border border-white/5 px-3 py-1 rounded-full text-xs text-white/50">
                    {isToday(messageDate)
                      ? 'Today'
                      : isYesterday(messageDate)
                      ? 'Yesterday'
                      : format(messageDate, 'MMMM d, yyyy')}
                  </div>
                </div>
              )}
              <MessageBubble
                message={message}
                isCurrentUser={message.sender_id === currentUserId}
                age={messageAges.get(message.id) || 0}
                onRetry={retryMessage}
                onDelete={deleteMessage}
                onDeleteFailed={deleteFailedMessage}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}