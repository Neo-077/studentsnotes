
import { Request, Response } from 'express'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import { Student } from '../types/student.js'

export async function listStudents(_req: Request, res: Response){
  const { data, error } = await supabaseAdmin.from('students').select('*').order('created_at', { ascending:false })
  if(error) return res.status(500).json({ error: error.message })
  res.json({ data })
}

export async function createStudent(req: Request, res: Response){
  const payload = req.body as Student
  const { error } = await supabaseAdmin.from('students').insert([payload])
  if(error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

export async function updateStudent(req: Request, res: Response){
  const id = req.params.id
  const payload = req.body as Partial<Student>
  const { error } = await supabaseAdmin.from('students').update(payload).eq('id', id)
  if(error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

export async function deleteStudent(req: Request, res: Response){
  const id = req.params.id
  const { error } = await supabaseAdmin.from('students').delete().eq('id', id)
  if(error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}
