
import { Request, Response } from 'express'
import { supabaseAdmin } from '../utils/supabaseClient.js'

export async function listLogs(_req: Request, res: Response){
  const { data, error } = await supabaseAdmin.from('student_logs').select('*').order('fecha', { ascending:false }).limit(500)
  if(error) return res.status(500).json({ error: error.message })
  res.json({ data })
}
