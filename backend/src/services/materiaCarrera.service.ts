// src/services/materiaCarrera.service.ts
import { supabase } from "../config/supabase.js"

function up(v: unknown) { return String(v ?? '').trim().toUpperCase() }
function siglasDesdeNombre(nombre: string) {
  const parts = up(nombre).split(/\s+/).filter(Boolean)
  const initials = parts.filter(w => w.length > 2).slice(0, 4).map(w => w[0]).join('')
  return initials || parts[0]?.slice(0, 4) || 'MAT'
}
async function generarClaveUnica(baseNombre: string) {
  const base = siglasDesdeNombre(baseNombre)
  let intento = base
  let i = 0
  while (i < 1000) {
    const { data, error } = await supabase.from('materia').select('id_materia').eq('clave', intento).limit(1)
    if (error) throw error
    if (!data || data.length === 0) return intento
    i++
    intento = `${base}-${i}`
  }
  return `${base}-${Date.now().toString().slice(-4)}`
}

export async function linkMateriaCarrera(input: { id_materia: number; id_carrera: number; semestre: number | string }) {
  const id_materia = Number(input.id_materia)
  const id_carrera = Number(input.id_carrera)
  const semestre = Number(input.semestre)

  if (!id_materia || !id_carrera) throw new Error("id_materia e id_carrera son obligatorios")
  if (!Number.isFinite(semestre) || semestre < 1 || semestre > 12) throw new Error("semestre inválido (1-12)")

  // validar existencia + obtener materia completa
  const [m, c] = await Promise.all([
    supabase.from("materia").select("id_materia,clave,nombre,unidades,creditos").eq("id_materia", id_materia).single(),
    supabase.from("carrera").select("id_carrera").eq("id_carrera", id_carrera).single(),
  ])
  if (m.error || !m.data) throw (m.error || new Error("Materia no existe"))
  if (c.error || !c.data) throw (c.error || new Error("Carrera no existe"))

  // si ya existe el vínculo exacto para esta materia y carrera, devolverlo sin clonar
  const ya = await supabase
    .from('materia_carrera')
    .select('id_materia,id_carrera,semestre')
    .eq('id_materia', id_materia)
    .eq('id_carrera', id_carrera)
    .maybeSingle()
  if (ya.data) return ya.data

  // Clonar materia con nueva clave única y crear vínculo usando el nuevo id
  const nuevaClave = await generarClaveUnica(m.data.nombre)
  const nuevaMateria = {
    clave: nuevaClave,
    nombre: up(m.data.nombre),
    unidades: Number(m.data.unidades || 5),
    creditos: Number(m.data.creditos || 5),
  }
  const ins = await supabase.from('materia').insert(nuevaMateria).select('id_materia').single()
  if (ins.error || !ins.data) throw (ins.error || new Error('No se pudo clonar materia'))
  const nuevo_id_materia = ins.data.id_materia

  const rel = await supabase
    .from('materia_carrera')
    .upsert({ id_materia: nuevo_id_materia, id_carrera, semestre }, { onConflict: 'id_carrera,id_materia' })
    .select('id_materia,id_carrera,semestre')
    .single()
  if (rel.error) throw rel.error
  return rel.data
}

export async function listMateriaCarrera() {
  const { data, error } = await supabase
    .from("materia_carrera")
    .select("id_materia,id_carrera,semestre,carrera:id_carrera(nombre,clave)")
  if (error) throw error
  return data ?? []
}
