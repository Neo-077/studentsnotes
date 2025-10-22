import { supabase } from '../config/supabase.js';

export async function crearInscripcion(input: { id_estudiante: number, id_grupo: number }){
  // Valida duplicado
  const { data: dup, error: e1 } = await supabase.from('inscripcion')
    .select('id_inscripcion').eq('id_estudiante', input.id_estudiante).eq('id_grupo', input.id_grupo).maybeSingle();
  if(e1) throw e1;
  if(dup) throw new Error('El estudiante ya está inscrito en este grupo');

  // Valida cupo
  const { data: g, error: e2 } = await supabase.from('grupo')
    .select('id_grupo, cupo').eq('id_grupo', input.id_grupo).single();
  if(e2) throw e2;
  const { data: count, error: e3 } = await supabase.from('inscripcion').select('id_inscripcion', {count: 'exact', head: true}).eq('id_grupo', input.id_grupo);
  if(e3) throw e3;
  const usados = (count?.length ?? 0);
  if(usados >= (g?.cupo ?? 0)) throw new Error('Cupo lleno');

  const { data, error } = await supabase.from('inscripcion').insert({ ...input, status: 'ACTIVA' }).select('*').single();
  if(error) throw error;
  return data;
}
