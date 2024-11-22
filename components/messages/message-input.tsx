import { useState, useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/components/providers/messages-provider";
import { createClient } from "@/lib/supabase/client";
import debounce from "lodash/debounce";
import { SendHorizontal } from "lucide-react";

type CharacterData = {
  char: string;
  timestamp: number;
};

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chars, setChars] = useState<CharacterData[]>([]);
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

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const newChars = newValue.split("").map((char, index) => {
      const existing = chars[index];
      return existing || { char, timestamp: Date.now() };
    });
    setChars(newChars);

    // Update typing status
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
    <div className="p-4 relative bg-black/10">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="heat-input-container flex-1">
          <input
            value={message}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg 
                     bg-black/20
                     border border-white/5 heat-input
                     focus:border-emerald-500/10
                     focus:shadow-[0_0_10px_rgba(16,185,129,0.05)]
                     focus:outline-none
                     transition-all duration-300"
          />
          <div className="heat-input-overlay flex items-center">
            {chars.length > 0 ? (
              chars.map((char, idx) => (
                <span key={idx}>{renderCharacter(char)}</span>
              ))
            ) : (
              <div className="flex-1 h-6 rounded-md overflow-hidden">
                <div
                  className="w-1/3 h-full animate-pulse-move"
                  style={{
                    background: `linear-gradient(
                      90deg,
                      transparent 0%,
                      rgba(0, 183, 255, 0.03) 25%,
                      rgba(0, 255, 179, 0.05) 50%,
                      rgba(0, 183, 255, 0.03) 75%,
                      transparent 100%
                    )`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="ml-2 p-2 rounded-full bg-black/20 
                   border border-white/5
                   hover:border-emerald-500/10
                   hover:shadow-[0_0_10px_rgba(16,185,129,0.05)]
                   transition-all duration-300"
        >
          <SendHorizontal className="w-5 h-5 text-white/50" />
        </button>
      </form>

      {isSending && (
        <div className="absolute bottom-full left-0 w-full p-2 text-center">
          <span className="text-sm text-emerald-500/50">Sending...</span>
        </div>
      )}
    </div>
  );
}