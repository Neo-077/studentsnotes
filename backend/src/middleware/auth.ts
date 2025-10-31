import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase.js' // service role client

// Puedes tipar si quieres:
declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string
        email?: string
      }
      appUsuario?: any
    }
  }
}

// Caché simple en memoria por token → { userId, email, exp }
const TOKEN_CACHE = new Map<string, { id: string; email?: string; exp: number }>()
const TTL_MS = 60_000

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ error: { message: 'Token requerido' } })
    }

    // 1) Validar token con caché para reducir latencia
    const now = Date.now()
    const cached = TOKEN_CACHE.get(token)
    if (cached && cached.exp > now) {
      res.setHeader('X-Auth-Cache', 'HIT')
      req.authUser = { id: cached.id, email: cached.email }
    } else {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user) {
        return res.status(401).json({ error: { message: 'Token inválido' } })
      }
      const email = data.user.email || undefined
      req.authUser = { id: data.user.id, email }
      TOKEN_CACHE.set(token, { id: data.user.id, email, exp: now + TTL_MS })
      res.setHeader('X-Auth-Cache', 'MISS')
    }

    // 2) Mapear al usuario de la app (tabla usuario)
    const email = req.authUser?.email
    if (email) {
      const { data: usuarios, error: uErr } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', email)
        .limit(1)

      if (uErr) {
        // no bloqueamos por esto; pero puedes decidir devolver 500
        // return res.status(500).json({ error: { message: uErr.message } })
      }
      req.appUsuario = usuarios?.[0] || null
    }

    return next()
  } catch (e: any) {
    return res.status(401).json({ error: { message: 'No autorizado' } })
  }
}
