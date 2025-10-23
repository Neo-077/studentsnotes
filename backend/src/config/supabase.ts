import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

if (!/^https:\/\/.+\.supabase\.co\/?$/.test(env.SUPABASE_URL)) {
  throw new Error(`SUPABASE_URL inválida: ${env.SUPABASE_URL}`)
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-app': 'studentsnotes-backend' } },
})
