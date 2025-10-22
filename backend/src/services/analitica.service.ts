import { supabase } from '../config/supabase.js';

export async function getKPIs(){
  const { data, error } = await supabase.from('vw_kpis').select('*').limit(1);
  if(error) throw error;
  return data?.[0] ?? {};
}

export async function getPareto(scope: string){
  // Ejemplo: reprobación por materia a partir de inscripcion + evaluacion_unidad
  const { data, error } = await supabase.rpc('rpc_pareto_reprobacion_por_materia').select('*');
  if(error) return []; // si no existe funcion, responder vacío
  return data;
}
