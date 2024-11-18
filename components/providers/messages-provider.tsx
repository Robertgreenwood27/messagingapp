// components/providers/messages-provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, Profile } from '@/lib/supabase/database.types';

type MessagesContextType = {
  messages: (Message & { sender: Profile | null })[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({
  children,
  conversationId,
}: {
  children: React.ReactNode;
  conversationId: string;
}) {
  const [messages, setMessages] = useState<(Message & { sender: Profile | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setMessages(data || []);
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const sendMessage = async (content: string, conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError('User must be authenticated to send messages');
      return;
    }

    const { error: sendError } = await supabase
      .from('messages')
      .insert({
        content,
        conversation_id: conversationId,
        sender_id: user.id,
      });

    if (sendError) {
      setError(sendError.message);
    }
  };

  return (
    <MessagesContext.Provider
      value={{
        messages,
        sendMessage,
        isLoading,
        error,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};