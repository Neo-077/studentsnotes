import { supabase } from '../config/supabase.js';

export async function listGrupos(params: { carrera_id?: number; termino_id?: number; materia_id?: number }) {
  let query = supabase
    .from('grupo')
    .select('*, materia(*), docente(*), termino(*), modalidad(*)');

  if (params.termino_id) query = query.eq('id_termino', params.termino_id);
  if (params.materia_id) query = query.eq('id_materia', params.materia_id);

  // Nota: El ERD no relaciona materia con carrera; si quisieras filtrar por carrera,
  // se necesita una tabla puente o vista. Por ahora, ignoramos carrera en server.
  const { data, error } = await query.order('id_grupo', { ascending: true }).limit(300);
  if (error) throw error;
  return data;
}
