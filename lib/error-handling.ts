// lib/error-handling.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const errorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const

export async function withErrorHandler(
  req: Request,
  handler: () => Promise<Response>,
  schema?: z.ZodSchema
): Promise<Response> {
  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `rate_limit:${ip}`
    
    // Validate request body if schema provided
    if (schema) {
      const body = await req.json()
      try {
        schema.parse(body)
      } catch (e) {
        throw new APIError(
          'Invalid request body',
          400,
          errorCodes.INVALID_REQUEST
        )
      }
    }

    // Auth check
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      throw new APIError(
        'Authentication error',
        401,
        errorCodes.AUTH_ERROR
      )
    }

    if (!session) {
      throw new APIError(
        'Unauthorized',
        401,
        errorCodes.UNAUTHORIZED
      )
    }

    return await handler()

  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof APIError) {
      return NextResponse.json({
        error: {
          message: error.message,
          code: error.code
        }
      }, { status: error.statusCode })
    }

    // Handle unexpected errors
    return NextResponse.json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 })
  }
}

// Utility to verify admin access
export async function verifyAdmin() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new APIError(
      'Unauthorized',
      401,
      errorCodes.UNAUTHORIZED
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!profile?.is_admin) {
    throw new APIError(
      'Admin access required',
      403,
      errorCodes.UNAUTHORIZED
    )
  }
}