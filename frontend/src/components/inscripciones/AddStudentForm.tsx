import { useRef, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import api from "../../lib/api"
import { Catalogos } from "../../lib/catalogos"

// ————————————————————————————————————————————————————————————————
// CONFIG GENERAL
// ————————————————————————————————————————————————————————————————
const HARD_MAX_ISO = "2011-12-31"                 // tope absoluto institucional (si aplica)
const HARD_MAX_DATE = new Date("2011-12-31T00:00:00Z")

const supportsDateInput = () => {
  if (typeof window === "undefined") return true
  const i = document.createElement("input")
  i.setAttribute("type", "date")
  return i.type === "date"
}

function addYearsUTC(base: Date, years: number): Date {
  const y = base.getUTCFullYear() + years
  const m = base.getUTCMonth()
  const d = base.getUTCDate()
  const tmp = new Date(Date.UTC(y, m, 1))
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  tmp.setUTCDate(Math.min(d, lastDay))
  return tmp
}

// Parse YYYY-MM-DD o dd/mm/aaaa a Date UTC
function parseAsDate(value?: string | null): Date | null {
  if (!value) return null
  const s = value.trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`)
    return isNaN(+d) ? null : d
  }
  const lat = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (lat) {
    const d = new Date(`${lat[3]}-${lat[2]}-${lat[1]}T00:00:00Z`)
    return isNaN(+d) ? null : d
  }
  return null
}

// ————————————————————————————————————————————————————————————————
// SCHEMA ZOD (18 años cumplidos durante el año de ingreso)
// ————————————————————————————————————————————————————————————————
const schema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  ap_paterno: z.string().trim().min(1, "Requerido"),
  ap_materno: z.string().trim().optional(),
  id_genero: z.coerce.number().int().positive("Selecciona un género"),
  id_carrera: z.coerce.number().int().positive("Selecciona una carrera"),
  fecha_nacimiento: z.string().optional(), // YYYY-MM-DD o dd/mm/aaaa
})

type FormValues = z.infer<typeof schema>

// ————————————————————————————————————————————————————————————————
// MANEJO DE ERRORES (igual que tenías)
// ————————————————————————————————————————————————————————————————
function htmlToReadableMessage(html: string): string {
  const get = (re: RegExp) => html.match(re)?.[1]?.replace(/<[^>]+>/g, "").trim()
  const title = get(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const h1 = get(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const pre = get(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return pre || h1 || title || plain.slice(0, 200)
}

function extractErrorMessage(err: any): string {
  const status = err?.response?.status
  const statusText = err?.response?.statusText
  const method = err?.config?.method?.toUpperCase?.()
  const url = err?.config?.url || err?.response?.config?.url
  const data = err?.response?.data
  if (data && typeof data === "object") {
    const jsonMsg = (data.message || data.error || data.detail)
    if (jsonMsg) {
      const head = [status, statusText].filter(Boolean).join(" ")
      const meta = [method, url].filter(Boolean).join(" ")
      return [head, meta, String(jsonMsg)].filter(Boolean).join(" · ")
    }
    const head = [status, statusText].filter(Boolean).join(" ")
    const meta = [method, url].filter(Boolean).join(" ")
    return [head, meta, JSON.stringify(data)].filter(Boolean).join(" · ")
  }
  if (typeof data === "string") {
    const readable = /<!doctype html>|<html/i.test(data) ? htmlToReadableMessage(data) : data
    const head = [status, statusText].filter(Boolean).join(" ")
    const meta = [method, url].filter(Boolean).join(" ")
    return [head, meta, readable].filter(Boolean).join(" · ")
  }
  const head = [status, statusText].filter(Boolean).join(" ")
  const meta = [method, url].filter(Boolean).join(" ")
  const base = err?.message || "Error inesperado"
  return [head, meta, base].filter(Boolean).join(" · ")
}

function guessCause(err: any): string | null {
  const res = err?.response
  const data: unknown = res?.data
  const ct = res?.headers?.["content-type"] || ""
  if (typeof data === "string" && /html/i.test(ct)) {
    if ([301,302,303,307,308].includes(res?.status)) return "Parece redirección (¿a login?). Revisa autenticación/cookies."
    if ([401,403].includes(res?.status)) return "No autorizado/prohibido. Verifica sesión, token o CSRF."
    if (res?.status === 405) return "Método no permitido. Confirma que la ruta acepta POST."
    if (res?.status === 404) return "Ruta no encontrada. Verifica el endpoint."
    if (res?.status >= 500) return "Error del servidor. Revisa logs del backend."
  }
  if (res?.status === 415) return "Unsupported Media Type. Asegura Content-Type: application/json y body parser."
  return null
}

// ————————————————————————————————————————————————————————————————
// COMPONENTE
// ————————————————————————————————————————————————————————————————
export default function AddStudentForm({
  defaultCarreraId,
  anioCorte, // ← Año del ciclo/periodo de ingreso (p.ej., 2025 para Ago–Dic 2025)
}: {
  defaultCarreraId?: number
  anioCorte?: number
}) {
  const [generos, setGeneros] = useState<any[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const hasNativeDate = useMemo(() => supportsDateInput(), [])
  const dateRef = useRef<HTMLInputElement | null>(null)

  // Año de corte efectivo: si no viene, usamos el año actual UTC
  const anioCorteEff = useMemo(() => {
    const now = new Date()
    return anioCorte ?? now.getUTCFullYear()
  }, [anioCorte])

  // Para UI: min (100 años) y max (31-dic del añoCorte-18, además del HARD_MAX)
  const { minDate, maxDate, niceMin, niceMax } = useMemo(() => {
    const today = new Date()
    const todayFloorUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    ))
    const min = addYearsUTC(todayFloorUTC, -100)

    // Regla: “debe cumplir 18 durante el año de ingreso”
    // → fecha de nacimiento ≤ 31-dic-(anioCorteEff - 18)
    const cutoff = new Date(Date.UTC(anioCorteEff - 18, 11, 31))

    // Tope efectivo: el más estricto entre la regla de año y HARD_MAX_DATE
    const effectiveMax = new Date(Math.min(+cutoff, +HARD_MAX_DATE))

    const pad = (n: number) => String(n).padStart(2, "0")
    const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const toNice = (iso: string) => iso.split("-").reverse().join("/")

    const _minISO = toISO(min)
    const _maxISO = toISO(effectiveMax)

    return {
      minDate: _minISO,
      maxDate: _maxISO,
      niceMin: toNice(_minISO),
      niceMax: toNice(_maxISO),
    }
  }, [anioCorteEff])

  // Zod con superRefine que usa el mismo criterio de año
  const schemaWithRefine = useMemo(() => {
    return schema.superRefine((val, ctx) => {
      if (!val.fecha_nacimiento) return

      const d = parseAsDate(val.fecha_nacimiento)
      if (!d) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_nacimiento"],
          message: "Formato inválido. Usa aaaa-mm-dd o dd/mm/aaaa",
        })
        return
      }

      const todayUTC = new Date()
      const todayFloorUTC = new Date(Date.UTC(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth(),
        todayUTC.getUTCDate()
      ))
      const minAllowed = addYearsUTC(todayFloorUTC, -100)

      const cutoff = new Date(Date.UTC(anioCorteEff - 18, 11, 31)) // 31-dic-(anioCorte-18)
      const effectiveMax = new Date(Math.min(+cutoff, +HARD_MAX_DATE))

      if (d < minAllowed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_nacimiento"],
          message: "Fecha demasiado antigua (máximo 100 años atrás).",
        })
      }

      if (d > effectiveMax) {
        // Si el límite proviene de la regla de 18-en-el-año, aclarar el año
        if (+cutoff <= +HARD_MAX_DATE && d > cutoff) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fecha_nacimiento"],
            message: `Debes cumplir 18 durante ${anioCorteEff} (nacido(a) el ${cutoff.toISOString().slice(0,10)} o antes).`,
          })
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fecha_nacimiento"],
            message: `La fecha no puede ser posterior a ${HARD_MAX_ISO}.`,
          })
        }
      }
    })
  }, [anioCorteEff])

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schemaWithRefine),
    defaultValues: { id_carrera: defaultCarreraId ?? undefined },
  })

  useEffect(() => {
    Catalogos.generos().then(setGeneros)
    Catalogos.carreras().then(setCarreras)
  }, [])

  useEffect(() => {
    if (defaultCarreraId) reset(prev => ({ ...prev, id_carrera: defaultCarreraId }))
  }, [defaultCarreraId, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true)
      setMsg(null)
      setHint(null)

      // normaliza a YYYY-MM-DD si viene dd/mm/aaaa
      let fechaISO: string | null = values.fecha_nacimiento?.trim() || null
      if (fechaISO && !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
        const m = fechaISO.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) fechaISO = `${m[3]}-${m[2]}-${m[1]}`
      }

      const clean = {
        nombre: values.nombre.trim(),
        ap_paterno: values.ap_paterno.trim(),
        ap_materno: values.ap_materno?.trim() || null,
        id_genero: Number(values.id_genero),
        id_carrera: Number(values.id_carrera),
        fecha_nacimiento: fechaISO,
      }

      await api.post("/estudiantes", clean, {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      })

      setMsg("✅ Estudiante creado")
      reset({ id_carrera: defaultCarreraId } as Partial<FormValues>)
    } catch (e: any) {
      setMsg("❌ " + extractErrorMessage(e))
      const h = guessCause(e)
      if (h) setHint("🔎 " + h)
    } finally {
      setLoading(false)
    }
  }

  const { ref: rhfDateRef, ...dateField } = register("fecha_nacimiento")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-2xl p-4 shadow-soft space-y-3" noValidate>
      <h4 className="font-medium">Agregar estudiante</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <input className="border rounded-xl px-3 py-2" placeholder="Nombre(s)*" autoComplete="given-name" {...register("nombre")} />
          {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
        </div>

        <div className="grid gap-1">
          <input className="border rounded-xl px-3 py-2" placeholder="Apellido paterno*" autoComplete="family-name" {...register("ap_paterno")} />
          {errors.ap_paterno && <p className="text-xs text-red-600">{errors.ap_paterno.message}</p>}
        </div>

        <input className="border rounded-xl px-3 py-2 col-span-2 sm:col-span-1" placeholder="Apellido materno" autoComplete="additional-name" {...register("ap_materno")} />

        <div className="grid gap-1">
          <select className="border rounded-xl px-3 py-2" defaultValue="" {...register("id_genero")}>
            <option value="" disabled>Género</option>
            {generos.map((g) => <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
          </select>
          {errors.id_genero && <p className="text-xs text-red-600">{errors.id_genero.message}</p>}
        </div>

        <div className="grid gap-1">
          <select className="border rounded-xl px-3 py-2" defaultValue={defaultCarreraId ?? ""} {...register("id_carrera")}>
            <option value="" disabled>Carrera</option>
            {carreras.map((c) => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>)}
          </select>
          {errors.id_carrera && <p className="text-xs text-red-600">{errors.id_carrera.message}</p>}
        </div>

        <div className="grid gap-1 col-span-2">
          <label htmlFor="fecha_nacimiento" className="text-xs text-slate-500">
            Fecha de nacimiento{" "}
            <span className="text-slate-400">
              ({hasNativeDate ? "aaaa-mm-dd" : "dd/mm/aaaa"}) · Debe cumplir 18 en {anioCorteEff}
            </span>
          </label>

          <div className="relative">
            <input
              id="fecha_nacimiento"
              type={hasNativeDate ? "date" : "text"}
              className="h-10 w-full rounded-xl border px-3 pr-24 text-sm"
              min={hasNativeDate ? minDate : undefined}
              max={hasNativeDate ? maxDate : undefined} // ≤ 31-dic-(anioCorte-18) y ≤ HARD_MAX
              placeholder={hasNativeDate ? "aaaa-mm-dd" : "dd/mm/aaaa"}
              inputMode={hasNativeDate ? undefined : "numeric"}
              pattern={hasNativeDate ? undefined : "\\d{2}/\\d{2}/\\d{4}"}
              {...dateField}
              ref={(el) => { rhfDateRef(el); dateRef.current = el }}
            />
            <button
              type="button"
              onClick={() => {
                const el = dateRef.current
                // @ts-ignore
                if (el && typeof el.showPicker === "function") el.showPicker()
                else el?.focus()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Calendario
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Rango permitido: {niceMin} – {niceMax}. {`(Corte por año ${anioCorteEff}: 18 años cumplidos en el año de ingreso)`}
          </p>
          {errors.fecha_nacimiento && (
            <p className="text-xs text-red-600">{errors.fecha_nacimiento.message}</p>
          )}
        </div>
      </div>

      {(errors.nombre || errors.ap_paterno || errors.id_genero || errors.id_carrera) && (
        <p className="text-sm text-red-600">Completa los campos obligatorios.</p>
      )}

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-xl py-2 disabled:opacity-60">
        {loading ? "Guardando..." : "Guardar estudiante"}
      </button>

      {msg && <p className="text-sm whitespace-pre-wrap">{msg}</p>}
      {hint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">{hint}</p>}
    </form>
  )
}
