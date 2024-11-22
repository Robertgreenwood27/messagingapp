// tests/__mocks__/supabase.ts
export const mockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } },
        error: null 
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: {
          id: 'new-msg-id',
          content: 'New message',
          created_at: new Date().toISOString(),
          sender_id: 'test-user-id',
          conversation_id: 'test-conv-id'
        },
        error: null
      }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'msg1',
          content: 'Test message 1',
          created_at: new Date().toISOString(),
          sender_id: 'test-user-id',
          conversation_id: 'test-conv-id',
          sender: {
            id: 'test-user-id',
            username: 'testuser'
          }
        },
        error: null
      })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    }))
  }
  
  vi.mock('@/lib/supabase/client', () => ({
    createClient: () => mockSupabaseClient
  }))