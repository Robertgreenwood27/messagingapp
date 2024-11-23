// components/messages/message-input.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import debounce from "lodash/debounce";
import { SendHorizontal } from "lucide-react";

type CharacterData = {
  char: string;
  timestamp: number;
};

export function MessageInput({ 
  conversationId,
  isMobile 
}: { 
  conversationId: string;
  isMobile?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chars, setChars] = useState<CharacterData[]>([]);
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useMessages();
  const supabase = createClient();
  const refreshInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    refreshInterval.current = setInterval(() => {
      setChars((current) => [...current]); // Force refresh
    }, 50);

    return () => clearInterval(refreshInterval.current);
  }, []);

  const updateTypingStatus = useCallback(
    async (isTyping: boolean) => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        return;
      }
      if (!user) return;

      const { error: upsertError } = await supabase
        .from("typing_status")
        .upsert(
          {
            user_id: user.id,
            conversation_id: conversationId,
            is_typing: isTyping,
          },
          {
            onConflict: "user_id,conversation_id",
          }
        );

      if (upsertError) {
        console.error("Error updating typing status:", upsertError);
      }
    },
    [conversationId]
  );

  const debouncedStopTyping = useCallback(
    debounce(() => updateTypingStatus(false), 1000),
    [updateTypingStatus]
  );

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
      setRows(Math.ceil(newHeight / 24));
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const newChars = newValue.split("").map((char, index) => {
      const existing = chars[index];
      return existing || { char, timestamp: Date.now() };
    });
    setChars(newChars);

    await updateTypingStatus(true);
    debouncedStopTyping();
    adjustTextareaHeight();
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await updateTypingStatus(false);
      debouncedStopTyping.cancel();
      await sendMessage(message, conversationId);
      setMessage("");
      setChars([]);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const renderCharacter = (charData: CharacterData) => {
    const age = Date.now() - charData.timestamp;
    const maxAge = 5000; // 5 seconds to cool
    const progress = Math.min(age / maxAge, 1);

    let color;
    if (progress < 0.33) {
      // Hot to warm (deeper red to orange-yellow)
      const t = progress * 3;
      color = `rgb(255, ${Math.floor(70 + 130 * t)}, ${Math.floor(50 * t)})`;
    } else if (progress < 0.67) {
      // Warm to cool (orange-yellow to cyan)
      const t = (progress - 0.33) * 3;
      color = `rgb(${Math.floor(255 * (1 - t))}, ${Math.floor(200 * (1 - t))}, ${Math.floor(255 * t)})`;
    } else {
      // Cyan to white
      const t = (progress - 0.67) * 3;
      color = `rgb(${Math.floor(0 + 255 * t)}, ${Math.floor(183 + 72 * t)}, ${Math.floor(255)})`;
    }

    return (
      <span
        style={{
          color,
          transition: "color 50ms linear",
          textShadow:
            progress < 0.3 ? "0 0 5px rgba(255,50,50,0.3)" : "none",
        }}
      >
        {charData.char}
      </span>
    );
  };

  useEffect(() => {
    return () => {
      debouncedStopTyping.cancel();
      updateTypingStatus(false);
    };
  }, [debouncedStopTyping, updateTypingStatus]);

  return (
    <div className={`
      sticky bottom-0 left-0 right-0
      bg-black border-t border-white/20
      ${isMobile ? 'p-2' : 'p-4'}
    `}>
      {isSending && (
        <div className="absolute -top-8 left-0 w-full p-2 text-center">
          <span className="text-sm text-emerald-500/70 
                         bg-black/40 px-3 py-1 rounded-full
                         border border-emerald-500/20">
            Sending...
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-end max-w-full gap-2">
        <div className="heat-input-container flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            rows={1}
            className={`
              w-full rounded-lg 
              bg-white/5 
              border-2 border-white/20
              focus:border-emerald-500/30
              focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]
              focus:bg-white/10
              focus:outline-none heat-input
              placeholder-white/30
              transition-all duration-300
              text-base
              resize-none
              overflow-hidden
              ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3'}
            `}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className={`
            heat-input-overlay flex items-center
            ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3'}
            whitespace-pre-wrap break-words
          `}>
            {chars.map((char, idx) => (
              <span key={idx}>{renderCharacter(char)}</span>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSending}
          className={`
            flex-none rounded-lg
            bg-white/5 
            border-2 border-white/20
            hover:bg-emerald-500/10
            hover:border-emerald-500/30
            hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]
            active:transform active:scale-95
            disabled:opacity-50
            transition-all duration-300
            ${isMobile ? 'p-2.5' : 'p-3'}
            mb-[1px]
          `}
        >
          <SendHorizontal className={`
            ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}
            ${isSending ? 'text-white/30' : 'text-emerald-500/80'}
          `} />
        </button>
      </form>
    </div>
  );
}
