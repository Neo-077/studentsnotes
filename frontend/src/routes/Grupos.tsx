// src/routes/Grupos.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Catalogos } from "../lib/catalogos"
import confirmService from "../lib/confirmService"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import api from "../lib/api"
import * as XLSX from "xlsx"
import { FiDownload, FiUpload, FiPlus } from "react-icons/fi"
import {
  getSubjectLabel,
  getCareerLabel,
  formatHorario,
  getGenericLabel,
  getTermLabel,
} from "../lib/labels"
import { useAccessibility } from "../store/useAccessibility"
import { TTS } from "../lib/tts"

type Grupo = {
  id_grupo: number
  grupo_codigo: string
  horario: string
  cupo: number
  materia?: {
    id_materia?: number
    nombre: string
    carrera?: any
    carrera_nombre?: string
  }
  docente?: { nombre: string; ap_paterno: string | null; ap_materno: string | null }
  modalidad?: { nombre: string }
}

const HORARIOS = Array.from({ length: 15 }, (_, i) => {
  const start = 7 + i
  const end = start + 1
  const pad = (n: number) => String(n).padStart(2, "0")
  return `LUN-VIE ${pad(start)}:00-${pad(end)}:00`
})

export default function Grupos() {
  const { t, i18n } = useTranslation()

  // 🔊 accesibilidad / voz
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    const lang = i18n.language?.startsWith("en") ? "en-US" : undefined
    TTS.speak(text, { rate: voiceRate, lang })
  }

  const isEn = i18n.language?.startsWith("en")

  // —————————————————————————————
  // EXPLICACIONES DE SECCIONES / CAMPOS
  // —————————————————————————————
  const filtersSectionInstructions = t(
    "groups.tts.filtersSection",
    "En esta parte puedes filtrar los grupos por término, carrera y materia, así como buscar por código, nombre de materia o docente. Los resultados de la tabla de abajo se actualizan según estos filtros."
  )
  const formSectionInstructions = t(
    "groups.tts.formSection",
    "En esta sección puedes crear un nuevo grupo en tres pasos: primero define la carrera y la materia; después el docente y la modalidad; por último el horario y el cupo. Al terminar presiona el botón Crear grupo."
  )
  const tableSectionInstructions = t(
    "groups.tts.tableSection",
    "Esta tabla muestra la lista de grupos existentes. Cada fila corresponde a un grupo con su materia, carrera, código de grupo, docente, modalidad, horario y cupo. Cada celda puede leerse con la voz indicando la columna, el valor y la materia de esa fila."
  )

  const termFilterInstructions = t(
    "groups.tts.filters.term",
    "En este campo seleccionas el término o periodo académico para el cual quieres ver los grupos. Puedes elegir un periodo específico o dejar la opción de todos los términos."
  )
  const careerFilterInstructions = t(
    "groups.tts.filters.career",
    "En este selector eliges la carrera para filtrar los grupos mostrados. Solo se mostrarán los grupos de la carrera seleccionada."
  )
  const subjectFilterInstructions = t(
    "groups.tts.filters.subject",
    "En este selector eliges una materia específica para filtrar los grupos mostrados en la tabla."
  )
  const searchFilterInstructions = t(
    "groups.tts.filters.search",
    "En este cuadro puedes buscar grupos escribiendo parte del nombre de la materia, el código del grupo o el nombre del docente."
  )

  const downloadTemplateInstructions = t(
    "groups.tts.downloadTemplate",
    "El botón descargar plantilla genera un archivo de Excel con el formato correcto para capturar grupos de forma masiva. Descarga el archivo, rellena la hoja de GRUPOS siguiendo las listas de referencia y después usa el botón de importar archivo para subirlos al sistema."
  )
  const importFileInstructions = t(
    "groups.tts.importFile",
    "El botón importar archivo te permite subir un archivo de Excel o CSV con grupos cargados en la plantilla. El sistema validará la información e insertará los grupos correctos, mostrando un resumen de inserciones y errores."
  )

  const formCareerInstructions = t(
    "groups.tts.form.career",
    "Aquí seleccionas la carrera a la que pertenecerá el grupo. Esta selección acotará las materias disponibles más adelante."
  )
  const formSubjectInstructions = t(
    "groups.tts.form.subject",
    "En este campo seleccionas la materia para el nuevo grupo. Solo se deben usar materias válidas para la carrera y el término seleccionados."
  )
  const formTeacherInstructions = t(
    "groups.tts.form.teacher",
    "En este campo eliges el docente responsable del grupo. El sistema revisará que el docente no tenga conflicto de horario en el mismo término."
  )
  const formModalityInstructions = t(
    "groups.tts.form.modality",
    "En este campo seleccionas la modalidad del grupo, por ejemplo presencial, en línea o mixta."
  )
  const formScheduleInstructions = t(
    "groups.tts.form.schedule",
    "En este campo eliges el horario del grupo. El formato típico es lunes a viernes con una hora de inicio y una hora de fin."
  )
  const formCapacityInstructions = t(
    "groups.tts.form.capacity",
    "En este campo puedes indicar el cupo máximo de estudiantes para el grupo. Si lo dejas vacío se usará un valor por defecto de treinta estudiantes."
  )

  // ===== filtros superiores =====
  const [terminos, setTerminos] = useState<any[]>([])
  const [terminoId, setTerminoId] = useState<number | null>(null)
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materiaId, setMateriaId] = useState<number | null>(null)

  // ===== catálogos =====
  const [docentes, setDocentes] = useState<any[]>([])
  const [modalidades, setModalidades] = useState<any[]>([])
  const [materias, setMaterias] = useState<any[]>([])

  // ===== datos =====
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [query, setQuery] = useState<string>(() => {
    try {
      return localStorage.getItem("grupos.query") ?? ""
    } catch {
      return ""
    }
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<{
    open: boolean
    id?: number
    label?: string
  }>({
    open: false,
  })
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([])
  // paginación
  const [page, setPage] = useState(1)
  const pageSize = 15

  // ===== formulario =====
  const [form, setForm] = useState({
    id_materia: null as number | null,
    id_docente: null as number | null,
    id_termino: null as number | null,
    id_modalidad: null as number | null,
    horario: "",
    cupo: "",
  })
  const [saving, setSaving] = useState(false)

  // refs para hover de selects (para no repetir voz a cada pixel)
  const lastTermHover = useRef<string | null>(null)
  const lastSubjectHover = useRef<string | null>(null)
  const lastTeacherHover = useRef<string | null>(null)
  const lastModalityHover = useRef<string | null>(null)
  const lastScheduleHover = useRef<string | null>(null)

  // boot
  useEffect(() => {
    async function boot() {
      const [tCat, d, m] = await Promise.all([
        Catalogos.terminos(),
        Catalogos.docentes(),
        Catalogos.modalidades(),
      ])
      setTerminos(tCat ?? [])
      setDocentes(d ?? [])
      setModalidades(m ?? [])
      const saved = Number(localStorage.getItem("grupos.terminoId") || "")
      if (saved && (tCat ?? []).some((x: any) => x.id_termino === saved)) {
        setTerminoId(saved)
        setForm((f) => ({ ...f, id_termino: saved }))
      } else {
        setTerminoId(null)
        setForm((f) => ({ ...f, id_termino: null }))
      }
    }
    void boot()
  }, [i18n?.language])

  // materias por carrera
  useEffect(() => {
    async function loadMaterias() {
      const mats = await Catalogos.materias(carreraId ? { carrera_id: carreraId } : undefined)
      setMaterias(mats ?? [])
    }
    void loadMaterias()
  }, [carreraId, i18n?.language])

  // actualizar id_materia del formulario cuando se elige materia en el filtro
  useEffect(() => {
    if (materiaId) setForm((f) => ({ ...f, id_materia: materiaId }))
  }, [materiaId])

  // cargar grupos
  const reqRef = useRef(0)
  async function load(silent = false) {
    const my = ++reqRef.current
    if (!silent) setLoading(true)
    setErr(null)
    try {
      const q = new URLSearchParams()
      if (terminoId) q.set("termino_id", String(terminoId))
      if (carreraId) q.set("carrera_id", String(carreraId))
      if (materiaId) q.set("materia_id", String(materiaId))
      const qs = q.toString()
      let path = qs ? `/grupos?${qs}` : "/grupos"
      if (i18n?.language && String(i18n.language).startsWith("en")) {
        path += (path.includes("?") ? "&" : "?") + "lang=en"
      }
      const data = await api.get(path)
      if (reqRef.current === my) setGrupos(data || [])
    } catch (e: any) {
      if (reqRef.current === my) setErr(e.message || t("groups.errors.loadFailed"))
    } finally {
      if (reqRef.current === my && !silent) {
        setLoading(false)
      }
    }
  }
  useEffect(() => {
    setPage(1)
    void load()
  }, [terminoId, carreraId, materiaId, i18n?.language])

  // refrescar en segundo plano
  useEffect(() => {
    const handler = () => void load(true)
    const visHandler = () => {
      if (document.visibilityState === "visible") handler()
    }
    window.addEventListener("focus", handler)
    document.addEventListener("visibilitychange", visHandler)
    window.addEventListener("pageshow", handler)
    window.addEventListener("online", handler)
    return () => {
      window.removeEventListener("focus", handler)
      window.removeEventListener("online", handler)
      window.removeEventListener("pageshow", handler)
      document.removeEventListener("visibilitychange", visHandler)
    }
  }, [])

  // Persistir selecciones
  useEffect(() => {
    if (terminoId) localStorage.setItem("grupos.terminoId", String(terminoId))
  }, [terminoId])

  const lista = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return grupos
    return grupos.filter((g) => {
      const mat = (getSubjectLabel(g.materia) || g.materia?.nombre || "").toLowerCase()
      const cod = g.grupo_codigo?.toLowerCase() || ""
      const doc = `${g.docente?.nombre || ""} ${g.docente?.ap_paterno || ""}`.toLowerCase()
      return mat.includes(q) || cod.includes(q) || doc.includes(q)
    })
  }, [grupos, query])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(lista.length / pageSize)),
    [lista.length]
  )
  const pageSafe = Math.min(page, totalPages)
  const start = (pageSafe - 1) * pageSize
  const end = start + pageSize
  const paged = useMemo(() => lista.slice(start, end), [lista, start, end])

  // Persistir query en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("grupos.query", query)
    } catch {
      // noop
    }
  }, [query])

  // ===== crear grupo =====
  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (!form.id_materia) return setMsg(t("groups.messages.selectSubject"))
    if (!form.id_docente) return setMsg(t("groups.messages.selectTeacher"))
    if (!form.id_modalidad) return setMsg(t("groups.messages.selectModality"))
    if (!form.horario.trim()) return setMsg(t("groups.messages.scheduleRequired"))

    const payload = {
      id_materia: form.id_materia,
      id_docente: form.id_docente,
      id_termino: form.id_termino,
      id_modalidad: form.id_modalidad,
      horario: form.horario.trim(),
      cupo: form.cupo ? Number(form.cupo) : 30,
    }

    try {
      // Validación de choque
      const q = new URLSearchParams()
      q.set("docente_id", String(payload.id_docente))
      q.set("termino_id", String(payload.id_termino))
      q.set("horario", payload.horario)
      let conflictosPath = `/grupos?${q.toString()}`
      if (i18n?.language && String(i18n.language).startsWith("en")) conflictosPath += "&lang=en"
      const conflictos = await api.get(conflictosPath)
      if (Array.isArray(conflictos) && conflictos.length > 0) {
        return setMsg(t("groups.messages.teacherConflict"))
      }

      setSaving(true)
      await api.post("/grupos", payload, { skipConfirm: true } as any)
      const createdMsg = t("groups.messages.created")
        ; (await import("../lib/notifyService")).default.notify({
          type: "success",
          message: `${createdMsg}: ${payload.id_materia ? payload.id_materia : ""}`,
        })
      setForm((f) => ({ ...f, horario: "", cupo: "" }))
      await load()
      setPage(1)
    } catch (e: any) {
      setMsg(
        (t("groups.messages.createErrorPrefix") as string) +
        (e.message || t("groups.messages.createGenericError"))
      )
    } finally {
      setSaving(false)
    }
  }

  // ===== importar por Excel/CSV =====
  async function onUpload(file: File) {
    setMsg(null)
    setImportErrors([])
    try {
      // Detectar término del archivo
      let detectedTerminoId: number | null = null
      try {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: "array", cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        if (ws) {
          const rows = XLSX.utils.sheet_to_json(ws, {
            defval: "",
            raw: true,
          }) as Record<string, any>[]
          const terms = new Set<string>()
          for (const r of rows) {
            const kv = Object.entries(r)
            const entry = kv.find(
              ([k]) =>
                String(k)
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/\p{Diacritic}/gu, "") === "termino"
            )
            if (entry && entry[1]) terms.add(String(entry[1]))
          }
          if (terms.size === 1) {
            const label = Array.from(terms)[0]
            const m = String(label).toUpperCase().match(/^(\d{4})\s+([A-ZÁÉÍÓÚ\-]+)/)
            if (m) {
              const anio = Number(m[1])
              const periodo = m[2].replace(/\s+/g, "-")
              const tTerm = (terminos ?? []).find(
                (x: any) => x.anio === anio && String(x.periodo).toUpperCase() === periodo
              )
              if (tTerm) detectedTerminoId = tTerm.id_termino
            }
          }
        }
      } catch {
        // ignore detection errors
      }

      const fd = new FormData()
      fd.append("file", file, file.name)
      const res = await api.post("/grupos/bulk", fd as any)

      const baseMsg = t("groups.messages.importSummaryBase", {
        inserted: res.summary.inserted,
        errors: res.summary.errors,
      })
      const dupMsg = res?.summary?.duplicatesSkipped
        ? t("groups.messages.importDuplicatesSkipped", {
          count: res.summary.duplicatesSkipped,
        })
        : ""
        ; (await import("../lib/notifyService")).default.notify({
          type: "success",
          message: `${baseMsg}${dupMsg}`,
        })

      if (Array.isArray(res.errors)) setImportErrors(res.errors)

      if (detectedTerminoId) {
        setTerminoId(detectedTerminoId)
        localStorage.setItem("grupos.terminoId", String(detectedTerminoId))
        setForm((f) => ({ ...f, id_termino: detectedTerminoId }))
      }
      setCarreraId(null)
      setMateriaId(null)
      await load()
    } catch (e: any) {
      setMsg(
        (t("groups.messages.importErrorPrefix") as string) +
        (e.message || t("groups.messages.importGenericError"))
      )
      const rep = e?.response?.data
      if (rep?.errors && Array.isArray(rep.errors)) setImportErrors(rep.errors)
    }
  }

  // ===== descargar listado de grupos =====
  function downloadGruposXLSX() {
    const headers = [
      t("groups.table.subject", "Materia"),
      t("groups.table.career", "Carrera"),
      t("groups.table.code", "Código"),
      t("groups.table.teacher", "Docente"),
      t("groups.table.modality", "Modalidad"),
      t("groups.table.schedule", "Horario"),
      t("groups.table.capacity", "Cupo"),
    ]

    const rows = lista.map((g) => [
      getSubjectLabel(g.materia) || g.materia?.nombre || "—",
      (g as any)?.materia
        ? getCareerLabel((g as any).materia.carrera || (g as any).materia) ||
        (g as any)?.materia?.carrera_nombre || "—"
        : (g as any)?.materia?.carrera_nombre || "—",
      g.grupo_codigo || "—",
      g.docente
        ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""} ${g.docente.ap_materno ?? ""}`.trim()
        : t("groups.table.noTeacher", "Sin docente"),
      getGenericLabel(g.modalidad) || g.modalidad?.nombre || "—",
      formatHorario(g.horario),
      g.cupo,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Grupos")

    const filename = `grupos_${terminoId ? `termino_${terminoId}_` : ""}${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  // ===== descargar plantilla Excel =====
  async function downloadTemplateXLSX() {
    const headers = ["carrera", "materia", "docente", "termino", "modalidad", "horario", "cupo"]
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const carreras = await Catalogos.carreras().catch(() => [])

    const listaMaterias = (materias ?? []).map((m: any) => [
      getSubjectLabel(m) || m.nombre,
      m.clave ?? "",
      m.id_materia,
    ])
    const listaCarreras = (Array.isArray(carreras) ? carreras : (carreras as any)?.data ?? []).map(
      (c: any) => [getCareerLabel(c) || c.nombre, c.clave ?? "", c.id_carrera]
    )
    const listaDocentes = (docentes ?? []).map((d: any) => [
      `${d.nombre} ${d.ap_paterno ?? ""} ${d.ap_materno ?? ""}`.trim(),
      d.id_docente,
    ])
    const listaModalidades = (modalidades ?? []).map((m: any) => [
      getGenericLabel(m) || m.nombre,
      m.id_modalidad,
    ])
    const listaTerminos = (terminos ?? []).map((tTerm: any) => [getTermLabel(tTerm), tTerm.id_termino])
    const listaHorarios = HORARIOS.map((h) => [formatHorario(h)])

    const ayudaAOA = [
      ["LISTAS DE REFERENCIA (no editar encabezados)"],
      [],
      ["Materias: nombre", "clave", "id"],
      ...listaMaterias,
      [],
      ["Carreras: nombre", "clave", "id"],
      ...listaCarreras,
      [],
      ["Docentes: nombre completo", "id"],
      ...listaDocentes,
      [],
      ["Modalidades: nombre", "id"],
      ...listaModalidades,
      [],
      ["Términos: etiqueta", "id"],
      ...listaTerminos,
      [],
      ["Horarios (LUN-VIE):"],
      ...listaHorarios,
      [],
      ["Instrucciones"],
      [
        "Rellena la hoja GRUPOS usando exactamente los textos de nombre o clave mostrados aquí. Campos: carrera (nombre o clave), materia (nombre o clave), docente (nombre completo), modalidad (nombre), termino (AAAA PERIODO), horario (LUN-VIE HH:00-HH:00), cupo. Si indicas carrera, la materia debe pertenecer a esa carrera.",
      ],
    ]
    const wsHelp = XLSX.utils.aoa_to_sheet(ayudaAOA)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, "GRUPOS")
    XLSX.utils.book_append_sheet(wb, wsHelp, "LISTAS")

    XLSX.writeFile(wb, "plantilla_grupos.xlsx")
  }

  // ===== eliminar grupo =====
  function askDelete(g: Grupo) {
    const docente = g.docente
      ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}`.trim()
      : t("groups.table.noTeacher")
    const label = `${getSubjectLabel(g.materia) || "—"} — ${g.grupo_codigo} — ${docente}`
    setConfirmDel({ open: false })
      ; (async () => {
        const ok = await confirmService.requestConfirm({
          titleText: t("groups.deleteModal.title"),
          descriptionText: `${t("groups.deleteModal.question")}\n${label}`,
          confirmLabelText: t("groups.deleteModal.confirm"),
          cancelLabelText: t("confirm.no"),
          danger: true,
        })
        if (!ok) return
        setMsg(null)
        try {
          await api.delete(`/grupos/${g.id_grupo}`, { skipConfirm: true } as any)
          await load()
          const msgDel = t("groups.messages.deleted")
            ; (await import("../lib/notifyService")).default.notify({
              type: "success",
              message: `${msgDel}: ${label}`,
            })
        } catch (e: any) {
          const format = (await import("../lib/errorFormatter")).default
          const msgErr = format(e, { entity: "el grupo", action: "delete" })
            ; (await import("../lib/notifyService")).default.notify({
              type: "error",
              message: msgErr,
            })
        }
      })()
  }

  const totalVisible = lista.length
  const paginationSummary = t("groups.pagination.summary", {
    from: totalVisible === 0 ? 0 : start + 1,
    to: Math.min(end, totalVisible),
    total: totalVisible,
  })

  const pageOfText = t("groups.pagination.pageOf", {
    page: pageSafe,
    totalPages,
  })

  // LABELS de columnas (para la voz)
  const subjectColLabel = t("groups.table.subject")
  const careerColLabel = t("groups.table.career")
  const codeColLabel = t("groups.table.code")
  const teacherColLabel = t("groups.table.teacher")
  const modalityColLabel = t("groups.table.modality")
  const scheduleColLabel = t("groups.table.schedule")
  const capacityColLabel = t("groups.table.capacity")

  // Helper: columna → valor → materia
  const describeCell = (col: string, colLabel: string, g: Grupo) => {
    const subject =
      getSubjectLabel(g.materia) ||
      g.materia?.nombre ||
      (isEn ? "no subject" : "sin materia")

    const value =
      col === "subject"
        ? subject
        : col === "career"
          ? ((g as any)?.materia
            ? getCareerLabel((g as any).materia.carrera || (g as any).materia) ||
            (g as any)?.materia?.carrera_nombre
            : (g as any)?.materia?.carrera_nombre ||
            (isEn ? "no career" : "sin carrera"))
          : col === "code"
            ? g.grupo_codigo || (isEn ? "no code" : "sin código")
            : col === "teacher"
              ? (g.docente
                ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}`.trim()
                : t("groups.table.noTeacher"))
              : col === "modality"
                ? getGenericLabel(g.modalidad) || g.modalidad?.nombre || "—"
                : col === "schedule"
                  ? formatHorario(g.horario)
                  : col === "capacity"
                    ? isEn
                      ? `${g.cupo} students`
                      : `${g.cupo} estudiantes`
                    : ""

    if (isEn) {
      return `${colLabel}, ${value}. Subject: ${subject}.`
    } else {
      return `${colLabel}, ${value}. Materia: ${subject}.`
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Filtros ===== */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="flex w-full items-center justify-between mb-2">
          <h2 className="text-base font-semibold">
            {t("groups.pageTitle", "Gestión de grupos")}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => speak(filtersSectionInstructions)}
            aria-label={t(
              "groups.tts.filtersSection.aria",
              "Escuchar explicación de la sección de filtros"
            )}
          >
            <span aria-hidden="true">🔊</span>
            <span>{t("groups.tts.helpButton", "¿Cómo usar los filtros?")}</span>
          </button>
        </div>

        {/* Término */}
        <div className="grid gap-1 w-40 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500">
              {t("groups.filters.termLabel")}
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
              onClick={() => speak(termFilterInstructions)}
              aria-label={t(
                "groups.tts.filters.term.aria",
                "Escuchar explicación del filtro de término"
              )}
            >
              🔊
            </button>
          </div>
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={terminoId ?? ""}
            aria-label={t("groups.filters.termLabel")}
            onFocus={() => speak(t("groups.filters.termLabel"))}
            onChange={(e) => {
              const v = e.target.value
              if (!v) {
                setTerminoId(null)
                setForm((f) => ({ ...f, id_termino: null }))
                localStorage.removeItem("grupos.terminoId")
              } else {
                const n = Number(v)
                setTerminoId(n)
                setForm((f) => ({ ...f, id_termino: n }))
                localStorage.setItem("grupos.terminoId", String(n))
              }
              const opt = e.target.selectedOptions[0]
              if (opt) speak(`${t("groups.filters.termLabel")}: ${opt.text}`)
            }}
          >
            <option value="">{t("groups.filters.termAll")}</option>
            {terminos.map((tTerm) => (
              <option key={tTerm.id_termino} value={tTerm.id_termino}>
                {getTermLabel(tTerm)}
              </option>
            ))}
          </select>
        </div>

        {/* Carrera filtro */}
        <div className="grid gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500">
              {t("groups.filters.careerLabel")}
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
              onClick={() => speak(careerFilterInstructions)}
              aria-label={t(
                "groups.tts.filters.career.aria",
                "Escuchar explicación del filtro de carrera"
              )}
            >
              🔊
            </button>
          </div>
          <CarreraPicker
            value={carreraId ?? undefined}
            onChange={(id) => {
              setCarreraId(id as number | null)
              setMateriaId(null)
            }}
            label={false}
            className="h-10 w-full max-w-[14rem] rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        {/* Materia filtro */}
        <div className="grid gap-1 w-56 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500">
              {t("groups.filters.subjectLabel")}
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
              onClick={() => speak(subjectFilterInstructions)}
              aria-label={t(
                "groups.tts.filters.subject.aria",
                "Escuchar explicación del filtro de materia"
              )}
            >
              🔊
            </button>
          </div>
          <MateriaPicker
            value={materiaId}
            onChange={setMateriaId}
            terminoId={terminoId ?? undefined}
            carreraId={carreraId ?? undefined}
            disabled={!carreraId}
          />
        </div>

        {/* Buscador */}
        <div className="grid gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500">
              {t("groups.filters.searchLabel")}
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
              onClick={() => speak(searchFilterInstructions)}
              aria-label={t(
                "groups.tts.filters.search.aria",
                "Escuchar explicación del cuadro de búsqueda"
              )}
            >
              🔊
            </button>
          </div>
          <input
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full max-w-full box-border min-w-0 truncate"
            placeholder={t("groups.filters.searchPlaceholder")}
            value={query}
            aria-label={t("groups.filters.searchLabel")}
            onFocus={() => speak(t("groups.filters.searchLabel"))}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Descargar plantilla */}
        <div className="flex flex-col gap-1">
          <button
            onClick={downloadTemplateXLSX}
            type="button"
            className="rounded-lg border px-3 py-2 text-sm shadow-sm hover:bg-slate-50 inline-flex items-center"
            aria-label={t(
              "groups.buttons.downloadTemplateAria",
              "Descargar plantilla de Excel para grupos"
            )}
            onFocus={() => speak(t("groups.buttons.downloadTemplate"))}
          >
            <FiDownload className="mr-2" size={16} />
            {t("groups.buttons.downloadTemplate")}
          </button>
          <button
            type="button"
            className="self-start rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => speak(downloadTemplateInstructions)}
          >
            🔊 {t("groups.tts.helpButton", "¿Qué es la plantilla?")}
          </button>
        </div>

        {/* Importar archivo */}
        <div className="flex flex-col gap-1">
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer inline-flex items-center min-w-0 shadow-sm hover:bg-slate-50">
            <FiUpload className="mr-2" size={16} />
            {t("groups.buttons.importFile")}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
          </label>
          <button
            type="button"
            className="self-start rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => speak(importFileInstructions)}
          >
            🔊 {t("groups.tts.helpButton", "¿Cómo importar archivo?")}
          </button>
        </div>
      </div>

      {/* ===== Formulario ===== */}
      <form
        onSubmit={onCreate}
        className="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-lg">{t("groups.form.title")}</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xl">
              {t(
                "groups.form.subtitle",
                "Lleva el orden de izquierda a derecha: primero la carrera y materia, luego docente y modalidad, y al final horario y cupo."
              )}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => speak(formSectionInstructions)}
            aria-label={t(
              "groups.tts.formSection.aria",
              "Escuchar explicación del formulario para crear grupo"
            )}
          >
            <span aria-hidden="true">🔊</span>
            <span>{t("groups.tts.helpButton", "¿Cómo llenar este formulario?")}</span>
          </button>
        </div>

        {/* Mensaje de error / info */}
        {msg && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {msg}
          </div>
        )}

        {/* SECCIÓN 1: Carrera y materia */}
        <section className="rounded-xl bg-slate-50 px-3 py-3 space-y-3">
          <p className="text-xs font-medium text-slate-600">
            {t("groups.form.section1", "1. Información general del grupo")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Carrera */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.careerLabel", "Carrera del grupo")}
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formCareerInstructions)}
                  aria-label={t(
                    "groups.tts.form.career.aria",
                    "Escuchar instrucciones del campo carrera del grupo"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo elegir?")}</span>
                </button>
              </div>
              <CarreraPicker
                value={carreraId ?? undefined}
                onChange={(id) => {
                  setCarreraId(id as number | null)
                  setMateriaId(null)
                  setForm((f) => ({ ...f, id_materia: null }))
                }}
                label={false}
                className="h-10 w-full rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                {t(
                  "groups.form.careerHint",
                  "Esta carrera también se usa para filtrar la tabla de grupos de arriba."
                )}
              </p>
            </div>

            {/* Materia */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.subjectLabel", "Materia")}
                  <span className="text-red-500" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formSubjectInstructions)}
                  aria-label={t(
                    "groups.tts.form.subject.aria",
                    "Escuchar instrucciones del campo materia"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo elegir?")}</span>
                </button>
              </div>
              <MateriaPicker
                value={form.id_materia}
                onChange={(id) => setForm((f) => ({ ...f, id_materia: id }))}
                terminoId={terminoId ?? undefined}
                carreraId={carreraId ?? undefined}
                disabled={!carreraId}
                className="rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: Docente y modalidad */}
        <section className="rounded-xl bg-slate-50 px-3 py-3 space-y-3">
          <p className="text-xs font-medium text-slate-600">
            {t("groups.form.section2", "2. Docente y modalidad")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Docente */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.teacherLabel", "Docente")}
                  <span className="text-red-500" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formTeacherInstructions)}
                  aria-label={t(
                    "groups.tts.form.teacher.aria",
                    "Escuchar instrucciones del campo docente"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo elegir?")}</span>
                </button>
              </div>
              <select
                className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={form.id_docente ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    id_docente: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                onFocus={() => speak(t("groups.form.teacherLabel", "Docente"))}
              >
                <option value="">
                  {t("groups.form.teacherPlaceholder", "Selecciona un docente")}
                </option>
                {docentes.map((d) => (
                  <option key={d.id_docente} value={d.id_docente}>
                    {`${d.nombre} ${d.ap_paterno ?? ""} ${d.ap_materno ?? ""}`.trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Modalidad */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.modalityLabel", "Modalidad")}
                  <span className="text-red-500" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formModalityInstructions)}
                  aria-label={t(
                    "groups.tts.form.modality.aria",
                    "Escuchar instrucciones del campo modalidad"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo elegir?")}</span>
                </button>
              </div>
              <select
                className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={form.id_modalidad ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    id_modalidad: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                onFocus={() => speak(t("groups.form.modalityLabel", "Modalidad"))}
              >
                <option value="">
                  {t("groups.form.modalityPlaceholder", "Selecciona una modalidad")}
                </option>
                {modalidades.map((m) => (
                  <option key={m.id_modalidad} value={m.id_modalidad}>
                    {getGenericLabel(m) || m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* SECCIÓN 3: Horario y cupo */}
        <section className="rounded-xl bg-slate-50 px-3 py-3 space-y-3">
          <p className="text-xs font-medium text-slate-600">
            {t("groups.form.section3", "3. Horario y cupo")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Horario */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.scheduleLabel", "Horario")}
                  <span className="text-red-500" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formScheduleInstructions)}
                  aria-label={t(
                    "groups.tts.form.schedule.aria",
                    "Escuchar instrucciones del campo horario"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo elegir?")}</span>
                </button>
              </div>
              <select
                className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={form.horario}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    horario: e.target.value,
                  }))
                }
                onFocus={() => speak(t("groups.form.scheduleLabel", "Horario"))}
              >
                <option value="">
                  {t("groups.form.schedulePlaceholder", "Selecciona un horario")}
                </option>
                {HORARIOS.map((h) => (
                  <option key={h} value={h}>
                    {formatHorario(h)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cupo */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-slate-500">
                  {t("groups.form.capacityLabel", "Cupo máximo")}
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => speak(formCapacityInstructions)}
                  aria-label={t(
                    "groups.tts.form.capacity.aria",
                    "Escuchar instrucciones del campo cupo"
                  )}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{t("groups.tts.helpButton", "¿Qué debo escribir?")}</span>
                </button>
              </div>
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={form.cupo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cupo: e.target.value,
                  }))
                }
                placeholder={t("groups.form.capacityPlaceholder", "Ej. 30")}
                onFocus={() => speak(t("groups.form.capacityLabel", "Cupo máximo"))}
              />
              <p className="text-[11px] text-slate-500">
                {t(
                  "groups.form.capacityHint",
                  "Si dejas este campo vacío, el sistema usará un cupo de 30 estudiantes."
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          {err && (
            <div className="text-xs text-red-600">
              {err}
            </div>
          )}
          <div className="flex-1" />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onFocus={() => speak(t("groups.form.submit", "Crear grupo"))}
          >
            <FiPlus size={16} />
            {saving
              ? t("groups.form.saving", "Guardando…")
              : t("groups.form.submit", "Crear grupo")}
          </button>
        </div>
      </form>

      {/* ===== Lista ===== */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between px-4 pt-3">
          <h3 className="font-medium text-sm">
            {t("groups.table.title", "Listado de grupos")}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={downloadGruposXLSX}
              aria-label={t("groups.table.downloadAria", "Descargar listado de grupos en Excel")}
            >
              <FiDownload size={14} />
              <span>{t("groups.table.download", "Descargar")}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => speak(tableSectionInstructions)}
              aria-label={t(
                "groups.tts.tableSection.aria",
                "Escuchar explicación de la tabla de grupos"
              )}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t("groups.tts.helpButton", "¿Cómo leer la tabla?")}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>{subjectColLabel}</th>
                <th>{careerColLabel}</th>
                <th>{codeColLabel}</th>
                <th>{teacherColLabel}</th>
                <th>{modalityColLabel}</th>
                <th>{scheduleColLabel}</th>
                <th>{capacityColLabel}</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && grupos.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {t("groups.table.loading")}
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {t("groups.table.empty")}
                  </td>
                </tr>
              ) : (
                paged.map((g) => (
                  <tr
                    key={g.id_grupo}
                    className="[&>td]:px-3 [&>td]:py-2 hover:bg-slate-50/60"
                  >
                    {/* Materia */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("subject", subjectColLabel, g))}
                        aria-label={describeCell("subject", subjectColLabel, g)}
                      >
                        {getSubjectLabel(g.materia) || "—"}
                      </button>
                    </td>

                    {/* Carrera */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("career", careerColLabel, g))}
                        aria-label={describeCell("career", careerColLabel, g)}
                      >
                        {(g as any)?.materia
                          ? getCareerLabel((g as any).materia.carrera || (g as any).materia) ||
                          (g as any)?.materia?.carrera_nombre
                          : (g as any)?.materia?.carrera_nombre || "—"}
                      </button>
                    </td>

                    {/* Código de grupo */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("code", codeColLabel, g))}
                        aria-label={describeCell("code", codeColLabel, g)}
                      >
                        {g.grupo_codigo}
                      </button>
                    </td>

                    {/* Docente */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("teacher", teacherColLabel, g))}
                        aria-label={describeCell("teacher", teacherColLabel, g)}
                      >
                        {g.docente
                          ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}`
                          : t("groups.table.noTeacher")}
                      </button>
                    </td>

                    {/* Modalidad */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("modality", modalityColLabel, g))}
                        aria-label={describeCell("modality", modalityColLabel, g)}
                      >
                        {getGenericLabel(g.modalidad) || "—"}
                      </button>
                    </td>

                    {/* Horario */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("schedule", scheduleColLabel, g))}
                        aria-label={describeCell("schedule", scheduleColLabel, g)}
                      >
                        {formatHorario(g.horario)}
                      </button>
                    </td>

                    {/* Cupo */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                        onClick={() => speak(describeCell("capacity", capacityColLabel, g))}
                        aria-label={describeCell("capacity", capacityColLabel, g)}
                      >
                        {g.cupo}
                      </button>
                    </td>

                    {/* Botón eliminar */}
                    <td>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs hover:bg-red-50 hover:border-red-300 text-red-600"
                        onClick={() => askDelete(g)}
                        title={t("groups.table.deleteTooltip")}
                      >
                        {t("groups.table.deleteButton")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        <div className="flex items-center justify-between p-3 text-sm">
          <div className="text-slate-600">{paginationSummary}</div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              type="button"
              onFocus={() => speak(t("groups.pagination.prev"))}
            >
              {t("groups.pagination.prev")}
            </button>
            <div className="px-1">{pageOfText}</div>
            <button
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              type="button"
              onFocus={() => speak(t("groups.pagination.next"))}
            >
              {t("groups.pagination.next")}
            </button>
          </div>
        </div>

        {/* Errores de importación */}
        {importErrors.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-red-700 bg-red-50/60">
            <p className="font-semibold mb-1">
              {t("groups.messages.importErrorsTitle", "Errores al importar grupos")}
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {importErrors.map((e, idx) => (
                <li key={`${e.row}-${idx}`}>
                  {t("groups.messages.importErrorRow", "Fila {{row}}: {{error}}", {
                    row: e.row,
                    error: e.error,
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
