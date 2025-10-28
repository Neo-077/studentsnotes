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
    gMap.set(g.clave.toString().toLowerCase(), g.id_genero)
    gMap.set(g.descripcion.toString().toLowerCase(), g.id_genero)
  }

  const ok: any[] = []
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
      const k = String(r.genero).toLowerCase()
      id_genero = gMap.get(k) ?? null
    }
    if (!rfc || !nombre || !ap_paterno || !correo) {
      errs.push({ row, error:"Faltan RFC/nombre/ap_paterno/correo" }); return
    }
    ok.push({ rfc, nombre, ap_paterno, ap_materno, correo, id_genero, activo:true })
  })

  if (!ok.length) return { summary:{received,valid:0,inserted:0,errors:errs.length}, errors:errs }

  const { data, error } = await supabase.from("docente").insert(ok).select("id_docente")
  if (error) errs.push({ row:0, error: error.message })

  return { summary:{received, valid:ok.length, inserted:data?.length ?? 0, errors:errs.length}, errors:errs }
}
