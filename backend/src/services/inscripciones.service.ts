import { supabaseAdmin } from '../utils/supabaseClient.js'

export async function crearInscripcion(input: { id_estudiante: number; id_grupo: number }) {
  const id_grupo = Number(input.id_grupo)
  const id_estudiante = Number(input.id_estudiante)

  const { data: g, error: e2 } = await supabaseAdmin
    .from('grupo')
    .select('id_grupo,cupo')
    .eq('id_grupo', id_grupo)
    .single()
  if (e2) throw e2

  const { count, error: e3 } = await supabaseAdmin
    .from('inscripcion')
    .select('id_inscripcion', { count: 'exact', head: true })
    .eq('id_grupo', id_grupo)
  if (e3) throw e3

  const usados = count ?? 0
  if (usados >= (g?.cupo ?? 0)) throw new Error('Cupo lleno')

  const { data, error } = await supabaseAdmin
    .from('inscripcion')
    .upsert(
      { id_grupo, id_estudiante, status: 'ACTIVA' },
      { onConflict: 'id_grupo,id_estudiante', ignoreDuplicates: true }
    )
    .select('id_inscripcion,id_grupo,id_estudiante')
    .single()
  if (error) throw error

  return data
}
