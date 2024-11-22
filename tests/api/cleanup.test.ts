import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/error-handling', () => {
  const mockErrorHandler = vi.fn(async (req, handler) => {
    try {
      return await handler()
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: { message: err.message, code: err.code },
        }),
        { status: err.statusCode }
      )
    }
  })

  return {
    withErrorHandler: mockErrorHandler,
    verifyAdmin: vi.fn().mockResolvedValue(undefined),
    APIError: class extends Error {
      constructor(message: string, statusCode: number, code: string) {
        super(message)
        this.name = 'APIError'
        this.statusCode = statusCode
        this.code = code
      }
    },
    errorCodes: {
      DATABASE_ERROR: 'DATABASE_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
    },
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          lt: vi.fn().mockResolvedValue({
            data: null,
            count: 10,
            error: null,
          }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null,
      }),
    },
  },
}))

import { POST } from '@/app/api/cleanup/route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { withErrorHandler } from '@/lib/error-handling'

describe('Cleanup API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle database errors during count', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          lt: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
        })),
      })),
    }))

    const response = await POST(
      new Request('http://localhost/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    )

    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.error.code).toBe('DATABASE_ERROR')
  })

  it('should verify admin access and use error handler', async () => {
    const request = new Request('http://localhost/api/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    await POST(request)
    expect(withErrorHandler).toHaveBeenCalled()
  })
})
