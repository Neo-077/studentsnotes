import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type JWTPayload = {
  sub: number
  email: string
  rol: 'admin' | 'maestro'
  id_docente?: number | null
}

declare global {
  namespace Express {
    interface Request { userJwt?: JWTPayload }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction){
  try{
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i,'')
    if(!token) return res.status(401).json({ error: { message: 'Token requerido' } })
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown
    const payload = decoded as JWTPayload
    if(!payload?.sub) return res.status(401).json({ error: { message: 'Token inválido' } })
    req.userJwt = payload
    next()
  }catch(e:any){
    return res.status(401).json({ error: { message: 'No autorizado' } })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction){
  const hdr = req.headers.authorization || ''
  const token = hdr.replace(/^Bearer\s+/i,'')
  if(!token) return next()
  try{
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown
    req.userJwt = decoded as JWTPayload
  }catch{}
  next()
}
