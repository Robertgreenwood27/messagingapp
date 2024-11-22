// tests/integration/conversations.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConversationList } from '@/components/conversations/conversation-list';

// Mock online status hook
vi.mock('@/components/providers/online-status-provider', () => ({
  useOnlineStatus: () => ({
    onlineUsers: new Map([['other-user-id', { is_online: true }]]),
  }),
}));

// Mock `useSupabaseClient` and `useUser`
const mockClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  channel: vi.fn(),
};

vi.mock('@supabase/auth-helpers-react', () => ({
  useSupabaseClient: () => mockClient,
  useUser: () => ({ id: 'test-user-id' }),
}));

// Create a function to create a mock query builder
const createMockQueryBuilder = (response: any) => {
  const builder = {
    select(selection: any) {
      console.log('select called with:', selection);
      return this;
    },
    or(condition: any) {
      console.log('or called with:', condition);
      return this;
    },
    eq(column: any, value: any) {
      console.log('eq called with:', column, value);
      return this;
    },
    order(column: any, options: any) {
      console.log('order called with:', column, options);
      return Promise.resolve(response);
    },
    limit(count: any) {
      console.log('limit called with:', count);
      return this;
    },
    maybeSingle() {
      console.log('maybeSingle called');
      return Promise.resolve(response);
    },
  };
  return builder;
};

describe('ConversationList', () => {
  it('loads conversations', async () => {
    // Mock auth
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Mock `from` method
    mockClient.from.mockImplementation((tableName: string) => {
      if (tableName === 'conversations') {
        return createMockQueryBuilder({
          data: [
            {
              id: 'conv1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              participant1_id: 'test-user-id',
              participant2_id: 'other-user-id',
              participant1: {
                id: 'test-user-id',
                username: 'testuser',
                avatar_url: null,
                updated_at: new Date().toISOString(),
              },
              participant2: {
                id: 'other-user-id',
                username: 'otheruser',
                avatar_url: null,
                updated_at: new Date().toISOString(),
              },
            },
          ],
          error: null,
        });
      } else if (tableName === 'messages') {
        return createMockQueryBuilder({
          data: {
            id: 'message1',
            content: 'Hello!',
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      return createMockQueryBuilder({ data: null, error: null });
    });

    // Mock real-time channel
    mockClient.channel.mockImplementation((channelName: string) => {
      console.log('channel called with:', channelName);
      return {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
    });

    render(<ConversationList onConversationSelect={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
  });
});
