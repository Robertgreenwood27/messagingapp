// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children)
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: (props: any) => React.createElement('button', props)
}))

// Mock Input component
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => React.createElement('input', props)
}))

// Mock Supabase client with needed functionality
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
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
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: 'conv1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          participant1_id: 'test-user-id',
          participant2_id: 'other-user-id',
          participant2: {
            id: 'other-user-id',
            username: 'otheruser',
            full_name: 'Other User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }],
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
      }),
      insert: vi.fn().mockResolvedValue({
        data: { id: 'new-msg-id' },
        error: null
      })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn()
    }))
  }))
}))

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))
