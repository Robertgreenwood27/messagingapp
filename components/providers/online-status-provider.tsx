// components/providers/online-status-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OnlineStatus } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import debounce from 'lodash/debounce';

type OnlineStatusContextType = {
  onlineUsers: Map<string, OnlineStatus>;
  isOnline: (userId: string) => boolean;
};

interface RealtimeOnlineStatus {
  id: string;
  user_id: string;
  last_seen: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

// Type guard for RealtimeOnlineStatus
function isRealtimeOnlineStatus(value: unknown): value is RealtimeOnlineStatus {
  return (
    typeof value === 'object' &&
    value !== null &&
    'user_id' in value &&
    'last_seen' in value &&
    'is_online' in value
  );
}

const ONLINE_THRESHOLD = 30 * 1000; // 30 seconds in milliseconds

const OnlineStatusContext = createContext<OnlineStatusContextType>({
  onlineUsers: new Map(),
  isOnline: () => false,
});

export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
};

export function OnlineStatusProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineStatus>>(new Map());
  const supabase = createClient();

  const isOnline = (userId: string) => {
    const status = onlineUsers.get(userId);
    if (!status) return false;
    
    const lastSeenTime = new Date(status.last_seen).getTime();
    const now = new Date().getTime();
    
    return status.is_online && (now - lastSeenTime) < ONLINE_THRESHOLD;
  };

  // Update user's online status
  const updateUserStatus = async (userId: string, isOnline: boolean) => {
    try {
      // First check if a status exists
      const { data: existingStatus } = await supabase
        .from('online_status')
        .select()
        .eq('user_id', userId)
        .single();

      if (existingStatus) {
        // Update existing status
        const { error } = await supabase
          .from('online_status')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating online status:', error);
        }
      } else {
        // Insert new status
        const { error } = await supabase
          .from('online_status')
          .insert({
            user_id: userId,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          });

        if (error) {
          console.error('Error inserting online status:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
    }
  };

  // Debounced version of updateUserStatus to prevent too many updates
  const debouncedUpdateStatus = debounce(updateUserStatus, 1000);

  useEffect(() => {
    let userStatusInterval: NodeJS.Timeout;
    let userId: string | null = null;

    const setupOnlineStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userId = user.id;

      // Set initial online status
      await updateUserStatus(user.id, true);

      // Update online status periodically
      userStatusInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          debouncedUpdateStatus(user.id, true);
        }
      }, 15000); // Every 15 seconds

      // Handle visibility change
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'hidden') {
          // Cancel any pending debounced updates
          debouncedUpdateStatus.cancel();
          // Immediately set offline when tab becomes hidden
          await updateUserStatus(user.id, false);
        } else if (document.visibilityState === 'visible') {
          // Set online when tab becomes visible
          await updateUserStatus(user.id, true);
        }
      };

      // Handle tab/window focus changes
      const handleFocusChange = async (isOnline: boolean) => {
        if (user.id) {
          // Cancel any pending debounced updates
          debouncedUpdateStatus.cancel();
          await updateUserStatus(user.id, isOnline);
        }
      };

      // Subscribe to online status changes
      const subscription = supabase
        .channel('online-users')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'online_status'
          },
          (payload: RealtimePostgresChangesPayload<{}>) => {
            setOnlineUsers(prevUsers => {
              const newUsers = new Map(prevUsers);
              if (payload.new && isRealtimeOnlineStatus(payload.new)) {
                newUsers.set(payload.new.user_id, payload.new);
              }
              return newUsers;
            });
          }
        )
        .subscribe();

      // Fetch initial online status for all users
      const { data: initialStatus } = await supabase
        .from('online_status')
        .select('*')
        .order('last_seen', { ascending: false });

      if (initialStatus) {
        const statusMap = new Map();
        initialStatus.forEach((status) => {
          if (isRealtimeOnlineStatus(status)) {
            statusMap.set(status.user_id, status);
          }
        });
        setOnlineUsers(statusMap);
      }

      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', () => handleFocusChange(true));
      window.addEventListener('blur', () => handleFocusChange(false));
      window.addEventListener('beforeunload', () => handleFocusChange(false));

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', () => handleFocusChange(true));
        window.removeEventListener('blur', () => handleFocusChange(false));
        window.removeEventListener('beforeunload', () => handleFocusChange(false));
        subscription.unsubscribe();
        clearInterval(userStatusInterval);
        if (userId) {
          updateUserStatus(userId, false);
        }
      };
    };

    setupOnlineStatus();

    return () => {
      if (userStatusInterval) {
        clearInterval(userStatusInterval);
      }
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ onlineUsers, isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}