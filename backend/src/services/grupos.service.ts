import { supabaseAdmin } from '../utils/supabaseClient.js'  // usa SERVICE ROLE
// Si prefieres dejar lecturas con anon, esta parte SÍ requiere leer materia_carrera → usa admin.

export async function listGrupos(params: { carrera_id?: number; termino_id?: number; materia_id?: number }) {
  // Base query
  let query = supabaseAdmin
    .from('grupo')
    .select('*, materia(*), docente(*), termino(*), modalidad(*)')

  if (params.termino_id) query = query.eq('id_termino', params.termino_id)
  if (params.materia_id) query = query.eq('id_materia', params.materia_id)

  // Si viene carrera_id, filtramos las materias válidas para esa carrera
  if (params.carrera_id) {
    const { data: rel, error: eRel } = await supabaseAdmin
      .from('materia_carrera')
      .select('id_materia')
      .eq('id_carrera', params.carrera_id)
    if (eRel) throw eRel
    const materiaIds = (rel ?? []).map(r => r.id_materia)
    if (materiaIds.length === 0) return [] // sin materias mapeadas para esa carrera
    query = query.in('id_materia', materiaIds)
  }

  const { data, error } = await query.order('id_grupo', { ascending: true }).limit(300)
  if (error) throw error
  return data
}
