"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, Profile } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Extend the Message type
interface MessageWithDeletedAt extends Message {
  deleted_at?: string | null;
}

// Update MessageWithStatus
type MessageWithStatus = MessageWithDeletedAt & {
  sender: Profile | null;
  status?: 'sending' | 'failed';
  tempId?: string;
};

type MessagesContextType = {
  messages: MessageWithStatus[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  retryMessage: (tempId: string) => Promise<void>;
  deleteFailedMessage: (tempId: string) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const MessagesContext = createContext<MessagesContextType | undefined>(
  undefined
);

export function MessagesProvider({
  children,
  conversationId,
}: {
  children: React.ReactNode;
  conversationId: string;
}) {
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    setIsLoading(true);
    setError(null);

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on<MessageWithDeletedAt>(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and UPDATE
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageWithDeletedAt>) => {
          if (
            payload.eventType === 'INSERT' &&
            payload.new.sender_id === currentUserId
          ) {
            // Ignore messages sent by the current user
            return;
          }

          if (payload.eventType === 'UPDATE' && payload.new.deleted_at) {
            // Handle message deletion
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.new.id)
            );
            return;
          }

          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(
              `
              id,
              content,
              created_at,
              deleted_at,
              sender_id,
              conversation_id,
              sender:profiles(*)
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (!error && newMessage && !newMessage.deleted_at) {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMessage.id);
              if (exists) {
                return prev.map((msg) =>
                  msg.id === newMessage.id ? newMessage : msg
                );
              }
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    async function fetchMessages() {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(
          `
          id,
          content,
          created_at,
          deleted_at,
          sender_id,
          conversation_id,
          sender:profiles(*)
        `
        )
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (messagesError) {
        setError(messagesError.message);
        setIsLoading(false);
        return;
      }

      setMessages(messagesData || []);
      setIsLoading(false);
    }

    fetchMessages();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUserId, supabase]);

  // ... rest of your code (sendMessage, retryMessage, etc.)

  return (
    <MessagesContext.Provider
      value={{
        messages,
        sendMessage,
        retryMessage,
        deleteFailedMessage,
        deleteMessage,
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
