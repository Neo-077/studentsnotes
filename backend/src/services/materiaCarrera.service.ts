// src/services/materiaCarrera.service.ts
import { supabase } from "../config/supabase.js"

export async function linkMateriaCarrera(input: { id_materia: number; id_carrera: number; semestre: number | string }) {
  const id_materia = Number(input.id_materia)
  const id_carrera = Number(input.id_carrera)
  const semestre = Number(input.semestre)

  if (!id_materia || !id_carrera) throw new Error("id_materia e id_carrera son obligatorios")
  if (!Number.isFinite(semestre) || semestre < 1 || semestre > 12) throw new Error("semestre inválido (1-12)")

  // validar existencia
  const [m, c] = await Promise.all([
    supabase.from("materia").select("id_materia").eq("id_materia", id_materia).single(),
    supabase.from("carrera").select("id_carrera").eq("id_carrera", id_carrera).single(),
  ])
  if (m.error || !m.data) throw (m.error || new Error("Materia no existe"))
  if (c.error || !c.data) throw (c.error || new Error("Carrera no existe"))

  // upsert en relación compuesta (id_carrera, id_materia)
  const { data, error } = await supabase
    .from("materia_carrera")
    .upsert({ id_materia, id_carrera, semestre }, { onConflict: "id_carrera,id_materia" })
    .select("id_materia,id_carrera,semestre")
    .single()

  if (error) throw error
  return data
}
