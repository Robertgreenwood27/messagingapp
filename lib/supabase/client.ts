// lib/supabase/client.ts
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './database.types'

export const createClient = () => {
  return createPagesBrowserClient<Database>()
}