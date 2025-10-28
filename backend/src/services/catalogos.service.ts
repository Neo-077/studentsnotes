// src/services/catalogos.service.ts
import { supabase } from '../config/supabase.js';

export async function listCarreras() {
  const { data, error } = await supabase.from('carrera').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function listGeneros() {
  const { data, error } = await supabase.from('genero').select('*').order('descripcion');
  if (error) throw error;
  return data ?? [];
}

/**
 * Lista materias con filtros opcionales:
 *  - carrera_id: materias ligadas a esa carrera (tabla materia_carrera)
 *  - termino_id: materias que ya tienen algún grupo en ese término (tabla grupo)
 *
 * Si no hay filtros, regresa todas las materias.
 */
export async function listMaterias(params?: { carrera_id?: number; termino_id?: number }) {
  try {
    const carrera_id = params?.carrera_id;
    const termino_id = params?.termino_id;

    // 1) Materias por carrera
    let idsPorCarrera: number[] | null = null;
    if (carrera_id) {
      const { data, error } = await supabase
        .from('materia_carrera')
        .select('id_materia')
        .eq('id_carrera', carrera_id);

      if (error) throw error;
      idsPorCarrera = (data ?? []).map(r => r.id_materia);
      if (idsPorCarrera.length === 0) return []; // evita .in([])
    }

    // 2) Materias que tienen grupos en el término
    let idsPorTermino: number[] | null = null;
    if (termino_id) {
      const { data, error } = await supabase
        .from('grupo')
        .select('id_materia')
        .eq('id_termino', termino_id);

      if (error) throw error;
      idsPorTermino = Array.from(new Set((data ?? []).map(r => r.id_materia)));
      if (idsPorTermino.length === 0) return []; // evita .in([])
    }

    // 3) Intersección si llegaron ambos filtros
    let idsFinales: number[] | null = null;
    if (idsPorCarrera && idsPorTermino) {
      const setT = new Set(idsPorTermino);
      idsFinales = idsPorCarrera.filter(id => setT.has(id));
      if (idsFinales.length === 0) return [];
    } else {
      idsFinales = idsPorCarrera ?? idsPorTermino; // puede quedar null si no hay filtros
    }

    // 4) Consulta final
    let q = supabase
      .from('materia')
      .select('id_materia, clave, nombre, unidades, creditos')
      .order('nombre', { ascending: true });

    // IMPORTANTÍSIMO: solo usar .in si hay al menos 1 id
    if (idsFinales && idsFinales.length > 0) {
      q = q.in('id_materia', idsFinales);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[listMaterias] error:', err);
    // No rompas la app: devuelve lista vacía
    return [];
  }
}

export async function listDocentes() {
  const { data, error } = await supabase.from('docente').select('*').order('ap_paterno');
  if (error) throw error;
  return data ?? [];
}

export async function listTerminos() {
  const { data, error } = await supabase.from('termino').select('*').order('anio', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listModalidades() {
  const { data, error } = await supabase.from('modalidad').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
}
