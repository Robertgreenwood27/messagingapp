// components/messages/typing-indicator.tsx
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TypingStatus, Profile } from '@/lib/supabase/database.types';

type TypingStatusWithUser = TypingStatus & {
  user: Profile | null;
}

export function TypingIndicator({ 
  conversationId, 
  otherUserId 
}: { 
  conversationId: string;
  otherUserId: string;
}) {
  const [typingStatus, setTypingStatus] = useState<TypingStatusWithUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchTypingStatus = async () => {
      const { data } = await supabase
        .from('typing_status')
        .select('*, user:profiles(*)')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId)
        .single();
      
      if (data) {
        setTypingStatus(data);
      }
    };

    fetchTypingStatus();

    const subscription = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.new && payload.new.user_id === otherUserId) {
            const { data: typingData } = await supabase
              .from('typing_status')
              .select('*, user:profiles(*)')
              .eq('id', payload.new.id)
              .single();
            
            if (typingData) {
              setTypingStatus(typingData);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, otherUserId, supabase]);

  if (!typingStatus?.is_typing) return null;

  return (
    <div className="px-4 py-2 border-t flex items-center gap-1">
      <div className="text-sm text-muted-foreground">
        {typingStatus.user?.username} is typing
      </div>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
      </div>
    </div>
  );
}