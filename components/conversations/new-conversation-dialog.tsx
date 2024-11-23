import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus } from "lucide-react";

export function NewConversationDialog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chars, setChars] = useState<Array<{ char: string; timestamp: number }>>([]);
  const router = useRouter();
  const supabase = createClient();
  const refreshInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    refreshInterval.current = setInterval(() => {
      setChars((current) => [...current]); // Force refresh
    }, 50);

    return () => clearInterval(refreshInterval.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    const newChars = newValue.split('').map((char, index) => {
      const existing = chars[index];
      return existing || { char, timestamp: Date.now() };
    });
    setChars(newChars);
  };

  const renderCharacter = (charData: { char: string; timestamp: number }, index: number) => {
    const age = Date.now() - charData.timestamp;
    const maxAge = 5000;
    const progress = Math.min(age / maxAge, 1);
    
    let color;
    if (progress < 0.5) {
      const t = progress * 2;
      color = `rgb(255, ${Math.floor(70 + 130 * t)}, ${Math.floor(50 * t)})`;
    } else {
      const t = (progress - 0.5) * 2;
      color = `rgb(${Math.floor(255 * (1 - t))}, ${Math.floor(200 * (1 - t))}, ${Math.floor(255 * t)})`;
    }

    return (
      <span
        key={index}
        style={{
          color,
          transition: "color 50ms linear",
          textShadow: progress < 0.3 ? "0 0 5px rgba(255,50,50,0.3)" : "none"
        }}
      >
        {charData.char}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: searchError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', user.id)
        .single();

      if (searchError || !profile) {
        setError('User not found. Please check the username or email and try again.');
        setLoading(false);
        return;
      }

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${profile.id}),and(participant1_id.eq.${profile.id},participant2_id.eq.${user.id})`)
        .single();

      if (existingConv) {
        router.push(`/chat?conversation=${existingConv.id}`);
        return;
      }

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participant1_id: user.id,
          participant2_id: profile.id
        }])
        .select()
        .single();

      if (createError) throw createError;
      router.push(`/chat?conversation=${newConv.id}`);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 w-9 p-0 hover:bg-black/20 hover:shadow-[0_0_10px_rgba(16,185,129,0.05)]"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-white/70">New Conversation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="heat-input-container">
            <input
              value={searchTerm}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg 
                       bg-black/20 border border-white/5
                       focus:border-emerald-500/10
                       focus:shadow-[0_0_10px_rgba(16,185,129,0.05)]
                       focus:outline-none heat-input
                       transition-all duration-300"
            />
            <div className="heat-input-overlay flex items-center">
              {chars.length > 0 ? (
                chars.map((char, idx) => renderCharacter(char, idx))
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
                      )`
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500/70 bg-red-500/5 p-2 rounded border border-red-500/10">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-black/20 border border-white/5
                     hover:bg-black/30 hover:border-emerald-500/10
                     hover:shadow-[0_0_10px_rgba(16,185,129,0.05)]
                     transition-all duration-300"
          >
            {loading ? 'Creating...' : 'Start Conversation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}