import { supabase } from '../config/supabase.js'

export async function searchEstudiantes(params: { carrera_id?: number, q?: string }) {
  let query = supabase.from('estudiante').select('*').limit(50)
  if (params.carrera_id) query = query.eq('id_carrera', params.carrera_id)
  if (params.q) {
    const like = `%${params.q}%`
    query = query.or(
      `no_control.ilike.${like},nombre.ilike.${like},ap_paterno.ilike.${like},ap_materno.ilike.${like}`
    )
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createEstudiante(input: {
  no_control: string
  nombre: string
  ap_paterno: string
  ap_materno?: string
  id_genero: number
  id_carrera: number
  fecha_nacimiento?: string
}) {
  const { data, error } = await supabase
    .from('estudiante')
    .insert({
      no_control: input.no_control,
      nombre: input.nombre,
      ap_paterno: input.ap_paterno,
      ap_materno: input.ap_materno ?? null,
      id_genero: input.id_genero,
      id_carrera: input.id_carrera,
      fecha_nacimiento: input.fecha_nacimiento ?? null,
      activo: true
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}
