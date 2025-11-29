import React, { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import api from "../lib/api"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { toPng } from "html-to-image"
import autoTable from "jspdf-autotable"
import PieChartPage from "../pages/PieChart"
import ScatterChartPage from "../pages/ScatterChart"
import ControlChart from "../pages/ControlChart"
import ModalBaja from "../components/grupoAulaDetalle/ModalBaja"
import ParetoChart from "../pages/ParetoChart"
import { useTranslation } from "react-i18next"
import { FiDownload, FiUpload, FiArrowLeft, FiPlus, FiFilter, FiTrash2, FiRefreshCw, FiArrowRight } from 'react-icons/fi'

type AlumnoRow = {
  id_inscripcion: number
  status?: string
  estado?: string
  inscripcion_status?: string
  estudiante?: {
    no_control?: string
    nombre?: string
    ap_paterno?: string
    ap_materno?: string
  }
  unidades?: Array<{ unidad: number; calificacion?: number; asistencia?: number }>
}

type AlumnosState = { cupo: number; unidades: number; rows: AlumnoRow[] }
type GrupoResumen = { total?: number; aprobados?: number; reprobados?: number;[k: string]: any }
type Elegible = { no_control?: string; nombre?: string; ap_paterno?: string; ap_materno?: string }

// --- util local: bloquear/rehabilitar scroll mientras exporta overlays ---
function lockScroll() {
  const scrollY = window.scrollY || window.pageYOffset || 0
  const original = {
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
  }
  document.body.style.position = "fixed"
  document.body.style.top = `-${scrollY}px`
  document.body.style.width = "100%"
  return () => {
    document.body.style.position = original.position
    document.body.style.top = original.top
    document.body.style.width = original.width
    window.scrollTo(0, scrollY)
  }
}

// ==== helpers para plantilla/importación de calificaciones ====
function buildGradesHeaders(unidades: number) {
  const head = ["no_control", "nombre"]
  for (let u = 1; u <= unidades; u++) {
    head.push(`U${u}_CAL`, `U${u}_ASIST`)
  }
  return head
}

function normPct(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === "") return null
  const n = Math.round(Number(s))
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

// Nueva función para normalizar asistencias (sin límite de 100)
function normAsist(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === "") return null
  const n = Math.round(Number(s))
  if (!Number.isFinite(n)) return null
  return Math.max(0, n) // Solo mínimo 0, sin máximo
}

function normalizeKey(k: string) {
  return k.toUpperCase().replace(/\s+/g, "_").replace(/[.%]/g, "_").replace(/__+/g, "_")
}

function calcularPromedioAlumno(unidades?: Array<{ unidad: number; calificacion?: number }>): number | null {
  if (!unidades || unidades.length === 0) return null
  const calificaciones = unidades
    .map(u => u.calificacion)
    .filter(c => c !== null && c !== undefined && !isNaN(c as number)) as number[]

  if (calificaciones.length === 0) return null
  const suma = calificaciones.reduce((acc, cal) => acc + cal, 0)
  return Math.round((suma / calificaciones.length) * 100) / 100
}

// Nueva función para determinar si está aprobado
function estaAprobado(unidades?: Array<{ unidad: number; calificacion?: number }>): boolean {
  if (!unidades || unidades.length === 0) return false

  const calificaciones = unidades
    .map(u => u.calificacion)
    .filter(c => c !== null && c !== undefined && !isNaN(c as number)) as number[]

  if (calificaciones.length === 0) return false

  // Todas las calificaciones deben ser >= 70
  return calificaciones.every(cal => cal >= 70)
}

export default function GrupoAulaDetalle() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id_grupo: idParam } = useParams()
  const id_grupo = Number(idParam)
  const location = useLocation() as { state?: { titulo?: string } }
  const tituloState = location?.state?.titulo

  const [titulo, setTitulo] = useState<string>(tituloState || "")
  const [alumnos, setAlumnos] = useState<AlumnosState>({ cupo: 0, unidades: 0, rows: [] })
  const [loadingAlu, setLoadingAlu] = useState(false)

  // mensaje + tipo (ok / error)
  const [msgAlu, setMsgAlu] = useState<string | null>(null)
  const [msgKind, setMsgKind] = useState<"ok" | "error">("error")

  const [pageAlu, setPageAlu] = useState(1)
  const pageSizeAlu = 15
  const [importing, setImporting] = useState(false) // importar INSCRIPCIONES
  const [exportingCharts, setExportingCharts] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null) // inscripciones
  const [grupo, setGrupo] = useState<GrupoResumen>({})
  const [promedio, setPromedio] = useState<any>({})
  const [showBajaModal, setShowBajaModal] = useState(false)
  const [id_inscripcion, setIdInscripcion] = useState<number>()
  const [showTemplateOptions, setShowTemplateOptions] = useState(false)
  const templateButtonRef = useRef<HTMLDivElement>(null)

  // subir calificaciones
  const gradesFileRef = useRef<HTMLInputElement | null>(null)
  const [importingGrades, setImportingGrades] = useState(false)

  // Refs para exportar gráficas
  const pieRef = useRef<HTMLDivElement | null>(null)
  const scatterRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<HTMLDivElement | null>(null)
  const paretoRef = useRef<HTMLDivElement | null>(null)

  // === Sólo alumnos ACTIVOS (se ocultan BAJA en la tabla) ===
  const activeRows = useMemo(
    () =>
      (alumnos.rows || []).filter((r) => {
        const s = String(r?.status ?? r?.estado ?? r?.inscripcion_status ?? "ACTIVA").toUpperCase()
        return s !== "BAJA"
      }),
    [alumnos]
  )

  // === Ordenar alumnos alfabéticamente por apellido paterno, materno y nombre ===
  const sortedActiveRows = useMemo(() => {
    return [...activeRows].sort((a, b) => {
      const aPaterno = (a.estudiante?.ap_paterno || "").toUpperCase()
      const bPaterno = (b.estudiante?.ap_paterno || "").toUpperCase()
      if (aPaterno !== bPaterno) return aPaterno.localeCompare(bPaterno)

      const aMaterno = (a.estudiante?.ap_materno || "").toUpperCase()
      const bMaterno = (b.estudiante?.ap_materno || "").toUpperCase()
      if (aMaterno !== bMaterno) return aMaterno.localeCompare(bMaterno)

      const aNombre = (a.estudiante?.nombre || "").toUpperCase()
      const bNombre = (b.estudiante?.nombre || "").toUpperCase()
      return aNombre.localeCompare(bNombre)
    })
  }, [activeRows])

  const totalPagesAlu = useMemo(
    () => Math.max(1, Math.ceil((sortedActiveRows.length || 0) / pageSizeAlu)),
    [sortedActiveRows]
  )
  const pageSafeAlu = Math.min(pageAlu, totalPagesAlu)
  const startAlu = (pageSafeAlu - 1) * pageSizeAlu
  const endAlu = startAlu + pageSizeAlu
  const pagedAlu = useMemo(() => sortedActiveRows.slice(startAlu, endAlu), [sortedActiveRows, startAlu, endAlu])

  useEffect(() => {
    if (!Number.isFinite(id_grupo)) {
      navigate("/grupos/aula", { replace: true })
      return
    }
    loadAlumnos(id_grupo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_grupo])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (templateButtonRef.current && !templateButtonRef.current.contains(event.target as Node)) {
        setShowTemplateOptions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  function getEstado(row: AlumnoRow): string {
    return String(row?.status ?? row?.estado ?? row?.inscripcion_status ?? "ACTIVA").toUpperCase()
  }

  async function loadAlumnos(id: number) {
    setLoadingAlu(true)
    setMsgAlu(null)
    try {
      let path = `/inscripciones?grupo_id=${id}`
      if (i18n?.language && String(i18n.language).startsWith("en")) path += "&lang=en"
      const data = await api.get(path)
      setAlumnos({
        cupo: data?.cupo || 0,
        unidades: data?.unidades || 0,
        rows: (data?.rows || []) as AlumnoRow[],
      })
      setGrupo((data?.grupo || { aprobados: 0, reprobados: 0, total: 0 }) as GrupoResumen)
      setPromedio(data?.promedio || [])

      if (!titulo) {
        const first = (data?.rows || [])[0] as any
        const tState = location?.state?.titulo
        setTitulo(typeof tState === "string" && tState ? tState : first?.grupo_titulo || "")
      }
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || t("classGroupDetail.messages.genericError"))
    } finally {
      setLoadingAlu(false)
    }
  }

  async function agregarPorNoControl(no_control: string) {
    setMsgAlu(null)
    try {
      if ((activeRows.length || 0) >= (alumnos.cupo || 0)) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.capacityFull"))
        return
      }
      const q = encodeURIComponent(no_control.trim())
      let estPath = `/estudiantes?q=${q}`
      if (i18n?.language && String(i18n.language).startsWith("en")) estPath += "&lang=en"
      const res = await api.get(estPath)
      const lista = Array.isArray(res?.rows) ? res.rows : res
      const est =
        (lista || []).find((x: any) => String(x.no_control) === no_control.trim()) ||
        (lista || [])[0]
      if (!est) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.studentNotFound"))
        return
      }
      await api.post("/inscripciones", { id_estudiante: est.id_estudiante, id_grupo }, { skipConfirm: true } as any)
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu(t("classGroupDetail.messages.enrollmentAdded"))
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || t("classGroupDetail.messages.genericError"))
    }
  }

  async function actualizarUnidad(
    id_inscripcion: number,
    unidad: number,
    campo: "calificacion" | "asistencia",
    valor: string
  ) {
    const num = Number(valor)
    if (!isFinite(num)) return
    try {
      const payload = { unidades: [{ unidad, [campo]: num }] }
      await api.put(`/inscripciones/${id_inscripcion}/unidades`, payload, { skipConfirm: true } as any)
    } catch {
      /* noop */
    }
  }

  // Abrir modal y guardar id
  function bajaInscripcion(id: number) {
    setIdInscripcion(id)
    setShowBajaModal(true)
  }
  function cerrarModalBaja() {
    setShowBajaModal(false)
    setIdInscripcion(undefined)
  }

  // Cuando el modal termina, recargamos los datos del servidor
  async function handleBajaRegistrada(payload?: { id_inscripcion?: number }) {
    cerrarModalBaja()
    await loadAlumnos(id_grupo)
    setMsgKind("ok")
    setMsgAlu(t("classGroupDetail.messages.enrollmentDropped"))
  }

  // === Importar INSCRIPCIONES
  async function handleImportFile(file: File) {
    if (!file) return
    try {
      setImporting(true)
      setMsgAlu(null)
      let rows: Record<string, unknown>[] = []

      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text()
        const lines = text.split("\n").filter(Boolean)
        const headers = lines[0].split(",")
        rows = lines.slice(1).map((line) => {
          const values = line.split(",")
          return headers.reduce((obj: Record<string, string>, header, i) => {
            obj[header.trim()] = values[i]?.trim() || ""
            return obj
          }, {})
        })
      } else {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
      }

      const list: string[] = []
      for (const r of rows) {
        const vals = Object.values(r)
        let nc = ""
        if ((r as any).no_control != null) nc = String((r as any).no_control)
        else if ((r as any)["No. control"] != null) nc = String((r as any)["No. control"])
        else if ((r as any)["NO CONTROL"] != null) nc = String((r as any)["NO CONTROL"])
        else if (vals.length) nc = String(vals[0])
        nc = nc.trim()
        if (nc) list.push(nc)
      }

      if (list.length === 0) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.fileWithoutNoControl"))
        return
      }
      await api.post("/inscripciones/bulk", { id_grupo, no_control: list }, { skipConfirm: true } as any)
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu(t("classGroupDetail.messages.importEnrollmentsCompleted"))
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || t("classGroupDetail.messages.genericError"))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // === Elegibles para plantilla de inscripciones
  async function fetchElegiblesParaGrupo(id: number): Promise<Elegible[]> {
    try {
      let r1Path = `/grupos/${id}/elegibles`
      if (i18n?.language && String(i18n.language).startsWith("en")) r1Path += "?lang=en"
      const r1 = await api.get(r1Path)
      if (Array.isArray(r1?.rows)) return r1.rows as Elegible[]
      if (Array.isArray(r1)) return r1 as Elegible[]
    } catch { }
    try {
      let r2Path = `/plantilla-inscripciones?grupo_id=${id}`
      if (i18n?.language && String(i18n.language).startsWith("en")) r2Path += "&lang=en"
      const r2 = await api.get(r2Path)
      if (Array.isArray(r2?.rows)) return r2.rows as Elegible[]
      if (Array.isArray(r2)) return r2 as Elegible[]
    } catch { }
    return []
  }

  async function downloadTemplateXLSX() {
    try {
      const elegibles = await fetchElegiblesParaGrupo(id_grupo)
      const header = ["no_control", "nombre", "ap_paterno", "ap_materno"]
      const data =
        elegibles.length > 0
          ? elegibles.map((e) => [
            String(e.no_control ?? "").trim(),
            String(e.nombre ?? "").trim(),
            String(e.ap_paterno ?? "").trim(),
            String(e.ap_materno ?? "").trim(),
          ])
          : [[""]]

      const aoa = [header, ...data]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Elegibles")
      const fname = `plantilla_inscripciones_grupo_${id_grupo}.xlsx`
      XLSX.writeFile(wb, fname)

      setMsgKind("ok")
      setMsgAlu(
        elegibles.length
          ? t("classGroupDetail.messages.templateXlsxOk", { count: elegibles.length })
          : t("classGroupDetail.messages.templateXlsxEmpty")
      )
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || t("classGroupDetail.messages.templateXlsxError"))
    }
  }

  async function downloadTemplateCSV() {
    try {
      const elegibles = await fetchElegiblesParaGrupo(id_grupo)
      const header = ["no_control", "nombre", "ap_paterno", "ap_materno"]
      const rows: (string[])[] =
        elegibles.length > 0
          ? elegibles.map((e) => [
            String(e.no_control ?? "").trim(),
            String(e.nombre ?? "").trim(),
            String(e.ap_paterno ?? "").trim(),
            String(e.ap_materno ?? "").trim(),
          ])
          : [[""]]

      const lines = [
        header.join(","),
        ...rows.map((r: string[]) =>
          r
            .map((v: string) => {
              const s = String(v ?? "")
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
            })
            .join(",")
        ),
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `plantilla_inscripciones_grupo_${id_grupo}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      setMsgKind("ok")
      setMsgAlu(
        elegibles.length
          ? t("classGroupDetail.messages.templateCsvOk", { count: elegibles.length })
          : t("classGroupDetail.messages.templateCsvEmpty")
      )
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || t("classGroupDetail.messages.templateCsvError"))
    }
  }

  // ====== Exportar calificaciones a PDF
  function exportarPDF(opts?: { incluirAsistencia?: boolean }) {
    const incluirAsistencia = !!opts?.incluirAsistencia
    const unidades = Math.max(0, Number(alumnos?.unidades || 0))

    const colsCount = incluirAsistencia ? unidades * 2 + 3 : unidades + 3
    const needLandscape = colsCount > 8

    const doc = new jsPDF({
      orientation: needLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    })

    const tituloPDF = `${t("classGroupDetail.charts.pdfTitlePrefix")}${titulo || t("classGroupDetail.charts.pdfTitleFallback", { id: id_grupo })}`
    const sub = (() => {
      const parts: string[] = []
      if ((grupo as any)?.clave) parts.push(String((grupo as any).clave))
      if ((grupo as any)?.docente?.nombre) parts.push(String((grupo as any).docente.nombre))
      if ((grupo as any)?.periodo) parts.push(String((grupo as any).periodo))
      return parts.join(" • ")
    })()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(tituloPDF, 14, 18)
    if (sub) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.text(sub, 14, 26)
    }

    const headRow: string[] = [t("classGroupDetail.table.noControl"), t("classGroupDetail.table.firstName")]
    for (let i = 1; i <= unidades; i++) {
      if (incluirAsistencia) {
        headRow.push(
          t("classGroupDetail.table.unitCalShort", { u: i }),
          t("classGroupDetail.table.unitAttendanceShort", { u: i })
        )
      } else {
        headRow.push(t("classGroupDetail.table.unitCalShort", { u: i }))
      }
    }
    headRow.push(t("classGroupDetail.table.averageShort"))
    const head = [headRow]

    // Export the currently visible (active) students, sorted as in the UI
    const exportRows = pagedAlu && pagedAlu.length ? sortedActiveRows : sortedActiveRows
    const body = (exportRows || []).map((r) => {
      const base = [
        String(r?.estudiante?.no_control || ""),
        `${(r?.estudiante?.nombre || "").toString().toUpperCase()} ${(r?.estudiante?.ap_paterno || "").toString().toUpperCase()}`.trim(),
      ]
      const cells: (string | number)[] = []
      for (let u = 1; u <= unidades; u++) {
        const unit = r?.unidades?.find((x) => x.unidad === u)
        const cal = unit?.calificacion ?? ""
        const asi = unit?.asistencia ?? ""
        if (incluirAsistencia) cells.push(cal === "" ? "" : Number(cal), asi === "" ? "" : Number(asi))
        else cells.push(cal === "" ? "" : Number(cal))
      }

      const prom = calcularPromedioAlumno(r?.unidades)
      cells.push(prom !== null ? prom : "")

      return [...base, ...cells]
    })

    const startY = sub ? 34 : 28
    const columnStyles: Record<number, any> = {
      0: { cellWidth: 28, halign: "center", font: "courier" },
      1: { cellWidth: 62, halign: "left" },
    }
    for (let i = 2; i < headRow.length - 1; i++) columnStyles[i] = { cellWidth: 16, halign: "center" }
    columnStyles[headRow.length - 1] = { cellWidth: 20, halign: "center", fontStyle: "bold" }

    autoTable(doc, {
      head,
      body,
      startY,
      theme: "grid",
      styles: { fontSize: 9, lineWidth: 0.1, cellPadding: 2.8, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: [55, 65, 81] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles,
      margin: { top: 14, left: 14, right: 14, bottom: 16 },
      rowPageBreak: "avoid",
      didDrawPage: (data) => {
        const pageCount =
          (doc as any).internal?.getNumberOfPages?.() ??
          (doc as any).getNumberOfPages?.() ??
          1
        const pageSize = doc.internal.pageSize
        const w = (pageSize as any).getWidth ? (pageSize as any).getWidth() : (pageSize as any).width
        const h = (pageSize as any).getHeight ? (pageSize as any).getHeight() : (pageSize as any).height
        doc.setFontSize(9)
        doc.setTextColor(120)
        doc.text(
          t("classGroupDetail.charts.pdfPageOf", { page: data.pageNumber, total: pageCount }),
          w - 14,
          h - 8,
          { align: "right" }
        )
      },
    })

    try {
      const y = (doc as any).lastAutoTable?.finalY || startY
      if (y && y < doc.internal.pageSize.getHeight() - 20) {
        doc.setFontSize(10)
        doc.setTextColor(60)
        const total = Number((exportRows?.length ?? 0) as number)
        const aprob = Number((exportRows || []).filter((x) => estaAprobado(x?.unidades)).length ?? 0)
        const reprob = Math.max(0, total - aprob)
        const resumen = t("classGroupDetail.charts.pdfFooterSummary", {
          total,
          approved: aprob,
          failed: reprob,
        })
        doc.text(resumen, 14, y + 8)
      }
    } catch { }

    doc.save(
      `Calificaciones_${(titulo || t("classGroupDetail.charts.pdfTitleFallback", { id: id_grupo })).replace(
        /\s+/g,
        "_"
      )}.pdf`
    )
  }

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

  async function getChartImage(host: HTMLElement) {
    const isRecharts = !!host.querySelector(".recharts-wrapper")
    if (isRecharts) {
      const rect = host.getBoundingClientRect()
      const dataUrl = await toPng(host, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        filter: (node) => {
          const el = node as HTMLElement
          const tag = (el.tagName || "").toLowerCase()
          if (tag === "iframe") return false
          if (el.classList?.contains("recharts-tooltip-wrapper")) return false
          return true
        },
      })
      const img = await loadImage(dataUrl)
      return { dataUrl, width: img.naturalWidth, height: img.naturalHeight }
    }

    const svg = host.querySelector("svg") as SVGSVGElement | null
    if (svg) {
      const { width, height } = svg.getBoundingClientRect()
      const w = Math.max(1, Math.round(width))
      const h = Math.max(1, Math.round(height))

      const cloned = svg.cloneNode(true) as SVGSVGElement
      cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg")
      cloned.setAttribute("width", String(w))
      cloned.setAttribute("height", String(h))
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      bg.setAttribute("x", "0")
      bg.setAttribute("y", "0")
      bg.setAttribute("width", String(w))
      bg.setAttribute("height", String(h))
      bg.setAttribute("fill", "#ffffff")
      cloned.insertBefore(bg, cloned.firstChild)

      const svgText = new XMLSerializer().serializeToString(cloned)
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      try {
        const img = await loadImage(url)
        const scale = 2
        const canvas = document.createElement("canvas")
        canvas.width = w * scale
        canvas.height = h * scale
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#fff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/png", 0.92)
        return { dataUrl, width: canvas.width, height: canvas.height }
      } finally {
        URL.revokeObjectURL(url)
      }
    }

    const rect = host.getBoundingClientRect()
    const dataUrl = await toPng(host, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    })
    const tmp = await loadImage(dataUrl)
    return { dataUrl, width: tmp.naturalWidth, height: tmp.naturalHeight }
  }

  function forceLightThemeForExport() {
    const wasDark = document.documentElement.classList.contains("dark")
    const originalBodyFilter = document.body.style.filter

    document.documentElement.classList.remove("dark")

    const style = document.createElement("style")
    style.setAttribute("data-export-theme", "true")
    style.textContent = `
      :root {
        --text: #1e293b !important;
        --muted: #64748b !important;
        --surface: #ffffff !important;
        --card: #ffffff !important;
        --border: #e2e8f0 !important;
      }
      .recharts-wrapper, .recharts-surface { 
        background: #ffffff !important; 
      }
      .recharts-cartesian-axis-tick-value {
        fill: #64748b !important;
      }
      .recharts-legend-item-text {
        fill: #1e293b !important;
      }
      .recharts-cartesian-grid-horizontal line,
      .recharts-cartesian-grid-vertical line {
        stroke: #e2e8f0 !important;
      }
      .recharts-cartesian-axis-line {
        stroke: #cbd5e1 !important;
      }
      .recharts-cartesian-axis-tick-line {
        stroke: #cbd5e1 !important;
      }
      .recharts-legend-wrapper {
        color: #1e293b !important;
      }
      text {
        fill: #1e293b !important;
      }
      .recharts-pie-label-text {
        fill: #1e293b !important;
      }
    `
    document.head.appendChild(style)

    document.body.style.filter = "none"

    return () => {
      if (wasDark) {
        document.documentElement.classList.add("dark")
      }
      const exportStyle = document.head.querySelector('style[data-export-theme="true"]')
      if (exportStyle) {
        document.head.removeChild(exportStyle)
      }
      document.body.style.filter = originalBodyFilter
    }
  }

  async function exportarGraficasPDF() {
    try {
      setMsgAlu(null)
      setExportingCharts(true)
      const unlock = lockScroll()
      const undoTheme = forceLightThemeForExport()

      await new Promise(resolve => setTimeout(resolve, 300))

      const bloques: Array<{ ref: React.RefObject<HTMLDivElement>; titulo: string }> = [
        { ref: pieRef, titulo: t("classGroupDetail.charts.pieTitle") },
        { ref: scatterRef, titulo: t("classGroupDetail.charts.scatterTitle") },
        { ref: controlRef, titulo: t("classGroupDetail.charts.controlTitle") },
        { ref: paretoRef, titulo: t("classGroupDetail.charts.paretoTitle") },
      ]

      const hasAny = bloques.some((b) => b.ref.current?.querySelector("svg,canvas"))
      if (!hasAny) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.exportChartsNotRendered"))
        setExportingCharts(false)
        undoTheme()
        unlock()
        return
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 12
      const areaW = pageW - margin * 2
      const areaH = pageH - margin * 2

      const drawImageFitted = (
        dataUrl: string,
        w: number,
        h: number,
        tituloGraf: string,
        first: boolean
      ) => {
        if (!first) doc.addPage()
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(
          `${tituloGraf} — ${titulo || t("classGroupDetail.charts.pdfTitleFallback", { id: id_grupo })}`,
          margin,
          margin
        )

        const ratio = w / h
        let drawW = areaW
        let drawH = drawW / ratio
        if (drawH > areaH - 8) {
          drawH = areaH - 8
          drawW = drawH * ratio
        }
        const x = margin + (areaW - drawW) / 2
        const topImg = margin + 8
        doc.addImage(dataUrl, "PNG", x, topImg, drawW, drawH)
      }

      let first = true
      for (const b of bloques) {
        const host = b.ref.current
        if (!host) continue
        const hasChart = host.querySelector("svg,canvas")
        if (!hasChart) continue
        try {
          const { dataUrl, width, height } = await getChartImage(host)
          drawImageFitted(dataUrl, width, height, b.titulo, first)
          first = false
        } catch (e) {
          console.error("Error capturando", b.titulo, e)
        }
      }

      if (first) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.exportChartsNoneCaptured"))
        setExportingCharts(false)
        undoTheme()
        unlock()
        return
      }

      doc.save(
        `${t("classGroupDetail.charts.exportFilePrefix")}${(titulo || t(
          "classGroupDetail.charts.pdfTitleFallback",
          { id: id_grupo }
        )).replace(/\s+/g, "_")}.pdf`
      )
      undoTheme()
      unlock()
    } catch (err: any) {
      console.error(err)
      setMsgKind("error")
      setMsgAlu(err?.message || t("classGroupDetail.messages.exportChartsError"))
    } finally {
      setExportingCharts(false)
    }
  }

  // Reactivar
  async function reactivarInscripcion(id: number) {
    try {
      setMsgAlu(null)
      await api.put(`/inscripciones/${id}`, { status: "ACTIVA" }, { skipConfirm: true } as any)
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu(t("classGroupDetail.messages.enrollmentReactivated"))
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e?.response?.data?.message || e.message || t("classGroupDetail.messages.enrollmentReactivatedError"))
    }
  }

  function estadoBadge(status?: string) {
    const s = (status || "").toUpperCase()
    const isBaja = s === "BAJA"
    const clr = isBaja
      ? "bg-red-50 text-red-700 ring-red-100"
      : s === "APROBADA"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : s === "REPROBADA"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-slate-50 text-slate-700 ring-slate-100"

    let label = s || "ACTIVA"
    if (isBaja) label = t("classGroupDetail.status.inactive")
    else if (s === "APROBADA") label = t("classGroupDetail.status.approved")
    else if (s === "REPROBADA") label = t("classGroupDetail.status.failed")
    else label = t("classGroupDetail.status.active")

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ${clr}`}>
        {label}
      </span>
    )
  }

  // ===== Descargar plantilla de calificaciones (XLSX/CSV)
  async function downloadGradesTemplateXLSX() {
    try {
      const unidades = Number(alumnos.unidades || 0)
      const head = buildGradesHeaders(unidades)
      const data = activeRows.map((r) => {
        const base = [
          String(r?.estudiante?.no_control ?? ""),
          `${r?.estudiante?.nombre ?? ""} ${r?.estudiante?.ap_paterno ?? ""}`.trim(),
        ]
        const cells: (number | string)[] = []
        for (let u = 1; u <= unidades; u++) {
          const unit = r?.unidades?.find((x) => x.unidad === u)
          cells.push(unit?.calificacion ?? "")
          cells.push(unit?.asistencia ?? "")
        }
        return [...base, ...cells]
      })

      const aoa = [head, ...data]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Calificaciones")
      XLSX.writeFile(wb, `plantilla_calificaciones_grupo_${id_grupo}.xlsx`)

      setMsgKind("ok")
      setMsgAlu(t("classGroupDetail.messages.gradesTemplateXlsxOk", { count: data.length }))
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || t("classGroupDetail.messages.gradesTemplateXlsxError"))
    }
  }

  async function downloadGradesTemplateCSV() {
    try {
      const unidades = Number(alumnos.unidades || 0)
      const head = buildGradesHeaders(unidades)
      const rows: string[][] = activeRows.map((r) => {
        const base = [
          String(r?.estudiante?.no_control ?? ""),
          `${r?.estudiante?.nombre ?? ""} ${r?.estudiante?.ap_paterno ?? ""}`.trim(),
        ]
        const cells: (number | string)[] = []
        for (let u = 1; u <= unidades; u++) {
          const unit = r?.unidades?.find((x) => x.unidad === u)
          cells.push(unit?.calificacion ?? "")
          cells.push(unit?.asistencia ?? "")
        }
        return [...base, ...cells].map((v) => String(v ?? ""))
      })

      const lines = [
        head.join(","),
        ...rows.map((r) =>
          r.map((s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)).join(",")
        ),
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `plantilla_calificaciones_grupo_${id_grupo}.csv`
      a.click()
      URL.revokeObjectURL(url)

      setMsgKind("ok")
      setMsgAlu(t("classGroupDetail.messages.gradesTemplateCsvOk", { count: rows.length }))
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || t("classGroupDetail.messages.gradesTemplateCsvError"))
    }
  }

  // ===== Importar calificaciones y asistencias desde XLSX/CSV
  async function handleImportGrades(file: File) {
    if (!file) return
    try {
      setImportingGrades(true)
      setMsgAlu(null)

      let rows: Record<string, unknown>[] = []
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text()
        const lines = text.split(/\r?\n/).filter(Boolean)
        const headers = lines[0].split(",").map((h) => normalizeKey(h))
        rows = lines.slice(1).map((line) => {
          const values = line.split(",")
          return headers.reduce((obj: Record<string, string>, header, i) => {
            const raw = values[i] ?? ""
            obj[header] = raw.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
            return obj
          }, {})
        })
      } else {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
        rows = json.map((r) => {
          const m: Record<string, unknown> = {}
          Object.keys(r).forEach((k) => (m[normalizeKey(k)] = r[k]))
          return m
        })
      }

      const unidades = Number(alumnos.unidades || 0)
      const byNC = new Map<
        string,
        { nc: string; units: Array<{ unidad: number; calificacion?: number; asistencia?: number }> }
      >()
      for (const r of rows) {
        let nc = String(
          (r["NO_CONTROL"] ??
            (r as any)["NO CONTROL"] ??
            (r as any)["NO._CONTROL"] ??
            (r as any)["NO. CONTROL"] ??
            (r as any)["NO"] ??
            (r as any)["NO_"] ??
            (r as any)["NOCONTROL"] ??
            (r as any)["NO CONTROL "] ??
            (r as any)["NO_CONTROL "] ??
            (r as any)["NO_CONTROL."] ??
            (r as any)["NO_CONTROL__"] ??
            (r as any)["NO."] ??
            (r as any)["NO_CONTROL"] ??
            (r as any)["NO.CONTROL"] ??
            (r as any)["no_control"] ??
            (r as any)["No. control"] ??
            "") as string
        ).trim()
        if (!nc) continue

        const units: Array<{ unidad: number; calificacion?: number; asistencia?: number }> = []
        for (let u = 1; u <= unidades; u++) {
          const c = normPct((r as any)[`U${u}_CAL`])
          const a = normAsist((r as any)[`U${u}_ASIST`])
          if (c === null && a === null) continue
          const entry: any = { unidad: u }
          if (c !== null) entry.calificacion = c
          if (a !== null) entry.asistencia = a
          units.push(entry)
        }
        if (units.length === 0) continue
        byNC.set(nc, { nc, units })
      }

      if (byNC.size === 0) {
        setMsgKind("error")
        setMsgAlu(t("classGroupDetail.messages.gradesFileEmpty"))
        return
      }

      const mapIns = new Map<string, number>()
      for (const r of alumnos.rows || []) {
        const nc = String(r?.estudiante?.no_control ?? "").trim()
        if (nc) mapIns.set(nc, r.id_inscripcion)
      }

      let ok = 0,
        bad = 0,
        skipped = 0
      const tasks: Promise<any>[] = []

      byNC.forEach(({ nc, units }) => {
        const id = mapIns.get(nc)
        if (!id) {
          skipped++
          return
        }
        const payload = { unidades: units }
        tasks.push(
          api
            .put(`/inscripciones/${id}/unidades`, payload)
            .then(() => ok++)
            .catch(() => bad++)
        )
      })

      await Promise.allSettled(tasks)
      await loadAlumnos(id_grupo)

      setMsgKind(bad === 0 ? "ok" : "error")
      setMsgAlu(t("classGroupDetail.messages.gradesImportSummary", { ok, bad, skipped }))
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e?.message || t("classGroupDetail.messages.gradesImportError"))
    } finally {
      setImportingGrades(false)
      if (gradesFileRef.current) gradesFileRef.current.value = ""
    }
  }

  const headerTitle =
    titulo ||
    t("classGroupDetail.header.titleFallback", { id: id_grupo })
  const headerFull = t("classGroupDetail.header.title", { title: headerTitle })

  return (
    <div className="space-y-4">
      {/* Estilos para scrollbar personalizada */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #e2e8f0;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(to right, #f1f5f9, #e2e8f0);
          border-radius: 10px;
          margin: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #94a3b8, #64748b);
          border-radius: 10px;
          border: 3px solid #f1f5f9;
          box-shadow: inset 0 0 6px rgba(0,0,0,0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #64748b, #475569);
          border-color: #e2e8f0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, #475569, #334155);
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f1f5f9;
          border-radius: 10px;
        }
      `}</style>

      {/* ====== Header / acciones ====== */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">{headerFull}</div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarGraficasPDF()}
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors inline-flex items-center justify-center
                     bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]
                     text-[var(--text)] disabled:opacity-60"
            disabled={exportingCharts}
          >
            <FiDownload className="mr-2" size={16} />
            {exportingCharts
              ? t("classGroupDetail.buttons.exportChartsLoading")
              : t("classGroupDetail.buttons.exportCharts")}
          </button>

          <button
            onClick={() => exportarPDF()}
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors inline-flex items-center justify-center
                     bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]
                     text-[var(--text)]"
          >
            <FiDownload className="mr-2" size={16} />
            {t("classGroupDetail.buttons.exportPDF")}
          </button>

          <Link to="/grupos/aula" className="rounded-md border px-3 py-1 text-sm inline-flex items-center">
            <FiArrowLeft className="mr-2" size={16} />
            {t("classGroupDetail.buttons.back")}
          </Link>
        </div>
      </div>

      {/* Mensaje */}
      {msgAlu && (
        <div className={`text-sm ${msgKind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msgAlu}</div>
      )}

      {/* ====== Tabla alumnos ====== */}
      <div className="rounded-2xl bg-white border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {t("classGroupDetail.summary.capacity", {
              current: sortedActiveRows.length,
              capacity: alumnos.cupo,
              units: alumnos.unidades,
            })}{" "}
            {sortedActiveRows.length >= (alumnos.cupo || 0) && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">
                {t("classGroupDetail.summary.full")}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {/* Agregar por No. control */}
            <input
              id="alu_noctrl"
              placeholder={t("classGroupDetail.inputs.noControlPlaceholder")}
              className="h-9 rounded-md border px-3 text-sm"
              disabled={sortedActiveRows.length >= (alumnos.cupo || 0)}
            />
            <button
              className="h-9 rounded-md border px-3 text-sm inline-flex items-center"
              disabled={sortedActiveRows.length >= (alumnos.cupo || 0)}
              onClick={() => {
                const el = document.getElementById("alu_noctrl") as HTMLInputElement
                if (el?.value) agregarPorNoControl(el.value)
              }}
            >
              <FiPlus className="mr-2" size={14} />
              {t("classGroupDetail.buttons.addStudent")}
            </button>

            {/* Importar INSCRIPCIONES */}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0]
                if (f) handleImportFile(f)
              }}
            />
            <button
              className="h-9 rounded-md border px-3 text-sm font-medium transition-colors inline-flex items-center"

              disabled={importing}
              onClick={() => fileRef.current?.click()}
              title={t("classGroupDetail.tooltips.importEnrollments")}
            >
              <FiUpload className="mr-2" size={14} />
              {importing
                ? t("classGroupDetail.buttons.importEnrollmentsLoading")
                : t("classGroupDetail.buttons.importEnrollments")}
            </button>

            {/* Subir Calificaciones */}
            <input
              ref={gradesFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0]
                if (f) handleImportGrades(f)
              }}
            />
            <button
              className="h-9 rounded-md border px-3 text-sm font-medium transition-colors inline-flex items-center"
              disabled={importingGrades}
              onClick={() => gradesFileRef.current?.click()}
              title={t("classGroupDetail.tooltips.importGrades")}
            >
              <FiUpload className="mr-2" size={14} />
              {importingGrades
                ? t("classGroupDetail.buttons.uploadGradesLoading")
                : t("classGroupDetail.buttons.uploadGrades")}
            </button>

            {/* Menú de plantillas */}
            <div ref={templateButtonRef} className="relative">
              <button
                className="h-9 rounded-md border px-3 text-sm font-medium transition-colors inline-flex items-center"
                onClick={() => setShowTemplateOptions((v) => !v)}
              >
                <FiFilter className="mr-2" size={14} />
                {t("classGroupDetail.buttons.template")}
              </button>

              {showTemplateOptions && (
                <div className="absolute right-0 mt-1 w-56 z-30 overflow-hidden dropdown-menu">
                  <ul className="py-1">
                    {/* Inscripciones */}
                    <li className="px-3 py-1 text-[11px] text-slate-500">
                      {t("classGroupDetail.templatesMenu.enrollmentsSection")}
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          void downloadTemplateXLSX()
                          setShowTemplateOptions(false)
                        }}
                      >
                        {t("classGroupDetail.templatesMenu.enrollmentsXlsx")}
                      </a>
                    </li>

                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          void downloadTemplateCSV()
                          setShowTemplateOptions(false)
                        }}
                      >
                        {t("classGroupDetail.templatesMenu.enrollmentsCsv")}
                      </a>
                    </li>

                    <div className="dropdown-sep" />

                    {/* Calificaciones */}
                    <li className="px-3 py-1 text-[11px] text-slate-500">
                      {t("classGroupDetail.templatesMenu.gradesSection")}
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          void downloadGradesTemplateXLSX()
                          setShowTemplateOptions(false)
                        }}
                      >
                        {t("classGroupDetail.templatesMenu.gradesXlsx")}
                      </a>
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          void downloadGradesTemplateCSV()
                          setShowTemplateOptions(false)
                        }}
                      >
                        {t("classGroupDetail.templatesMenu.gradesCsv")}
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-auto rounded-xl border custom-scrollbar">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 text-left">
                <th className="text-[10px] font-semibold">{t("classGroupDetail.table.noControl")}</th>
                <th className="text-[10px] font-semibold">{t("classGroupDetail.table.firstName")}</th>
                <th className="text-[10px] font-semibold">{t("classGroupDetail.table.lastName1")}</th>
                <th className="text-[10px] font-semibold">{t("classGroupDetail.table.lastName2")}</th>
                {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map((u) => (
                  <Fragment key={`u_head_${u}`}>
                    <th className="text-center text-[10px] font-semibold">
                      {t("classGroupDetail.table.unitCalShort", { u })}
                    </th>
                    <th className="text-center text-[10px] font-semibold">
                      {t("classGroupDetail.table.unitAttendanceShort", { u })}
                    </th>
                  </Fragment>
                ))}
                <th className="text-center font-bold text-[10px]">
                  {t("classGroupDetail.table.averageShort")}
                </th>
                <th className="text-right text-[10px] font-semibold">
                  {t("classGroupDetail.table.actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loadingAlu && (
                <tr>
                  <td
                    colSpan={6 + (alumnos.unidades || 0) * 2}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {t("classGroupDetail.table.loading")}
                  </td>
                </tr>
              )}

              {!loadingAlu && pagedAlu.length === 0 && (
                <tr>
                  <td
                    colSpan={6 + (alumnos.unidades || 0) * 2}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    {t("classGroupDetail.table.empty")}
                  </td>
                </tr>
              )}

              {!loadingAlu &&
                pagedAlu.length > 0 &&
                pagedAlu.map((r) => {
                  const estado = getEstado(r)
                  const esBaja = estado === "BAJA"
                  const promedio = calcularPromedioAlumno(r?.unidades)

                  return (
                    <tr key={r.id_inscripcion} className="[&>td]:px-2 [&>td]:py-1 hover:bg-slate-50">
                      <td className="whitespace-nowrap font-mono text-[11px]">
                        {r.estudiante?.no_control}
                      </td>
                      <td className="whitespace-nowrap text-[11px]">
                        {r.estudiante?.nombre}
                      </td>
                      <td className="whitespace-nowrap text-[11px]">
                        {r.estudiante?.ap_paterno}
                      </td>
                      <td className="whitespace-nowrap text-[11px]">
                        {r.estudiante?.ap_materno}
                      </td>

                      {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map((u) => {
                        const cal = r.unidades?.find((x) => x.unidad === u)?.calificacion ?? ""
                        const asi = r.unidades?.find((x) => x.unidad === u)?.asistencia ?? ""
                        return (
                          <Fragment key={`u_row_${r.id_inscripcion}-${u}`}>
                            <td className="text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={cal as any}
                                disabled={esBaja}
                                className="h-7 w-12 rounded border px-1 text-[11px] text-center disabled:opacity-60 disabled:bg-slate-50"
                                onBlur={(e) =>
                                  actualizarUnidad(
                                    r.id_inscripcion,
                                    u,
                                    "calificacion",
                                    e.currentTarget.value
                                  )
                                }
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="number"
                                min={0}
                                defaultValue={asi as any}
                                disabled={esBaja}
                                placeholder="0"
                                className="h-7 w-12 rounded border px-1 text-[11px] text-center disabled:opacity-60 disabled:bg-slate-50"
                                onBlur={(e) =>
                                  actualizarUnidad(
                                    r.id_inscripcion,
                                    u,
                                    "asistencia",
                                    e.currentTarget.value
                                  )
                                }
                              />
                            </td>
                          </Fragment>
                        )
                      })}

                      <td className="text-center font-semibold text-[11px]">
                        {promedio !== null ? (
                          <span className={estaAprobado(r?.unidades) ? "text-emerald-600" : "text-red-600"}>
                            {promedio}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="text-right whitespace-nowrap">
                        {esBaja ? (
                          <button
                            className="rounded border px-2 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50 inline-flex items-center"
                            onClick={() => reactivarInscripcion(r.id_inscripcion)}
                            title={t("classGroupDetail.tooltips.reactivate")}
                          >
                            <FiRefreshCw className="mr-1" size={12} />
                            {t("classGroupDetail.buttons.reactivate")}
                          </button>
                        ) : (
                          <button
                            className="rounded border px-2 py-0.5 text-[10px] text-orange-700 hover:bg-orange-50 inline-flex items-center"
                            onClick={() => bajaInscripcion(r.id_inscripcion)}
                            title={t("classGroupDetail.tooltips.drop")}
                          >
                            <FiTrash2 className="mr-1" size={12} />
                            {t("classGroupDetail.buttons.drop")}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Paginación simple */}
        {totalPagesAlu > 1 && (
          <div className="flex items-center justify-end gap-2">
            <button
              className="rounded-md border px-2 py-1 text-sm disabled:opacity-50 inline-flex items-center"
              onClick={() => setPageAlu((p) => Math.max(1, p - 1))}
              disabled={pageSafeAlu <= 1}
            >
              <FiArrowLeft className="mr-1" size={14} />
              {t("classGroupDetail.buttons.paginationPrev")}
            </button>
            <span className="text-sm text-slate-600">
              {t("classGroupDetail.pagination.summary", {
                page: pageSafeAlu,
                totalPages: totalPagesAlu,
              })}
            </span>
            <button
              className="rounded-md border px-2 py-1 text-sm disabled:opacity-50 inline-flex items-center"
              onClick={() => setPageAlu((p) => Math.min(totalPagesAlu, p + 1))}
              disabled={pageSafeAlu >= totalPagesAlu}
            >
              {t("classGroupDetail.buttons.paginationNext")}
              <FiArrowRight className="ml-1" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ====== Sección de Gráficas (2 por fila) ====== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          ref={pieRef}
          data-export-title={t("classGroupDetail.charts.pieTitle")}
          className="rounded-xl bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] shadow-sm p-4"
        >
          <PieChartPage grupo={grupo} alumnos={activeRows} />
        </div>

        <div
          ref={scatterRef}
          data-export-title={t("classGroupDetail.charts.scatterTitle")}
          className="rounded-xl bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] shadow-sm p-4"
        >
          <ScatterChartPage alumnos={activeRows} />
        </div>

        <div
          ref={controlRef}
          data-export-title={t("classGroupDetail.charts.controlTitle")}
          className="rounded-xl bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] shadow-sm p-4"
        >
          <ControlChart promedio={promedio} />
        </div>

        <div
          ref={paretoRef}
          data-export-title={t("classGroupDetail.charts.paretoTitle")}
          className="rounded-xl bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] shadow-sm p-4"
        >
          <div className="h-[440px]">
            <ParetoChart id_grupo={id_grupo} />
          </div>
        </div>
      </section>

      {/* ====== Overlay de carga (sin scroll) ====== */}
      {exportingCharts && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("classGroupDetail.charts.exportOverlayTitle")}
        >
          <div className="rounded-xl bg-white shadow-lg px-5 py-4 flex items-center gap-3">
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" role="img" aria-label="cargando">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-medium">{t("classGroupDetail.charts.exportOverlayTitle")}</p>
              <p className="text-sm text-slate-600">
                {t("classGroupDetail.charts.exportOverlaySubtitle")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de baja */}
      <ModalBaja
        open={showBajaModal}
        onConfirm={handleBajaRegistrada}
        onCancel={cerrarModalBaja}
        idInscripcion={id_inscripcion}
      />
    </div>
  )
}