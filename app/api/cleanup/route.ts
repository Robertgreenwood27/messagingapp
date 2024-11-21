// app/api/cleanup/route.ts
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const startTime = Date.now()
  let messagesDeleted = 0

  try {
    // Auth check
    const authHeader = request.headers.get('authorization')
    const secretKey = process.env.CLEANUP_SECRET_KEY
    
    if (!authHeader || !secretKey || authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get count before deletion
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null)
      .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (countError) throw countError
    messagesDeleted = count || 0

    // Run cleanup
    const { error: cleanupError } = await supabaseAdmin.rpc('hard_delete_old_messages')
    if (cleanupError) throw cleanupError

    // Log success
    const duration = Date.now() - startTime
    await supabaseAdmin.from('cleanup_logs').insert({
      messages_deleted: messagesDeleted,
      duration_ms: duration
    })

    return NextResponse.json({
      success: true,
      messagesDeleted,
      duration
    })

  } catch (err) {
    // Log error
    const duration = Date.now() - startTime
    await supabaseAdmin.from('cleanup_logs').insert({
      messages_deleted: 0,
      duration_ms: duration,
      error: err instanceof Error ? err.message : 'Unknown error'
    })

    console.error('Cleanup error:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}