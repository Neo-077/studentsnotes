// src/services/materias.service.ts
import { supabaseAdmin } from "../utils/supabaseClient.js"
import * as XLSX from "xlsx"

const clean = (v: unknown) => String(v ?? "").trim()
const up = (s: string) => clean(s).toLocaleUpperCase("es-MX")

function siglasDesdeNombre(nombre: string) {
  const upn = up(nombre)
  const parts = upn.split(/\s+/).filter(w => w.length > 0)
  // toma primeras letras de hasta 4 palabras significativas
  const initials = parts.filter(w => w.length > 2).slice(0, 4).map(w => w[0]).join("")
  return initials || parts[0]?.slice(0, 4) || "MAT"
}

export async function updateMateria(id_materia: number, input: { nombre?: string; unidades?: number; creditos?: number }) {
  if (!Number.isFinite(id_materia)) throw new Error('id inválido')
  const payload: any = {}
  if (input.nombre != null) payload.nombre = up(String(input.nombre))
  if (input.unidades != null) payload.unidades = Number(input.unidades)
  if (input.creditos != null) payload.creditos = Number(input.creditos)
  if (Object.keys(payload).length === 0) return { ok: true }
  const { error } = await supabaseAdmin.from('materia').update(payload).eq('id_materia', id_materia)
  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function deleteMateria(id_materia: number) {
  if (!Number.isFinite(id_materia)) throw new Error('id inválido')
  // eliminar vínculos primero
  const delLinks = await supabaseAdmin.from('materia_carrera').delete().eq('id_materia', id_materia)
  if (delLinks.error) throw new Error(delLinks.error.message)
  // eliminar materia
  const delMat = await supabaseAdmin.from('materia').delete().eq('id_materia', id_materia)
  if (delMat.error) throw new Error(delMat.error.message)
  return { ok: true }
}

async function generarClaveUnica(nombre: string): Promise<string> {
  const base = siglasDesdeNombre(nombre)
  // intenta con base, si existe agrega sufijo numérico
  let intento = base
  let i = 0
  // evitamos bucle infinito
  while (i < 1000) {
    const { data, error } = await supabaseAdmin.from("materia").select("id_materia").eq("clave", intento).limit(1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return intento
    i++
    intento = `${base}-${i}`
  }
  // fallback improbable
  return `${base}-${Date.now().toString().slice(-4)}`
}

export async function createMateria(input: {
  clave?: string
  nombre: string
  unidades?: number
  creditos?: number
}) {
  const nombre = up(input.nombre)
  if (!nombre) throw new Error("Nombre obligatorio")
  const clave = input.clave ? up(input.clave) : await generarClaveUnica(nombre)
  const payload = {
    clave,
    nombre,
    unidades: Number(input.unidades ?? 5),
    creditos: Number(input.creditos ?? 5),
  }

  const { data, error } = await supabaseAdmin
    .from("materia")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function bulkMaterias(fileBuffer: Buffer) {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(fileBuffer, { type: "buffer", raw: true, cellDates: true, codepage: 65001 })
  } catch {
    return {
      summary: { received: 0, valid: 0, inserted: 0, errors: 1 },
      errors: [{ row: 1, error: "Archivo inválido" }],
    }
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return {
      summary: { received: 0, valid: 0, inserted: 0, errors: 1 },
      errors: [{ row: 1, error: "Hoja vacía" }],
    }
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true }) as Record<string, any>[]
  const received = rows.length
  if (!received) {
    return { summary: { received: 0, valid: 0, inserted: 0, errors: 0 }, errors: [] }
  }

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
  const ok: Array<{ nombre: string; unidades: number; creditos: number; _carrera?: string; _semestre?: number | null }> = []
  const errs: Array<{ row: number; error: string }> = []

  rows.forEach((r, i) => {
    const row = i + 2 // header +1
    const nombre = up(r.nombre)
    let unidades = Number(r.unidades || 5)
    let creditos = Number(r.creditos || 5)
    const carreraText = clean(r.carrera)
    const semestreVal = r.semestre != null && r.semestre !== '' ? Number(r.semestre) : null

    if (!nombre) {
      errs.push({ row, error: "Falta nombre" })
      return
    }
    if (!Number.isFinite(unidades)) unidades = 5
    if (!Number.isFinite(creditos)) creditos = 5

    unidades = clamp(unidades, 1, 10)
    creditos = clamp(creditos, 1, 30)

    ok.push({ nombre, unidades, creditos, _carrera: carreraText, _semestre: semestreVal })
  })

  if (!ok.length) {
    return { summary: { received, valid: 0, inserted: 0, errors: errs.length }, errors: errs }
  }

  // Cargar catálogo de carreras para resolver por id/clave/nombre
  const { data: cars } = await supabaseAdmin.from('carrera').select('id_carrera, clave, nombre')
  const findCarrera = (v: string): number | null => {
    if (!v) return null
    const s = up(v)
    // si es número
    const idNum = Number(s)
    if (Number.isFinite(idNum)) {
      const f = (cars ?? []).find(x => x.id_carrera === idNum)
      if (f) return f.id_carrera
    }
    const f2 = (cars ?? []).find(x => up(x.nombre) === s || up(x.clave || '') === s)
    return f2 ? f2.id_carrera : null
  }

  let insertedCount = 0
  for (const item of ok) {
    try {
      // crear materia siempre con clave generada
      const mat = await createMateria({ nombre: item.nombre, unidades: item.unidades, creditos: item.creditos })
      insertedCount++

      // vincular si hay carrera
      if (item._carrera) {
        const id_carrera = findCarrera(item._carrera)
        const semestre = item._semestre != null && Number.isFinite(item._semestre) ? Number(item._semestre) : null
        if (id_carrera) {
          await supabaseAdmin
            .from('materia_carrera')
            .upsert({ id_materia: mat.id_materia, id_carrera, semestre }, { onConflict: 'id_carrera,id_materia' })
        }
      }
    } catch (e: any) {
      errs.push({ row: 0, error: e.message || 'Error insertando materia' })
    }
  }

  return {
    summary: {
      received,
      valid: ok.length,
      inserted: insertedCount,
      errors: errs.length,
    },
    errors: errs,
  }
}
