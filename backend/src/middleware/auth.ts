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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ error: { message: 'Token requerido' } })
    }

    // 1) Validar token contra Supabase
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: { message: 'Token inválido' } })
    }

    const email = data.user.email || undefined
    req.authUser = { id: data.user.id, email }

    // 2) Mapear al usuario de la app (tabla usuario)
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
