
import { supabaseAdmin } from '../utils/supabaseClient.js'
import type { Request, Response, NextFunction } from 'express'

export async function verifyAuth(req: Request, res: Response, next: NextFunction){
  try{
    const token = req.headers.authorization?.split(' ')[1]
    if(!token) return res.status(401).json({ error: 'No autorizado' })
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if(error || !data?.user) return res.status(401).json({ error: 'Token inválido' })
    ;(req as any).user = data.user
    next()
  }catch(e){
    res.status(401).json({ error: 'No autorizado' })
  }
}
