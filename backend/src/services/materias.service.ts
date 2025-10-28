// src/services/materias.service.ts
import { supabaseAdmin } from "../utils/supabaseClient.js"
import * as XLSX from "xlsx"

const clean = (v: unknown) => String(v ?? "").trim()
const up = (s: string) => clean(s).toLocaleUpperCase("es-MX")

export async function createMateria(input: {
  clave: string
  nombre: string
  unidades?: number
  creditos?: number
}) {
  const payload = {
    clave: up(input.clave),
    nombre: up(input.nombre),
    unidades: Number(input.unidades ?? 5),
    creditos: Number(input.creditos ?? 5),
  }
  if (!payload.clave || !payload.nombre) {
    throw new Error("Clave y nombre obligatorios")
  }

  // Insert sencillo (si prefieres evitar error por duplicado, cambia a upsert)
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
  const ok: Array<{ clave: string; nombre: string; unidades: number; creditos: number }> = []
  const errs: Array<{ row: number; error: string }> = []

  rows.forEach((r, i) => {
    const row = i + 2 // header +1
    const clave = up(r.clave)
    const nombre = up(r.nombre)
    let unidades = Number(r.unidades || 5)
    let creditos = Number(r.creditos || 5)

    if (!clave || !nombre) {
      errs.push({ row, error: "Falta clave o nombre" })
      return
    }
    if (!Number.isFinite(unidades)) unidades = 5
    if (!Number.isFinite(creditos)) creditos = 5

    unidades = clamp(unidades, 1, 10)
    creditos = clamp(creditos, 1, 30)

    ok.push({ clave, nombre, unidades, creditos })
  })

  if (!ok.length) {
    return { summary: { received, valid: 0, inserted: 0, errors: errs.length }, errors: errs }
  }

  // Upsert por 'clave' (UNIQUE)
  const { data, error } = await supabaseAdmin
    .from("materia")
    .upsert(ok, { onConflict: "clave", ignoreDuplicates: true })
    .select("id_materia")

  if (error) errs.push({ row: 0, error: error.message })

  return {
    summary: {
      received,
      valid: ok.length,
      inserted: data?.length ?? 0,
      errors: errs.length,
    },
    errors: errs,
  }
}
