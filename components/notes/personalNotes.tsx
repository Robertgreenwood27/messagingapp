import React, { useState, useEffect } from 'react';
import { Pencil, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

const PersonalNotes = () => {
  const [notes, setNotes] = useState('');
  const [chars, setChars] = useState<Array<{ char: string; timestamp: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Load notes from Supabase on component mount
    const loadNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('personal_notes')
        .select('content')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading notes:', error);
        return;
      }

      if (data?.content) {
        const now = Date.now();
        // Load all text as hot
        setNotes(data.content);
        setChars(
          data.content.split('').map((char: string) => ({
            char,
            timestamp: now,
          }))
        );
      } else {
        setNotes('');
        setChars([]);
      }
    };

    loadNotes();
  }, [supabase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setChars((current) => [...current]); // Force refresh for heat effect
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const now = Date.now();
    setNotes(newValue);
    setHasChanges(true);

    setChars((prevChars) => {
      const newChars = [];
      for (let i = 0; i < newValue.length; i++) {
        const char = newValue[i];
        const prevCharData = prevChars[i];
        if (prevCharData && prevCharData.char === char) {
          newChars.push(prevCharData);
        } else {
          newChars.push({ char, timestamp: now });
        }
      }
      return newChars;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use upsert to update or insert the note
      const { error } = await supabase
        .from('personal_notes')
        .upsert(
          {
            user_id: user.id,
            content: notes,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        console.error('Error saving notes:', error);
      } else {
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderCharacter = (
    charData: { char: string; timestamp: number },
    index: number
  ) => {
    const age = Date.now() - charData.timestamp;
    const maxAge = 8000; // Extend maxAge for a longer cooling effect
    const progress = Math.min(age / maxAge, 1);

    const t = progress * 3; // t ranges from 0 to 3

    let color;

    if (t < 1) {
      // Phase 1: Red to Yellow
      const g = Math.floor(70 + 185 * t); // 70 to 255
      color = `rgb(255, ${g}, 0)`;
    } else if (t < 2) {
      // Phase 2: Yellow to Blue
      const t2 = t - 1;
      const r = Math.floor(255 * (1 - t2)); // 255 to 0
      const g = Math.floor(255 * (1 - t2)); // 255 to 0
      const b = Math.floor(255 * t2); // 0 to 255
      color = `rgb(${r}, ${g}, ${b})`;
    } else {
      // Phase 3: Blue to White
      const t3 = t - 2;
      const r = Math.floor(255 * t3); // 0 to 255
      const g = Math.floor(255 * t3); // 0 to 255
      color = `rgb(${r}, ${g}, 255)`;
    }

    // Optional text shadow adjustment
    const shadowOpacity = Math.max(0.3 * (1 - progress), 0);
    const textShadow =
      shadowOpacity > 0 ? `0 0 5px rgba(255,50,50,${shadowOpacity})` : 'none';

    return (
      <span
        key={index}
        style={{
          color,
          transition: 'color 50ms linear',
          textShadow,
          whiteSpace: 'pre-wrap',
        }}
      >
        {charData.char}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="relative border-b border-white/5 overflow-hidden">
        <div className="relative flex items-center justify-between p-4 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-white/50">
              {isSaving
                ? 'Saving...'
                : hasChanges
                ? 'Unsaved changes'
                : 'All changes saved'}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            variant="ghost"
            size="icon" // This is now accepted after updating Button component
            className={`
              transition-all duration-300
              ${
                hasChanges
                  ? 'text-orange-400 hover:text-orange-300'
                  : 'text-white/30'
              }
              ${
                hasChanges
                  ? 'hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                  : ''
              }
            `}
          >
            <Save className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="heat-input-container min-h-full relative">
          <textarea
            value={notes}
            onChange={handleChange}
            className="w-full h-full min-h-[500px] p-4 rounded-lg
                     bg-black/20 border border-white/5 heat-input
                     focus:border-emerald-500/10
                     focus:shadow-[0_0_10px_rgba(16,185,129,0.05)]
                     focus:outline-none resize-none
                     transition-all duration-300
                     relative z-10
                     text-transparent caret-white"
            placeholder=""
          />
          <div className="heat-input-overlay absolute top-0 left-0 w-full h-full p-4">
            {chars.map((charData, idx) => renderCharacter(charData, idx))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PersonalNotes;
