import { supabaseAdmin } from "../utils/supabaseClient.js"

// Tipos alineados a la tabla 'estudiante'
export type CreateEstudianteInput = {
  nombre: string
  ap_paterno: string
  ap_materno?: string
  id_genero: number
  id_carrera: number
  fecha_nacimiento?: string // 'YYYY-MM-DD'
}

export type Estudiante = {
  id_estudiante: number
  no_control: string
  nombre: string
  ap_paterno: string | null
  ap_materno: string | null
  id_genero: number
  id_carrera: number
  fecha_nacimiento: string | null
  fecha_alta: string
  activo: boolean
}

// ✅ Inserta un nuevo estudiante en la tabla real 'estudiante'
export async function createEstudiante(input: CreateEstudianteInput) {
  const payload = {
    nombre: input.nombre.trim(),
    ap_paterno: input.ap_paterno.trim(),
    ap_materno: input.ap_materno?.trim() ?? null,
    id_genero: input.id_genero,
    id_carrera: input.id_carrera,
    fecha_nacimiento: input.fecha_nacimiento ?? null,
    activo: true,
  }

  const { data, error } = await supabaseAdmin
    .from("estudiante") // ✅ tabla real según tu esquema
    .insert(payload)
    .select('id_estudiante,no_control,nombre,ap_paterno,ap_materno,id_carrera,id_genero,fecha_nacimiento,activo').single()

  if (error) {
    const e: any = new Error(error.message)
    e.status = 400
    e.details = error.details ?? error.hint ?? error.code
    throw e
  }

  return data as Estudiante
}
