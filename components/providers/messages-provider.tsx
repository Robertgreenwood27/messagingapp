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

// Base message type with deleted_at
interface MessageWithDeletedAt extends Omit<Message, 'sender'> {
  deleted_at?: string | null;
  sender?: Profile;
}

// Message type with status for UI
interface MessageWithStatus extends MessageWithDeletedAt {
  status?: 'sending' | 'failed';
  tempId?: string;
}

// Raw database response type (separate from inheritance chain)
interface MessageResponse {
  id: string;
  content: string;
  created_at: string;
  deleted_at?: string | null;
  sender_id: string;
  conversation_id: string;
  sender: Profile[] | Profile | null;
}

// Type guard function
function isMessageWithDeletedAt(record: unknown): record is MessageWithDeletedAt {
  return (
    typeof record === 'object' &&
    record !== null &&
    'id' in record &&
    typeof (record as { id: unknown }).id === 'string'
  );
}

// Helper function to process message response
function processMessageResponse(message: MessageResponse): MessageWithStatus {
  return {
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    deleted_at: message.deleted_at,
    sender_id: message.sender_id,
    conversation_id: message.conversation_id,
    sender: Array.isArray(message.sender) 
      ? message.sender[0] || undefined 
      : message.sender || undefined
  };
}

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
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageWithDeletedAt>) => {
          if (
            payload.eventType === 'INSERT' &&
            isMessageWithDeletedAt(payload.new) &&
            payload.new.sender_id === currentUserId
          ) {
            return;
          }

          if (
            payload.eventType === 'UPDATE' &&
            isMessageWithDeletedAt(payload.new) &&
            payload.new.deleted_at
          ) {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.new.id)
            );
            return;
          }

          if (isMessageWithDeletedAt(payload.new)) {
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
                sender:profiles!sender_id(*)
              `
              )
              .eq('id', payload.new.id)
              .single();

            if (!error && newMessage && !newMessage.deleted_at) {
              const processedMessage = processMessageResponse(newMessage as MessageResponse);
              
              setMessages((prev) => {
                const exists = prev.some((msg) => msg.id === processedMessage.id);
                if (exists) {
                  return prev.map((msg) =>
                    msg.id === processedMessage.id ? processedMessage : msg
                  );
                }
                return [...prev, processedMessage];
              });
            }
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
          sender:profiles!sender_id(*)
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

      const processedMessages = (messagesData || []).map((message) => 
        processMessageResponse(message as MessageResponse)
      );

      setMessages(processedMessages);
      setIsLoading(false);
    }

    fetchMessages();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUserId, supabase]);

  async function sendMessage(content: string, conversationId: string) {
    if (!currentUserId) {
      setError('User not authenticated');
      return;
    }

    const tempId = `${currentUserId}-${Date.now()}`;

    const newMessage: MessageWithStatus = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      deleted_at: null,
      sender_id: currentUserId,
      conversation_id: conversationId,
      sender: undefined,
      status: 'sending',
      tempId,
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    const { data: rawData, error } = await supabase
      .from('messages')
      .insert({
        content,
        conversation_id: conversationId,
        sender_id: currentUserId,
      })
      .select(
        `
        id,
        content,
        created_at,
        deleted_at,
        sender_id,
        conversation_id,
        sender:profiles!sender_id(*)
      `
      )
      .single();

    if (error) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      setError('Failed to send message');
    } else if (rawData) {
      const processedMessage = processMessageResponse(rawData as MessageResponse);
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.tempId === tempId ? processedMessage : msg))
      );
    }
  }

  async function retryMessage(tempId: string) {
    const messageToRetry = messages.find((msg) => msg.tempId === tempId);

    if (!messageToRetry) {
      setError('Message not found for retry');
      return;
    }

    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg.tempId !== tempId)
    );

    await sendMessage(messageToRetry.content, messageToRetry.conversation_id);
  }

  function deleteFailedMessage(tempId: string) {
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg.tempId !== tempId)
    );
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      setError('Failed to delete message');
    } else {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    }
  }

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