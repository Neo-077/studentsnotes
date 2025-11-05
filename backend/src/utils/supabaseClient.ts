// src/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'  // recuerda la extensión .js por NodeNext

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'studentsnotes-backend' } }
  }
)

// 👇 Alias para no romper imports existentes que usen `supabase`
export const supabase = supabaseAdmin
