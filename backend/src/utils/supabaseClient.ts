// src/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
// Si generaste tipos con `supabase gen types ...`, descomenta la línea siguiente:
// import type { Database } from '../types/supabase'  // ← ajusta la ruta

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
}

// Si tienes tipos generados, pasa el genérico: createClient<Database>(...)
export const supabaseAdmin =
  createClient(/* <Database> */ SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
