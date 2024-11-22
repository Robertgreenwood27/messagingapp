// tests/api/__mocks__/supabase.ts
import { vi } from 'vitest'

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
}