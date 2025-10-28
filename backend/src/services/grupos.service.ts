// src/services/grupos.service.ts
import { supabase } from '../config/supabase.js'
import * as XLSX from 'xlsx'

type CreateGrupoInput = {
  id_materia: number
  id_docente: number
  id_termino: number
  id_modalidad: number
  grupo_codigo?: string | null
  horario: string
  cupo?: number | null
}

/** ========== Helpers ========== **/
const clean = (v: unknown) => String(v ?? '').trim()

function siglasMateria(nombre: string) {
  const up = (nombre || 'MATERIA').toUpperCase()
  const sig = up
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w[0])
    .join('')
    .slice(0, 3) || 'MAT'
  return sig
}

function generarCodigo(nombreMateria: string) {
  const sig = siglasMateria(nombreMateria)
  const num = Math.floor(1000 + Math.random() * 9000) // 4 dígitos
  const suf = String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
  return `${sig}-${num} - SC${suf}`
}

/** ========== Listar grupos (con filtros) ========== **/
export async function listGrupos(params: {
  termino_id?: number
  carrera_id?: number
  materia_id?: number
  docente_id?: number
  horario?: string
}) {
  const { termino_id, carrera_id, materia_id, docente_id, horario } = params

  // Base query con joins para traer nombres
  let q = supabase
    .from('grupo')
    .select(
      `
      id_grupo,grupo_codigo,horario,cupo,
      materia:id_materia(id_materia,nombre),
      docente:id_docente(id_docente,nombre,ap_paterno,ap_materno),
      modalidad:id_modalidad(id_modalidad,nombre)
    `
    )
    .order('id_grupo', { ascending: false })

  if (termino_id) q = q.eq('id_termino', termino_id)
  if (materia_id) q = q.eq('id_materia', materia_id)
  if (docente_id) q = q.eq('id_docente', docente_id)
  if (horario) q = q.eq('horario', horario)

  // Filtro por carrera: hay que pasar por materia_carrera
  if (carrera_id) {
    // 1) obtener materias de esa carrera
    const { data: mats, error: em } = await supabase
      .from('materia_carrera')
      .select('id_materia')
      .eq('id_carrera', carrera_id)

    if (em) throw em
    const ids = (mats ?? []).map((m) => m.id_materia)
    if (ids.length === 0) return [] // no hay relación => no hay grupos
    q = q.in('id_materia', ids)
  }

  const { data, error } = await q
  if (error) throw error
  const list = (data ?? []) as any[]

  // Adjuntar carrera de referencia para cada materia
  if (list.length) {
    const matIds = Array.from(new Set(list.map(g => g.materia?.id_materia).filter(Boolean)))
    if (matIds.length) {
      const { data: rels, error: er } = await supabase
        .from('materia_carrera')
        .select('id_materia, id_carrera, carrera:carrera_id(nombre, clave)')
        .in('id_materia', matIds as number[])
      if (!er) {
        // grupo por materia
        const byMat = new Map<number, any[]>()
        for (const r of (rels as any[]) ?? []) {
          const arr = byMat.get(r.id_materia) || []
          arr.push(r)
          byMat.set(r.id_materia, arr)
        }
        for (const g of list) {
          const mid = g.materia?.id_materia
          const arr = mid ? byMat.get(mid) : null
          if (arr && arr.length) {
            // preferida por filtro de carrera si aplica, si no la primera
            let chosen = arr[0]
            if (carrera_id) {
              const found = arr.find(x => x.id_carrera === carrera_id)
              if (found) chosen = found
            }
            g.materia = g.materia || {}
            g.materia.carrera = { nombre: chosen?.carrera?.nombre || null, clave: chosen?.carrera?.clave || null }
            g.materia.carrera_nombre = chosen?.carrera?.nombre || null
            g.materia.carrera_clave  = chosen?.carrera?.clave  || null
          }
        }
      }
    }
  }
  return list
}

/** ========== Validar choque de horario (docente) ========== **/
export async function checkDocenteHorarioConflict(input: {
  id_docente: number
  id_termino: number
  horario: string
}) {
  const { id_docente, id_termino, horario } = input
  const { data, error } = await supabase
    .from('grupo')
    .select('id_grupo')
    .eq('id_docente', id_docente)
    .eq('id_termino', id_termino)
    .eq('horario', horario)
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}

/** ========== Crear grupo ========= **/
export async function createGrupo(payload: CreateGrupoInput) {
  // Validaciones mínimas
  if (!payload.id_materia) throw new Error('id_materia requerido')
  if (!payload.id_docente) throw new Error('id_docente requerido')
  if (!payload.id_termino) throw new Error('id_termino requerido')
  if (!payload.id_modalidad) throw new Error('id_modalidad requerida')
  if (!clean(payload.horario)) throw new Error('horario requerido')

  // Verifica que existan llaves foráneas (opcionales pero útil)
  const [m, d, mo, t] = await Promise.all([
    supabase.from('materia').select('id_materia,nombre').eq('id_materia', payload.id_materia).single(),
    supabase.from('docente').select('id_docente').eq('id_docente', payload.id_docente).single(),
    supabase.from('modalidad').select('id_modalidad').eq('id_modalidad', payload.id_modalidad).single(),
    supabase.from('termino').select('id_termino').eq('id_termino', payload.id_termino).single(),
  ])
  if (m.error || !m.data) throw (m.error || new Error('Materia no existe'))
  if (d.error || !d.data) throw (d.error || new Error('Docente no existe'))
  if (mo.error || !mo.data) throw (mo.error || new Error('Modalidad no existe'))
  if (t.error || !t.data) throw (t.error || new Error('Término no existe'))

  // Choque de horario
  const conflict = await checkDocenteHorarioConflict({
    id_docente: payload.id_docente,
    id_termino: payload.id_termino,
    horario: clean(payload.horario),
  })
  if (conflict) {
    throw new Error('El docente ya tiene un grupo en ese horario para el término seleccionado')
  }

  // Código autogenerado si viene vacío
  let grupo_codigo = clean(payload.grupo_codigo)
  if (!grupo_codigo) grupo_codigo = generarCodigo(m.data.nombre)

  const cupo = payload.cupo && Number(payload.cupo) > 0 ? Number(payload.cupo) : 30

  const insertPayload = {
    id_materia: payload.id_materia,
    id_docente: payload.id_docente,
    id_termino: payload.id_termino,
    id_modalidad: payload.id_modalidad,
    grupo_codigo,
    horario: clean(payload.horario),
    cupo,
  }

  const { data, error } = await supabase
    .from('grupo')
    .insert(insertPayload)
    .select(
      `
      id_grupo,grupo_codigo,horario,cupo,
      materia:id_materia(id_materia,nombre),
      docente:id_docente(id_docente,nombre,ap_paterno,ap_materno),
      modalidad:id_modalidad(id_modalidad,nombre)
      `
    )
    .single()

  if (error) throw error
  return data
}

/** ========== Eliminar grupo por ID ========= **/
export async function deleteGrupo(id_grupo: number) {
  const { error } = await supabase
    .from('grupo')
    .delete()
    .eq('id_grupo', id_grupo)

  if (error) throw error
  return { success: true }
}

/** ========== Importación masiva desde CSV/XLSX ========= **/
export async function bulkUpsertGrupos(fileBuffer: Buffer) {
  const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return { summary: { received: 0, inserted: 0, errors: 1 }, errors: [{ row: 1, error: 'Archivo vacío' }] }
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as Record<string, any>[]
  const received = rows.length
  if (!received) return { summary: { received: 0, inserted: 0, errors: 0 }, errors: [] }

  // Normalizamos cabeceras esperadas: materia, docente, termino, modalidad, horario, cupo
  const errors: Array<{ row: number; error: string }> = []
  const ok: any[] = []

  // catálogos
  const [mats, docs, mods, terms] = await Promise.all([
    supabase.from('materia').select('id_materia,clave,nombre'),
    supabase.from('docente').select('id_docente,nombre,ap_paterno,ap_materno'),
    supabase.from('modalidad').select('id_modalidad,nombre'),
    supabase.from('termino').select('id_termino,anio,periodo')
  ])
  if (mats.error) throw mats.error
  if (docs.error) throw docs.error
  if (mods.error) throw mods.error
  if (terms.error) throw terms.error

  const findMateria = (v: string) => {
    const s = clean(v).toUpperCase()
    return (mats.data ?? []).find(x => x.nombre.toUpperCase() === s || x.clave.toUpperCase() === s)?.id_materia || null
  }
  const findDocente = (v: string) => {
    const s = clean(v).toUpperCase()
    return (docs.data ?? []).find(x => `${x.nombre} ${x.ap_paterno ?? ''} ${x.ap_materno ?? ''}`.toUpperCase().trim() === s)?.id_docente || null
  }
  const findModalidad = (v: string) => {
    const s = clean(v).toUpperCase()
    return (mods.data ?? []).find(x => x.nombre.toUpperCase() === s)?.id_modalidad || null
  }
  const findTermino = (v: string) => {
    const s = clean(v).toUpperCase()
    // admite "2025 ENE-JUN" o "2025 ENE JUN"
    const m = s.match(/^(\d{4})\s+([A-ZÁÉÍÓÚ\-]+)$/)
    if (!m) return null
    const anio = Number(m[1])
    const periodo = m[2].replace(/\s+/g, '-')
    return (terms.data ?? []).find(x => x.anio === anio && x.periodo.toUpperCase() === periodo)?.id_termino || null
  }

  rows.forEach((r, i) => {
    const row = i + 2
    const id_materia = findMateria(r.materia ?? '')
    const id_docente = findDocente(r.docente ?? '')
    const id_modalidad = findModalidad(r.modalidad ?? '')
    const id_termino = findTermino(r.termino ?? '')
    const horario = clean(r.horario)
    const cupo = r.cupo ? Number(r.cupo) : 30

    if (!id_materia) return errors.push({ row, error: `Materia inválida (${r.materia})` })
    if (!id_docente) return errors.push({ row, error: `Docente inválido (${r.docente})` })
    if (!id_modalidad) return errors.push({ row, error: `Modalidad inválida (${r.modalidad})` })
    if (!id_termino) return errors.push({ row, error: `Término inválido (${r.termino})` })
    if (!horario) return errors.push({ row, error: `Horario requerido` })

    ok.push({
      id_materia, id_docente, id_termino, id_modalidad,
      grupo_codigo: generarCodigo((mats.data ?? []).find(x => x.id_materia === id_materia)?.nombre || 'MATERIA'),
      horario, cupo: cupo > 0 ? cupo : 30
    })
  })

  if (ok.length === 0) return { summary: { received, inserted: 0, errors: errors.length }, errors }

  // (opcional) checar conflictos en bloque
  // por simplicidad insertamos, si hay conflictos la BD rechazará por la validación manual previa del frontend.

  const { data, error } = await supabase
    .from('grupo')
    .insert(ok)
    .select('id_grupo')

  if (error) errors.push({ row: 0, error: error.message })

  return {
    summary: { received, inserted: data?.length ?? 0, errors: errors.length },
    errors
  }
}
