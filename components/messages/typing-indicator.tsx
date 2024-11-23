import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TypingStatus, Profile } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TypingStatusWithUser = TypingStatus & {
  user: Profile | null;
};

type PostgresChanges = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
  id: string;
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  updated_at: string;
}>;

export function TypingIndicator({
  conversationId,
  otherUserId,
}: {
  conversationId: string;
  otherUserId: string;
}) {
  const [typingStatus, setTypingStatus] = useState<TypingStatusWithUser | null>(null);
  const animationRef = useRef<number>();
  const [dots, setDots] = useState([
    { phase: 0, colorPhase: 0 },
    { phase: 2, colorPhase: 0.3 },
    { phase: 4, colorPhase: 0.6 },
  ]);
  const supabase = createClient();

  const getGradient = (colorPhase: number) => {
    const colors = {
      hot: { r: 255, g: 70, b: 0 },
      warm: { r: 255, g: 200, b: 50 },
      cold: { r: 0, g: 100, b: 255 },
    };

    let color;
    if (colorPhase < 0.5) {
      const t = colorPhase * 2;
      color = {
        r: colors.hot.r + (colors.warm.r - colors.hot.r) * t,
        g: colors.hot.g + (colors.warm.g - colors.hot.g) * t,
        b: colors.hot.b + (colors.warm.b - colors.hot.b) * t,
      };
    } else {
      const t = (colorPhase - 0.5) * 2;
      color = {
        r: colors.warm.r + (colors.cold.r - colors.warm.r) * t,
        g: colors.warm.g + (colors.cold.g - colors.warm.g) * t,
        b: colors.warm.b + (colors.cold.b - colors.warm.b) * t,
      };
    }

    return {
      base: `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.15)`,
      glow: `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.4)`,
    };
  };

  useEffect(() => {
    const animate = () => {
      setDots((dots) =>
        dots.map((dot) => {
          const newPhase = (dot.phase + 0.03) % (Math.PI * 2);
          const newColorPhase = (dot.colorPhase + 0.005) % 1;
          return { phase: newPhase, colorPhase: newColorPhase };
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    if (typingStatus?.is_typing) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [typingStatus?.is_typing]);

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

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: PostgresChanges) => {
          if (payload.new && 'user_id' in payload.new && payload.new.user_id === otherUserId) {
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
      channel.unsubscribe();
    };
  }, [conversationId, otherUserId, supabase]);

  if (!typingStatus?.is_typing) return null;

  return (
    <div className="p-3 flex items-center">
      <div className="flex gap-1.5">
        {dots.map((dot, i) => {
          const colors = getGradient(dot.colorPhase);
          return (
            <div
              key={i}
              className="relative w-2 h-2"
              style={{
                transform: `translateY(${Math.sin(dot.phase) * 3}px)`,
                transition: 'transform 0.05s ease-out',
              }}
            >
              <div
                className="absolute inset-0 rounded-full blur-[3px]"
                style={{
                  backgroundColor: colors.glow,
                  transform: `scale(${1 + Math.sin(dot.phase) * 0.2})`,
                  opacity: 0.5 + Math.sin(dot.phase) * 0.2,
                  mixBlendMode: 'screen',
                }}
              />
              <div
                className="absolute inset-0 rounded-full blur-sm"
                style={{
                  backgroundColor: colors.base,
                  opacity: 0.3,
                  mixBlendMode: 'screen',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
