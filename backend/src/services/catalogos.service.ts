import { supabase } from '../config/supabase.js';

export async function listCarreras(){
  const { data, error } = await supabase.from('carrera').select('*').order('nombre');
  if(error) throw error;
  return data;
}
export async function listGeneros(){
  const { data, error } = await supabase.from('genero').select('*').order('descripcion');
  if(error) throw error;
  return data;
}
export async function listMaterias(){
  const { data, error } = await supabase.from('materia').select('*').order('nombre');
  if(error) throw error;
  return data;
}
export async function listDocentes(){
  const { data, error } = await supabase.from('docente').select('*').order('ap_paterno');
  if(error) throw error;
  return data;
}
export async function listTerminos(){
  const { data, error } = await supabase.from('termino').select('*').order('anio', {ascending:false});
  if(error) throw error;
  return data;
}
export async function listModalidades(){
  const { data, error } = await supabase.from('modalidad').select('*').order('nombre');
  if(error) throw error;
  return data;
}
