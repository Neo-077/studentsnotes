// src/services/docentes.service.ts
import { supabase } from "../config/supabase.js"
import * as XLSX from "xlsx"

const clean = (v: unknown) => String(v ?? "").trim()
const up = (s: string) => clean(s).toUpperCase()

export async function createDocente(input: {
  rfc: string; nombre: string; ap_paterno: string; ap_materno?: string | null;
  correo: string; id_genero?: number | null
}) {
  const payload = {
    rfc: up(input.rfc),
    nombre: up(input.nombre),
    ap_paterno: up(input.ap_paterno),
    ap_materno: input.ap_materno ? up(input.ap_materno) : null,
    correo: clean(input.correo).toLowerCase(),
    id_genero: input.id_genero ?? null,
    activo: true,
  }

  if (!payload.rfc || !payload.nombre || !payload.ap_paterno || !payload.correo) {
    throw new Error("Campos obligatorios faltantes")
  }
  const { data, error } = await supabase.from("docente").insert(payload).select("*").single()
  if (error) throw error
  return data
}

export async function updateDocente(id_docente: number, input: Partial<{ rfc: string; nombre: string; ap_paterno: string; ap_materno: string | null; correo: string; id_genero: number | null; activo: boolean }>) {
  if (!Number.isFinite(id_docente)) throw new Error('id inválido')
  const payload: any = {}
  if (input.rfc != null) payload.rfc = up(String(input.rfc))
  if (input.nombre != null) payload.nombre = up(String(input.nombre))
  if (input.ap_paterno != null) payload.ap_paterno = up(String(input.ap_paterno))
  if (input.ap_materno !== undefined) payload.ap_materno = input.ap_materno ? up(String(input.ap_materno)) : null
  if (input.correo != null) payload.correo = clean(input.correo).toLowerCase()
  if (input.id_genero !== undefined) payload.id_genero = input.id_genero
  if (input.activo !== undefined) payload.activo = !!input.activo
  if (Object.keys(payload).length === 0) return { ok: true }
  const { error } = await supabase.from('docente').update(payload).eq('id_docente', id_docente)
  if (error) throw error
  return { ok: true }
}

export async function deleteDocente(id_docente: number) {
  if (!Number.isFinite(id_docente)) throw new Error('id inválido')
  const { error } = await supabase.from('docente').delete().eq('id_docente', id_docente)
  if (error) throw error
  return { ok: true }
}

export async function bulkDocentes(fileBuffer: Buffer) {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true, raw: true, codepage: 65001 })
  } catch (e: any) {
    return { summary:{received:0,valid:0,inserted:0,errors:1}, errors:[{row:1,error:`Archivo inválido: ${e?.message||"leer"}`}]} }

  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { summary:{received:0,valid:0,inserted:0,errors:1}, errors:[{row:1,error:"Hoja vacía"}]}

  const rows = XLSX.utils.sheet_to_json(ws, { defval:"", raw:true }) as Record<string,any>[]
  const received = rows.length
  if (!received) return { summary:{received,valid:0,inserted:0,errors:0}, errors:[] }

  // cargar generos para mapear texto/clave -> id
  const { data: gens, error: eg } = await supabase.from("genero").select("id_genero, clave, descripcion")
  if (eg) throw eg
  const gMap = new Map<string, number>()
  for (const g of gens ?? []) {
    const clave = (g.clave ?? "").toString().toLowerCase()
    const desc = (g.descripcion ?? "").toString().toLowerCase()
    if (clave) gMap.set(clave, g.id_genero)
    if (desc) gMap.set(desc, g.id_genero)
    // Atajos: primera letra y equivalentes comunes
    if (desc.startsWith("m")) gMap.set("m", g.id_genero)
    if (desc.startsWith("f")) gMap.set("f", g.id_genero)
    if (clave === "m") gMap.set("masculino", g.id_genero)
    if (clave === "f") gMap.set("femenino", g.id_genero)
  }

  const ok: Array<{ rfc: string; nombre: string; ap_paterno: string; ap_materno: string | null; correo: string; id_genero: number | null; activo: boolean }> = []
  const errs: any[] = []

  rows.forEach((r, i) => {
    const row = i+2
    const rfc = up(r.rfc)
    const nombre = up(r.nombre)
    const ap_paterno = up(r.ap_paterno)
    const ap_materno = r.ap_materno ? up(r.ap_materno) : null
    const correo = clean(r.correo).toLowerCase()
    let id_genero: number | null = null
    if (r.genero) {
      const k = String(r.genero).trim().toLowerCase()
      id_genero = gMap.get(k) ?? null
    }
    if (!rfc || !nombre || !ap_paterno || !correo) {
      errs.push({ row, error:"Faltan RFC/nombre/ap_paterno/correo" }); return
    }
    ok.push({ rfc, nombre, ap_paterno, ap_materno, correo, id_genero, activo:true })
  })

  if (!ok.length) return { summary:{received,valid:0,inserted:0,errors:errs.length}, errors:errs }

  // Evitar duplicados por RFC: no actualizar, solo ignorar los ya existentes
  const rfcs = ok.map(d => d.rfc)
  const { data: existing, error: exErr } = await supabase
    .from('docente')
    .select('rfc')
    .in('rfc', rfcs)
  if (exErr) throw exErr
  const existingSet = new Set((existing ?? []).map((d: any) => String(d.rfc).toUpperCase()))

  const toInsert = ok.filter(d => !existingSet.has(d.rfc))

  if (toInsert.length === 0) {
    return { summary:{ received, valid: ok.length, inserted: 0, errors: errs.length }, errors: errs }
  }

  const { data, error } = await supabase.from("docente").insert(toInsert).select("id_docente")
  if (error) errs.push({ row:0, error: error.message })

  return { summary:{received, valid:ok.length, inserted:data?.length ?? 0, errors:errs.length}, errors:errs }
}
