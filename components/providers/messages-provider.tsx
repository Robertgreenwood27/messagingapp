// components/providers/messages-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, Profile } from '@/lib/supabase/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    setIsLoading(true);
    setError(null);

    let subscription: RealtimeChannel;

    async function fetchMessages() {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          conversation_id,
          sender:profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        setError(messagesError.message);
        setIsLoading(false);
        return;
      }

      setMessages(messagesData || []);
      setIsLoading(false);
    }

    // Initial fetch
    fetchMessages();

    // Set up real-time subscription
    subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // If the message is from the current user, ignore it as it's already in the state
          if (payload.new.sender_id === currentUserId) return;

          // Fetch the complete message with sender info
          supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender_id,
              conversation_id,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data: newMessage, error }) => {
              if (!error && newMessage) {
                setMessages((prev) => [...prev, newMessage]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  const sendMessage = async (content: string, conversationId: string) => {
    if (!currentUserId) {
      setError('Must be authenticated to send messages');
      return;
    }

    try {
      const { data: newMessage, error: sendError } = await supabase
        .from('messages')
        .insert({
          content,
          conversation_id: conversationId,
          sender_id: currentUserId,
        })
        .select(`
          id,
          content,
          created_at,
          sender_id,
          conversation_id,
          sender:profiles(*)
        `)
        .single();

      if (sendError) throw sendError;

      // Optimistically add the new message to the state
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
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