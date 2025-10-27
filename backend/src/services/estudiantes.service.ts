// src/services/estudiantes.service.ts
import { supabaseAdmin } from '../utils/supabaseClient.js'
import * as XLSX from 'xlsx'
import { z } from 'zod'

/** ========= Tipos alineados a la tabla `estudiante` ========= **/
export type CreateEstudianteInput = {
  nombre: string
  ap_paterno: string
  ap_materno?: string | null
  id_genero: number
  id_carrera: number
  /** ISO date 'YYYY-MM-DD' (opcional) */
  fecha_nacimiento?: string | null
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
  fecha_ingreso: string
  activo: boolean
}

/** ========= Helpers de normalización ========= **/
// Normaliza a NFC para evitar duplicado de acentos combinados.
const toNFC = (s: string) => s.normalize('NFC')
const clean = (v: unknown) => toNFC(String(v ?? '').trim())
// Versión que además pasa a MAYÚSCULAS en español (útiles Ñ/Á/É/Í/Ó/Ú)
const cleanUpper = (v: unknown) =>
  toNFC(String(v ?? '').trim()).toLocaleUpperCase('es-MX')

// Entero seguro o null
const toInt = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

// Normaliza para comparaciones/keys (quita acentos y minúsculas)
const norm = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

// Excel serial a ISO (corrige 1900-01-00 y zona UTC)
function excelSerialToISO(n: number): string | null {
  if (!Number.isFinite(n)) return null
  const epoch = new Date(Date.UTC(1899, 11, 30))
  const ms = Math.round(n * 24 * 3600 * 1000)
  const d = new Date(epoch.getTime() + ms)
  const y = d.getUTCFullYear()
  if (y < 1900 || y > 2100) return null
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function jsDateToISO(d: Date): string | null {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null
  const y = d.getFullYear()
  if (y < 1900 || y > 2100) return null
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function toISOAny(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return excelSerialToISO(v)
  if (v instanceof Date) return jsDateToISO(v)
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

/** ========= Zod para validar payloads ========= **/
const estudianteSchema = z.object({
  nombre: z.string().min(1),
  ap_paterno: z.string().min(1),
  ap_materno: z.string().nullable().optional(),
  id_genero: z.number().int().positive(),
  id_carrera: z.number().int().positive(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
    .nullable()
    .optional(),
  activo: z.boolean().default(true),
})

/** ========= Mapeo de encabezados flexibles ========= **/
const HEADER_MAP: Record<string, string> = {
  nombre: 'nombre',
  'ap_paterno': 'ap_paterno',
  'apellido paterno': 'ap_paterno',
  'apellido_paterno': 'ap_paterno',
  'ap_materno': 'ap_materno',
  'apellido materno': 'ap_materno',
  'apellido_materno': 'ap_materno',
  genero: 'genero',
  'género': 'genero',
  sexo: 'genero',
  id_genero: 'id_genero',
  carrera: 'carrera',
  id_carrera: 'id_carrera',
  fecha_nacimiento: 'fecha_nacimiento',
  'fecha nacimiento': 'fecha_nacimiento',
  'fecha de nacimiento': 'fecha_nacimiento',
}

/** ========= Crear un estudiante (nombres en MAYÚSCULAS) ========= **/
export async function createEstudiante(input: CreateEstudianteInput) {
  const payload = {
    nombre: cleanUpper(input.nombre),
    ap_paterno: cleanUpper(input.ap_paterno),
    ap_materno: input.ap_materno ? cleanUpper(input.ap_materno) : null,
    id_genero: input.id_genero,
    id_carrera: input.id_carrera,
    fecha_nacimiento: toISOAny(input.fecha_nacimiento),
    activo: true,
  }

  estudianteSchema.parse(payload)

  const { data, error } = await supabaseAdmin
    .from('estudiante')
    .insert(payload)
    .select(
      'id_estudiante,no_control,nombre,ap_paterno,ap_materno,id_carrera,id_genero,fecha_nacimiento,fecha_ingreso,activo'
    )
    .single()

  if (error) throw new Error(error.message)
  return data as Estudiante
}

/** ========= Listar (búsqueda flexible) ========= **/
export async function listEstudiantes(params: {
  q?: string
  id_carrera?: number
  page?: number
  pageSize?: number
}) {
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize ?? 20)))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabaseAdmin
    .from('estudiante')
    .select(
      'id_estudiante,no_control,nombre,ap_paterno,ap_materno,id_carrera,id_genero,fecha_nacimiento,fecha_ingreso,activo,carrera:id_carrera(id_carrera,clave,nombre),genero:id_genero(id_genero,descripcion)',
      { count: 'exact' }
    )
    .order('id_estudiante', { ascending: false })

  if (params.id_carrera) q = q.eq('id_carrera', params.id_carrera)

  // Aunque guardemos en MAYÚSCULAS, usamos ILIKE para que el usuario pueda escribir en cualquier caso.
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`
    q = q.or(
      `no_control.ilike.${like},nombre.ilike.${like},ap_paterno.ilike.${like},ap_materno.ilike.${like}`
    )
  }

  const { data, error, count } = await q.range(from, to)
  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as Estudiante[], page, pageSize, total: count ?? 0 }
}

/** ========= Tipos para el import ========= **/
type BulkResult = {
  summary: { received: number; valid: number; inserted: number; errors: number }
  errors: Array<{ row: number; error: string }>
}

/** ========= Importación masiva (convierte nombres a MAYÚSCULAS) ========= **/
export async function bulkUpsertEstudiantes(fileBuffer: Buffer): Promise<BulkResult> {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
      codepage: 65001,
    })
  } catch (e: any) {
    return {
      summary: { received: 0, valid: 0, inserted: 0, errors: 1 },
      errors: [{ row: 1, error: `Archivo inválido: ${e?.message ?? 'error al leer'}` }],
    }
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws)
    return {
      summary: { received: 0, valid: 0, inserted: 0, errors: 1 },
      errors: [{ row: 1, error: 'Archivo vacío' }],
    }

  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as Record<string, any>[]
  const received = rawRows.length
  if (!received) return { summary: { received: 0, valid: 0, inserted: 0, errors: 0 }, errors: [] }

  // 1) Mapear encabezados flexibles
  const mappedRows = rawRows.map((r) => {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(r)) {
      const key = HEADER_MAP[norm(k)]
      if (key) out[key] = v
    }
    return out
  })

  // 2) Catálogos
  const [gen, car] = await Promise.all([
    supabaseAdmin.from('genero').select('id_genero, clave, descripcion'),
    supabaseAdmin.from('carrera').select('id_carrera, clave, nombre'),
  ])
  if (gen.error) throw gen.error
  if (car.error) throw car.error

  const generoByText = new Map<string, number>()
  for (const g of gen.data ?? []) {
    generoByText.set(norm(g.descripcion), g.id_genero)
    if (g.clave) generoByText.set(norm(g.clave), g.id_genero)
    if (norm(g.descripcion).startsWith('m')) generoByText.set('m', g.id_genero)
    if (norm(g.descripcion).startsWith('f')) generoByText.set('f', g.id_genero)
  }

  const carreraByClave = new Map<string, number>()
  const carreraByNombre = new Map<string, number>()
  for (const c of car.data ?? []) {
    if (c.clave) carreraByClave.set(norm(c.clave), c.id_carrera)
    carreraByNombre.set(norm(c.nombre), c.id_carrera)
  }

  // 3) Validar y construir payload (NOMBRES EN MAYÚSCULAS)
  const ok: Array<z.infer<typeof estudianteSchema>> = []
  const errors: Array<{ row: number; error: string }> = []

  mappedRows.forEach((r, idx) => {
    const rowNum = idx + 2
    const filled = Object.values(r ?? {}).some((v) => String(v ?? '').trim() !== '')
    if (!filled) return

    const nombre = cleanUpper(r.nombre)
    const ap_paterno = cleanUpper(r.ap_paterno)
    const ap_materno = r.ap_materno ? cleanUpper(r.ap_materno) : null
    if (!nombre || !ap_paterno) {
      errors.push({ row: rowNum, error: 'Falta nombre o apellido paterno' })
      return
    }

    // Género
    let id_genero = toInt(r.id_genero)
    if (!id_genero && r.genero) {
      const gkey = norm(r.genero)
      id_genero = generoByText.get(gkey) ?? null
    }
    if (!id_genero) {
      errors.push({ row: rowNum, error: `Género no válido (${r.genero ?? r.id_genero ?? ''})` })
      return
    }

    // Carrera
    let id_carrera = toInt(r.id_carrera)
    if (!id_carrera && r.carrera) {
      const ckey = norm(r.carrera)
      id_carrera = carreraByClave.get(ckey) ?? carreraByNombre.get(ckey) ?? null
    }
    if (!id_carrera) {
      errors.push({ row: rowNum, error: `Carrera no válida (${r.carrera ?? r.id_carrera ?? ''})` })
      return
    }

    const fecha_nacimiento = toISOAny(r.fecha_nacimiento ?? null)

    const parse = estudianteSchema.safeParse({
      nombre,
      ap_paterno,
      ap_materno,
      id_genero,
      id_carrera,
      fecha_nacimiento,
      activo: true,
    })
    if (!parse.success) {
      const msg = parse.error.issues.map((i) => i.message).join('; ')
      errors.push({ row: rowNum, error: msg || 'Fila inválida' })
      return
    }

    ok.push(parse.data)
  })

  if (!ok.length)
    return { summary: { received, valid: 0, inserted: 0, errors: errors.length }, errors }

  // 4) Inserción
  const { data, error } = await supabaseAdmin
    .from('estudiante')
    .insert(ok) // Inserta ya en MAYÚSCULAS
    .select('id_estudiante')

  if (error) errors.push({ row: 0, error: error.message })

  return {
    summary: {
      received,
      valid: ok.length,
      inserted: data?.length ?? 0,
      errors: errors.length,
    },
    errors,
  }
}
