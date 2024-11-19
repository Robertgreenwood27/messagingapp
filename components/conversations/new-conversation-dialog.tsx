// components/conversations/new-conversation-dialog.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus } from "lucide-react";

export function NewConversationDialog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Search by username or email with case-insensitive match
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

      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${profile.id}),and(participant1_id.eq.${profile.id},participant2_id.eq.${user.id})`)
        .single();

      if (existingConv) {
        router.push(`/chat?conversation=${existingConv.id}`);
        return;
      }

      // Create new conversation
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
        <Button variant="ghost" size="icon">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Enter username or email to start a conversation
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Start Conversation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
