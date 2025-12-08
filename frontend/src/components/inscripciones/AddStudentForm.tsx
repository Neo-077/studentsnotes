import { useRef, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import api from "../../lib/api"
import { Catalogos } from "../../lib/catalogos"
import { useTranslation } from "react-i18next"
import { getGenderLabel, getCareerLabel } from '../../lib/labels'
import { FiSave } from 'react-icons/fi'
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

// ————————————————————————————————————————————————————————————————
// CONFIG GENERAL
// ————————————————————————————————————————————————————————————————
const HARD_MAX_ISO = "2011-12-31"
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
// TIPOS
// ————————————————————————————————————————————————————————————————
type FormValues = {
  nombre: string
  ap_paterno: string
  ap_materno?: string
  id_genero: number
  id_carrera: number
  fecha_nacimiento?: string
}

// ————————————————————————————————————————————————————————————————
// MANEJO DE ERRORES
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

function extractErrorMessage(err: any, t: (k: string, o?: any) => string): string {
  const status = err?.response?.status
  const statusText = err?.response?.statusText
  const method = err?.config?.method?.toUpperCase?.()
  const url = err?.config?.url || err?.response?.config?.url
  const data = err?.response?.data

  const head = [status, statusText].filter(Boolean).join(" ")
  const meta = [method, url].filter(Boolean).join(" ")

  if (data && typeof data === "object") {
    const jsonMsg = (data as any).message || (data as any).error || (data as any).detail
    if (jsonMsg) {
      return [head, meta, String(jsonMsg)].filter(Boolean).join(" · ")
    }
    return [head, meta, JSON.stringify(data)].filter(Boolean).join(" · ")
  }

  if (typeof data === "string") {
    const readable = /<!doctype html>|<html/i.test(data) ? htmlToReadableMessage(data) : data
    return [head, meta, readable].filter(Boolean).join(" · ")
  }

  const base = err?.message || t("students.addForm.errors.unexpected")
  return [head, meta, base].filter(Boolean).join(" · ")
}

function guessCause(err: any, t: (k: string, o?: any) => string): string | null {
  const res = err?.response
  const data: unknown = res?.data
  const ct = res?.headers?.["content-type"] || ""

  if (typeof data === "string" && /html/i.test(ct)) {
    if ([301, 302, 303, 307, 308].includes(res?.status)) {
      return t("students.addForm.errors.redirectMaybeLogin")
    }
    if ([401, 403].includes(res?.status)) {
      return t("students.addForm.errors.unauthorized")
    }
    if (res?.status === 405) {
      return t("students.addForm.errors.methodNotAllowed")
    }
    if (res?.status === 404) {
      return t("students.addForm.errors.notFound")
    }
    if (res?.status >= 500) {
      return t("students.addForm.errors.serverError")
    }
  }

  if (res?.status === 415) {
    return t("students.addForm.errors.unsupportedMediaType")
  }

  return null
}

// ————————————————————————————————————————————————————————————————
// COMPONENTE
// ————————————————————————————————————————————————————————————————
export default function AddStudentForm({
  defaultCarreraId,
  anioCorte,
}: {
  defaultCarreraId?: number
  anioCorte?: number
}) {
  const { t, i18n } = useTranslation()
  const [generos, setGeneros] = useState<any[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const hasNativeDate = useMemo(() => supportsDateInput(), [])
  const dateRef = useRef<HTMLInputElement | null>(null)

  const anioCorteEff = useMemo(() => {
    const now = new Date()
    return anioCorte ?? now.getUTCFullYear()
  }, [anioCorte])

  const { minDate, maxDate, niceMin, niceMax } = useMemo(() => {
    const today = new Date()
    const todayFloorUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    )
    const min = addYearsUTC(todayFloorUTC, -100)

    const cutoff = new Date(Date.UTC(anioCorteEff - 18, 11, 31))
    const effectiveMax = new Date(Math.min(+cutoff, +HARD_MAX_DATE))

    const pad = (n: number) => String(n).padStart(2, "0")
    const toISO = (d: Date) =>
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
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

  // 🔊 Accesibilidad / voz
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (textToSpeak?: string) => {
    if (!voiceEnabled) return
    if (!textToSpeak) return
    if (!TTS.isSupported()) return

    // Solo forzamos inglés; para español dejamos que use la voz buena por defecto
    const lang = i18n.language?.startsWith("en") ? "en-US" : undefined

    TTS.speak(textToSpeak, { rate: voiceRate, lang })
  }

  // Para no repetir constantemente al mover el mouse
  const lastGenderHover = useRef<string | null>(null)
  const lastCareerHover = useRef<string | null>(null)

  // Labels e instrucciones por campo
  const firstNameLabel = t("students.addForm.fields.firstName")
  const firstNameInstructions = t(
    "students.addForm.tts.firstNameInstructions",
    "En este campo escribe el nombre o nombres del estudiante tal como aparecen en documentos oficiales."
  )

  const lastName1Label = t("students.addForm.fields.lastName1")
  const lastName1Instructions = t(
    "students.addForm.tts.lastName1Instructions",
    "En este campo escribe el apellido paterno del estudiante."
  )

  const lastName2Label = t("students.addForm.fields.lastName2")
  const lastName2Instructions = t(
    "students.addForm.tts.lastName2Instructions",
    "En este campo escribe el apellido materno del estudiante. Si no tiene, puedes dejarlo vacío."
  )

  const genderLabel = t("students.addForm.fields.gender")
  const genderInstructions = t(
    "students.addForm.tts.genderInstructions",
    "En esta lista desplegable selecciona el género del estudiante."
  )

  const careerLabel = t("students.addForm.fields.career")
  const careerInstructions = t(
    "students.addForm.tts.careerInstructions",
    "En esta lista desplegable selecciona la carrera a la que se inscribirá el estudiante."
  )

  const birthdateLabel = t("students.addForm.fields.birthdateLabel")
  const birthdateInstructions = hasNativeDate
    ? t(
      "students.addForm.tts.birthdateInstructionsNative",
      "En este campo selecciona la fecha de nacimiento del estudiante usando el calendario. Debe estar entre {{min}} y {{max}} para que tenga al menos 18 años en el año {{year}}.",
      { min: niceMin, max: niceMax, year: anioCorteEff }
    )
    : t(
      "students.addForm.tts.birthdateInstructionsText",
      "En este campo escribe la fecha de nacimiento del estudiante en formato día, mes y año, por ejemplo 31/12/2000. Debe estar entre {{min}} y {{max}} para que tenga al menos 18 años en el año {{year}}.",
      { min: niceMin, max: niceMax, year: anioCorteEff }
    )

  // Schema Zod con mensajes traducidos
  const schemaWithRefine = useMemo(() => {
    return z
      .object({
        nombre: z
          .string()
          .trim()
          .min(1, t("students.addForm.validation.required")),
        ap_paterno: z
          .string()
          .trim()
          .min(1, t("students.addForm.validation.required")),
        ap_materno: z.string().trim().optional(),
        id_genero: z.coerce
          .number()
          .int()
          .positive(t("students.addForm.validation.genderRequired")),
        id_carrera: z.coerce
          .number()
          .int()
          .positive(t("students.addForm.validation.careerRequired")),
        fecha_nacimiento: z.string().optional(),
      })
      .superRefine((val, ctx) => {
        if (!val.fecha_nacimiento) return

        const d = parseAsDate(val.fecha_nacimiento)
        if (!d) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fecha_nacimiento"],
            message: t("students.addForm.validation.dateInvalidFormat"),
          })
          return
        }

        const todayUTC = new Date()
        const todayFloorUTC = new Date(
          Date.UTC(
            todayUTC.getUTCFullYear(),
            todayUTC.getUTCMonth(),
            todayUTC.getUTCDate()
          )
        )
        const minAllowed = addYearsUTC(todayFloorUTC, -100)

        const cutoff = new Date(Date.UTC(anioCorteEff - 18, 11, 31))
        const effectiveMax = new Date(Math.min(+cutoff, +HARD_MAX_DATE))

        if (d < minAllowed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fecha_nacimiento"],
            message: t("students.addForm.validation.dateTooOld"),
          })
        }

        if (d > effectiveMax) {
          if (+cutoff <= +HARD_MAX_DATE && d > cutoff) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["fecha_nacimiento"],
              message: t(
                "students.addForm.validation.dateTooRecentByYear",
                {
                  year: anioCorteEff,
                  cutoff: cutoff.toISOString().slice(0, 10),
                }
              ),
            })
          } else {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["fecha_nacimiento"],
              message: t(
                "students.addForm.validation.dateTooRecentHard",
                { maxDate: HARD_MAX_ISO }
              ),
            })
          }
        }
      })
  }, [anioCorteEff, t])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schemaWithRefine),
    defaultValues: { id_carrera: defaultCarreraId ?? undefined },
  })

  useEffect(() => {
    Catalogos.generos().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      setGeneros(arr)
    })
    Catalogos.carreras().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      setCarreras(arr)
    })
  }, [i18n?.language])

  useEffect(() => {
    if (defaultCarreraId) {
      reset(prev => ({ ...prev, id_carrera: defaultCarreraId }))
    }
  }, [defaultCarreraId, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true)
      setMsg(null)
      setHint(null)

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
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      const createdMsg = t("students.addForm.messages.created")
        ; (await import('../../lib/notifyService')).default.notify({
          type: 'success',
          message: `${createdMsg}: ${clean.nombre} ${clean.ap_paterno}`,
        })
      reset({ id_carrera: defaultCarreraId } as Partial<FormValues>)
    } catch (e: any) {
      const details = extractErrorMessage(e, t)
      setMsg(t("students.addForm.messages.errorWithDetails", { details }))
      const cause = guessCause(e, t)
      if (cause) {
        setHint(
          t("students.addForm.hints.causePrefix", { cause })
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // sacamos refs especiales para fecha, género y carrera
  const { ref: rhfDateRef, ...dateField } = register("fecha_nacimiento")
  const { ref: rhfGenderRef, ...genderField } = register("id_genero")
  const { ref: rhfCareerRef, ...careerField } = register("id_carrera")

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border rounded-2xl p-4 shadow-soft space-y-3"
      noValidate
    >
      <h4 className="font-medium">
        {t("students.addForm.title")}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Nombre */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="nombre"
              className="text-xs text-slate-500"
            >
              {firstNameLabel}{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(firstNameInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: firstNameLabel }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <input
            id="nombre"
            className="border rounded-xl px-3 py-2"
            placeholder={firstNameLabel}
            aria-required="true"
            aria-label={firstNameLabel}
            autoComplete="given-name"
            onFocus={() => speak(firstNameLabel)}
            {...register("nombre")}
          />
          {errors.nombre && (
            <p className="text-xs text-red-600">
              {errors.nombre.message}
            </p>
          )}
        </div>

        {/* Apellido paterno */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="ap_paterno"
              className="text-xs text-slate-500"
            >
              {lastName1Label}{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(lastName1Instructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: lastName1Label }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <input
            id="ap_paterno"
            className="border rounded-xl px-3 py-2"
            placeholder={lastName1Label}
            aria-required="true"
            aria-label={lastName1Label}
            autoComplete="family-name"
            onFocus={() => speak(lastName1Label)}
            {...register("ap_paterno")}
          />
          {errors.ap_paterno && (
            <p className="text-xs text-red-600">
              {errors.ap_paterno.message}
            </p>
          )}
        </div>

        {/* Apellido materno */}
        <div className="grid gap-1 col-span-2 sm:col-span-1">
          <div className="flex itemscenter justify-between gap-2">
            <label
              htmlFor="ap_materno"
              className="text-xs text-slate-500"
            >
              {lastName2Label}
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(lastName2Instructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: lastName2Label }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <input
            id="ap_materno"
            className="border rounded-xl px-3 py-2"
            placeholder={lastName2Label}
            aria-label={lastName2Label}
            autoComplete="additional-name"
            onFocus={() => speak(lastName2Label)}
            {...register("ap_materno")}
          />
        </div>

        {/* Género */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="id_genero"
              className="text-xs text-slate-500"
            >
              {genderLabel}{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(genderInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: genderLabel }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <select
            id="id_genero"
            className="border rounded-xl px-3 py-2"
            defaultValue=""
            aria-required="true"
            aria-label={genderLabel}
            onFocus={() => speak(genderLabel)}
            {...genderField}
            ref={rhfGenderRef}
            onChange={(e) => {
              genderField.onChange(e)
              const selected = generos.find(
                (g: any) => String(g.id_genero) === e.target.value
              )
              if (selected) {
                const label = getGenderLabel(selected) || selected.descripcion || ""
                speak(`Género seleccionado: ${label}`)
              }
            }}
            onMouseMove={(e) => {
              const sel = e.currentTarget
              const opt = sel.options[sel.selectedIndex]
              if (!opt) return
              const text = opt.text
              if (lastGenderHover.current === text) return
              lastGenderHover.current = text
              speak(`Opción: ${text}`)
            }}
          >
            <option value="" disabled>
              {genderLabel}
            </option>
            {generos.map((g) => (
              <option key={g.id_genero} value={g.id_genero}>
                {getGenderLabel(g) || g.descripcion}
              </option>
            ))}
          </select>
          {errors.id_genero && (
            <p className="text-xs text-red-600">
              {errors.id_genero.message}
            </p>
          )}
        </div>

        {/* Carrera */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="id_carrera"
              className="text-xs text-slate-500"
            >
              {careerLabel}{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(careerInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: careerLabel }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <select
            id="id_carrera"
            className="border rounded-xl px-3 py-2"
            defaultValue={defaultCarreraId ?? ""}
            aria-required="true"
            aria-label={careerLabel}
            onFocus={() => speak(careerLabel)}
            {...careerField}
            ref={rhfCareerRef}
            onChange={(e) => {
              careerField.onChange(e)
              const selected = carreras.find(
                (c: any) => String(c.id_carrera) === e.target.value
              )
              if (selected) {
                const label = getCareerLabel(selected) || selected.nombre || ""
                speak(`Carrera seleccionada: ${label}`)
              }
            }}
            onMouseMove={(e) => {
              const sel = e.currentTarget
              const opt = sel.options[sel.selectedIndex]
              if (!opt) return
              const text = opt.text
              if (lastCareerHover.current === text) return
              lastCareerHover.current = text
              speak(`Opción: ${text}`)
            }}
          >
            <option value="" disabled>
              {careerLabel}
            </option>
            {carreras.map((c) => (
              <option key={c.id_carrera} value={c.id_carrera}>
                {getCareerLabel(c) || c.nombre}
              </option>
            ))}
          </select>
          {errors.id_carrera && (
            <p className="text-xs text-red-600">
              {errors.id_carrera.message}
            </p>
          )}
        </div>

        {/* Fecha de nacimiento */}
        <div className="grid gap-1 col-span-2">
          <div className="flex items-start justify-between gap-2">
            <label
              htmlFor="fecha_nacimiento"
              className="text-xs text-slate-500"
            >
              {birthdateLabel}{" "}
              <span className="text-red-500" aria-hidden="true">*</span>{" "}
              <span className="text-slate-400">
                (
                {hasNativeDate
                  ? t("students.addForm.fields.birthdateFormatNative")
                  : t("students.addForm.fields.birthdateFormatText")}
                ){" "}
                ·{" "}
                {t(
                  "students.addForm.fields.birthdateMustBe18InYear",
                  { year: anioCorteEff }
                )}
              </span>
            </label>

            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(birthdateInstructions)}
                className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t(
                  "students.addForm.tts.fieldHelpAria",
                  "Escuchar instrucciones del campo {{label}}",
                  { label: birthdateLabel }
                )}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t("students.addForm.tts.fieldHelpButton", "¿Qué debo escribir?")}</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              id="fecha_nacimiento"
              type={hasNativeDate ? "date" : "text"}
              className="h-10 w-full rounded-xl border px-3 pr-24 text-sm"
              aria-required="true"
              aria-label={birthdateLabel}
              min={hasNativeDate ? minDate : undefined}
              max={hasNativeDate ? maxDate : undefined}
              placeholder={
                hasNativeDate
                  ? t("students.addForm.fields.birthdateFormatNative")
                  : t("students.addForm.fields.birthdateFormatText")
              }
              inputMode={hasNativeDate ? undefined : "numeric"}
              pattern={hasNativeDate ? undefined : "\\d{2}/\\d{2}/\\d{4}"}
              onFocus={() => speak(birthdateLabel)}
              {...dateField}
              ref={el => {
                rhfDateRef(el)
                dateRef.current = el
              }}
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
              aria-label={t(
                "students.addForm.buttons.openCalendarAria",
                "Abrir selector de fecha de nacimiento"
              )}
            >
              {t("students.addForm.buttons.openCalendar")}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            {t("students.addForm.hints.range", {
              min: niceMin,
              max: niceMax,
              year: anioCorteEff,
            })}
          </p>

          {errors.fecha_nacimiento && (
            <p className="text-xs text-red-600">
              {errors.fecha_nacimiento.message}
            </p>
          )}
        </div>
      </div>

      {(errors.nombre ||
        errors.ap_paterno ||
        errors.id_genero ||
        errors.id_carrera ||
        errors.fecha_nacimiento) && (
          <p className="text-sm text-red-600">
            {t("students.addForm.validation.completeRequired")}
          </p>
        )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2 disabled:opacity-60 inline-flex items-center justify-center"
      >
        <FiSave className="mr-2" size={18} />
        {loading
          ? t("students.addForm.buttons.saving")
          : t("students.addForm.buttons.save")}
      </button>

      {msg && (
        <p className="text-sm whitespace-pre-wrap">
          {msg}
        </p>
      )}
      {hint && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
          {hint}
        </p>
      )}
    </form>
  )
}
