// components/providers/messages-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, Profile } from '@/lib/supabase/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

type MessageWithStatus = (Message & { 
  sender: Profile | null;
  status?: 'sending' | 'failed';
  tempId?: string;
});

type MessagesContextType = {
  messages: MessageWithStatus[];
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  retryMessage: (tempId: string) => Promise<void>;
  deleteFailedMessage: (tempId: string) => void;
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
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
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

    fetchMessages();

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
          if (payload.new.sender_id === currentUserId) return;

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

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: MessageWithStatus = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      conversation_id: conversationId,
      sender: null,
      status: 'sending',
      tempId
    };

    setMessages(prev => [...prev, optimisticMessage]);

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

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...newMessage, tempId: undefined, status: undefined } : msg
        )
      );

    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const retryMessage = async (tempId: string) => {
    const failedMessage = messages.find(msg => msg.tempId === tempId);
    if (!failedMessage) return;

    setMessages(prev => 
      prev.map(msg => 
        msg.tempId === tempId ? { ...msg, status: 'sending' } : msg
      )
    );

    try {
      const { data: newMessage, error: sendError } = await supabase
        .from('messages')
        .insert({
          content: failedMessage.content,
          conversation_id: failedMessage.conversation_id,
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

      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...newMessage, tempId: undefined, status: undefined } : msg
        )
      );

    } catch (err) {
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to retry sending message');
    }
  };

  const deleteFailedMessage = (tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
  };

  return (
    <MessagesContext.Provider
      value={{
        messages,
        sendMessage,
        retryMessage,
        deleteFailedMessage,
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