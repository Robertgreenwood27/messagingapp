// components/messages/message-input.tsx
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import debounce from 'lodash/debounce';

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendMessage } = useMessages();
  const supabase = createClient();

  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('typing_status')
      .upsert({
        user_id: user.id,
        conversation_id: conversationId,
        is_typing: isTyping
      }, {
        onConflict: 'user_id,conversation_id'
      });
  }, [conversationId]);

  const debouncedStopTyping = useCallback(
    debounce(() => updateTypingStatus(false), 1000),
    [updateTypingStatus]
  );

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    await updateTypingStatus(true);
    debouncedStopTyping();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await updateTypingStatus(false);
      debouncedStopTyping.cancel();
      await sendMessage(message, conversationId);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    return () => {
      debouncedStopTyping.cancel();
      updateTypingStatus(false);
    };
  }, [debouncedStopTyping, updateTypingStatus]);

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1"
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}