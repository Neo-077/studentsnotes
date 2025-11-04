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

export default function GrupoAulaDetalle() {
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
  const [importing, setImporting] = useState(false)
  const [exportingCharts, setExportingCharts] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [grupo, setGrupo] = useState<GrupoResumen>({})
  const [promedio, setPromedio] = useState<any>({})
  const [showBajaModal, setShowBajaModal] = useState(false)
  const [id_inscripcion, setIdInscripcion] = useState<number>()
  const [showTemplateOptions, setShowTemplateOptions] = useState(false)
  const templateButtonRef = useRef<HTMLDivElement>(null)

  // Refs para exportar gráficas
  const pieRef = useRef<HTMLDivElement | null>(null)
  const scatterRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<HTMLDivElement | null>(null)
  const paretoRef = useRef<HTMLDivElement | null>(null)

  const totalPagesAlu = useMemo(
    () => Math.max(1, Math.ceil((alumnos.rows?.length || 0) / pageSizeAlu)),
    [alumnos]
  )
  const pageSafeAlu = Math.min(pageAlu, totalPagesAlu)
  const startAlu = (pageSafeAlu - 1) * pageSizeAlu
  const endAlu = startAlu + pageSizeAlu
  const pagedAlu = useMemo(
    () => (alumnos.rows || []).slice(startAlu, endAlu),
    [alumnos, startAlu, endAlu]
  )

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
      const data = await api.get(`/inscripciones?grupo_id=${id}`)
      setAlumnos({
        cupo: data?.cupo || 0,
        unidades: data?.unidades || 0,
        rows: (data?.rows || []) as AlumnoRow[],
      })
      setGrupo((data?.grupo || { aprobados: 0, reprobados: 0, total: 0 }) as GrupoResumen)
      setPromedio(data?.promedio || [])

      if (!titulo) {
        const first = (data?.rows || [])[0] as any
        const t = location?.state?.titulo
        setTitulo(typeof t === "string" && t ? t : first?.grupo_titulo || "")
      }
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || "Error")
    } finally {
      setLoadingAlu(false)
    }
  }

  async function agregarPorNoControl(no_control: string) {
    setMsgAlu(null)
    try {
      if ((alumnos.rows?.length || 0) >= (alumnos.cupo || 0)) {
        setMsgKind("error")
        setMsgAlu("Cupo lleno")
        return
      }
      const q = encodeURIComponent(no_control.trim())
      const res = await api.get(`/estudiantes?q=${q}`)
      const lista = Array.isArray(res?.rows) ? res.rows : res
      const est =
        (lista || []).find((x: any) => String(x.no_control) === no_control.trim()) ||
        (lista || [])[0]
      if (!est) {
        setMsgKind("error")
        setMsgAlu("Estudiante no encontrado")
        return
      }
      await api.post("/inscripciones", { id_estudiante: est.id_estudiante, id_grupo })
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu("Inscripción agregada")
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || "Error")
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
      await api.put(`/inscripciones/${id_inscripcion}/unidades`, payload)
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

  function setInscripcionStatusLocal(
    id: number,
    status: "BAJA" | "ACTIVA" | "APROBADA" | "REPROBADA"
  ) {
    const nextRows = (alumnos.rows || []).map((r) =>
      r.id_inscripcion === id ? { ...r, status } : r
    )
    setAlumnos((prev) => ({ ...prev, rows: nextRows }))

    setGrupo((prev) => {
      if (prev?.total == null) return prev
      const total = nextRows.length
      const aprobados = nextRows.filter((x) => String(x.status).toUpperCase() === "APROBADA").length
      const reprobados = nextRows.filter((x) => String(x.status).toUpperCase() === "REPROBADA").length
      return { ...prev, total, aprobados, reprobados }
    })
  }

  // Cuando el modal termina, actualizamos local y refrescamos
  async function handleBajaRegistrada(payload?: { id_inscripcion?: number }) {
    if (payload?.id_inscripcion) {
      setInscripcionStatusLocal(payload.id_inscripcion, "BAJA")
    }
    loadAlumnos(id_grupo)
    setMsgKind("ok")
    setMsgAlu("Inscripción dada de baja")
    cerrarModalBaja()
  }

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
        setMsgAlu("Archivo sin números de control")
        return
      }
      await api.post("/inscripciones/bulk", { id_grupo, no_control: list })
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu("Importación completada")
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e.message || "Error al importar")
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // === Elegibles para plantilla ===
  async function fetchElegiblesParaGrupo(id: number): Promise<Elegible[]> {
    try {
      const r1 = await api.get(`/grupos/${id}/elegibles`)
      if (Array.isArray(r1?.rows)) return r1.rows as Elegible[]
      if (Array.isArray(r1)) return r1 as Elegible[]
    } catch { }
    try {
      const r2 = await api.get(`/plantilla-inscripciones?grupo_id=${id}`)
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
          ? `Plantilla generada con ${elegibles.length} estudiantes elegibles.`
          : "No se encontraron elegibles; se generó plantilla vacía."
      )
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || "No se pudo generar la plantilla Excel")
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
          ? `Plantilla CSV generada con ${elegibles.length} estudiantes elegibles.`
          : "No se encontraron elegibles; se generó CSV vacío."
      )
    } catch (err: any) {
      setMsgKind("error")
      setMsgAlu(err?.message || "No se pudo generar la plantilla CSV")
    }
  }

  // ====== Exportar calificaciones a PDF ======
  function exportarPDF(opts?: { incluirAsistencia?: boolean }) {
    const incluirAsistencia = !!opts?.incluirAsistencia
    const unidades = Math.max(0, Number(alumnos?.unidades || 0))

    const colsCount = incluirAsistencia ? unidades * 2 + 2 : unidades + 2
    const needLandscape = colsCount > 8

    const doc = new jsPDF({
      orientation: needLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    })

    const tituloPDF = `Calificaciones — ${titulo || `Grupo ${id_grupo}`}`
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

    const headRow: string[] = ["No. Control", "Nombre"]
    for (let i = 1; i <= unidades; i++) {
      if (incluirAsistencia) headRow.push(`U${i} Cal`, `U${i} %`)
      else headRow.push(`U${i}`)
    }
    const head = [headRow]

    const body = (alumnos?.rows || []).map((r) => {
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
      return [...base, ...cells]
    })

    const startY = sub ? 34 : 28
    const columnStyles: Record<number, any> = {
      0: { cellWidth: 28, halign: "center", font: "courier" },
      1: { cellWidth: 62, halign: "left" },
    }
    for (let i = 2; i < headRow.length; i++) columnStyles[i] = { cellWidth: 16, halign: "center" }

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
        const text = `Página ${data.pageNumber} de ${pageCount}`
        const w = (pageSize as any).getWidth ? (pageSize as any).getWidth() : (pageSize as any).width
        const h = (pageSize as any).getHeight ? (pageSize as any).getHeight() : (pageSize as any).height
        doc.setFontSize(9)
        doc.setTextColor(120)
        doc.text(text, w - 14, h - 8, { align: "right" })
      },
    })

    try {
      const y = (doc as any).lastAutoTable?.finalY || startY
      if (y && y < doc.internal.pageSize.getHeight() - 20) {
        doc.setFontSize(10)
        doc.setTextColor(60)
        const total = Number((grupo?.total ?? alumnos?.rows?.length ?? 0) as number)
        const aprob = Number(grupo?.aprobados ?? 0)
        const reprob = Number(grupo?.reprobados ?? 0)
        const resumen = `Total: ${total}  •  Aprobados: ${aprob}  •  Reprobados: ${reprob}`
        doc.text(resumen, 14, y + 8)
      }
    } catch { }

    doc.save(`Calificaciones_${(titulo || `Grupo_${id_grupo}`).replace(/\s+/g, "_")}.pdf`)
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

    // ----- camino SVG optimizado -----
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
      bg.setAttribute("x", "0"); bg.setAttribute("y", "0")
      bg.setAttribute("width", String(w)); bg.setAttribute("height", String(h))
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

    // Fallback HTML
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
    const style = document.createElement("style")
    style.setAttribute("data-export-theme", "true")
    style.textContent = `
      :root { --text: #111; --surface: #ffffff; }
      .recharts-wrapper, .recharts-surface { background: #ffffff !important; }
    `
    document.head.appendChild(style)
    const prev = document.body.style.filter
    document.body.style.filter = "none"
    return () => {
      document.body.style.filter = prev
      document.head.removeChild(style)
    }
  }

  async function exportarGraficasPDF() {
    try {
      setMsgAlu(null)
      setExportingCharts(true)
      const unlock = lockScroll()
      const undoTheme = forceLightThemeForExport()

      const bloques: Array<{ ref: React.RefObject<HTMLDivElement>; titulo: string }> = [
        { ref: pieRef, titulo: "Pastel (Aprobados vs Reprobados)" },
        { ref: scatterRef, titulo: "Dispersión (Asistencia vs Promedio)" },
        { ref: controlRef, titulo: "Carta de Control (Promedios)" },
        { ref: paretoRef, titulo: "Pareto (Motivo de bajas)" },
      ]

      const hasAny = bloques.some((b) => b.ref.current?.querySelector("svg,canvas"))
      if (!hasAny) {
        setMsgKind("error")
        setMsgAlu("Aún no hay gráficas renderizadas.")
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
        doc.text(`${tituloGraf} — ${titulo || `Grupo ${id_grupo}`}`, margin, margin)

        const ratio = w / h
        const topImg = margin + 8
        let drawW = areaW
        let drawH = drawW / ratio
        if (drawH > areaH - 8) {
          drawH = areaH - 8
          drawW = drawH * ratio
        }
        const x = margin + (areaW - drawW) / 2
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
        setMsgAlu("No se pudo capturar ninguna gráfica.")
        setExportingCharts(false)
        undoTheme()
        unlock()
        return
      }

      doc.save(`Graficas_${(titulo || `Grupo_${id_grupo}`).replace(/\s+/g, "_")}.pdf`)
      undoTheme()
      unlock()
    } catch (err: any) {
      console.error(err)
      setMsgKind("error")
      setMsgAlu(err?.message || "Error al exportar gráficas")
    } finally {
      setExportingCharts(false)
    }
  }

  // Reactivar / Eliminar definitiva
  async function reactivarInscripcion(id: number) {
    try {
      setMsgAlu(null)
      await api.put(`/inscripciones/${id}`, { status: "ACTIVA" })
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu("Inscripción reactivada")
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e?.response?.data?.message || e.message || "Error al reactivar")
    }
  }

  async function eliminarInscripcion(id: number) {
    try {
      setMsgAlu(null)
      await api.delete(`/baja-materia/by-inscripcion/${id}`).catch(() => { })
      await api.delete(`/baja-materia?inscripcion=${id}`).catch(() => { })
      await api.delete(`/inscripciones/${id}`)
      await loadAlumnos(id_grupo)
      setMsgKind("ok")
      setMsgAlu("Inscripción eliminada")
    } catch (e: any) {
      setMsgKind("error")
      setMsgAlu(e?.response?.data?.message || e.message || "No se pudo eliminar la inscripción")
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
    const label = isBaja ? "INACTIVO" : s || "ACTIVA"
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ${clr}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* ====== Header / acciones ====== */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Alumnos — {titulo || `Grupo ${id_grupo}`}</div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarGraficasPDF()}
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors 
                     bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]
                     text-[var(--text)] disabled:opacity-60"
            disabled={exportingCharts}
          >
            {exportingCharts ? "Exportando gráficas…" : "Exportar gráficas"}
          </button>

          <button
            onClick={() => exportarPDF()}
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors 
                     bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]
                     text-[var(--text)]"
          >
            Exportar PDF
          </button>

          <Link to="/grupos/aula" className="rounded-md border px-3 py-1 text-sm">
            Volver
          </Link>
        </div>
      </div>

      {/* Mensaje */}
      {msgAlu && (
        <div className={`text-sm ${msgKind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msgAlu}</div>
      )}

      {/* ====== Tabla alumnos (SIN columna de Estado) ====== */}
      <div className="rounded-2xl bg-white border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Cupo: {(alumnos.rows || []).length} / {alumnos.cupo} • Unidades: {alumnos.unidades}{" "}
            {(alumnos.rows || []).length >= (alumnos.cupo || 0) && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">
                Cupo lleno
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input
              id="alu_noctrl"
              placeholder="No. control"
              className="h-9 rounded-md border px-3 text-sm"
              disabled={(alumnos.rows || []).length >= (alumnos.cupo || 0)}
            />
            <button
              className="h-9 rounded-md border px-3 text-sm"
              disabled={(alumnos.rows || []).length >= (alumnos.cupo || 0)}
              onClick={() => {
                const el = document.getElementById("alu_noctrl") as HTMLInputElement
                if (el?.value) agregarPorNoControl(el.value)
              }}
            >
              Agregar
            </button>

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
              className="h-9 rounded-md border px-3 text-sm font-medium transition-colors
                       bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]
                       disabled:opacity-50"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? "Importando…" : "Importar"}
            </button>

            <div ref={templateButtonRef} className="relative">
              <button
                className="h-9 rounded-md border px-3 text-sm font-medium transition-colors
                         bg-[var(--surface)] hover:bg-[color-mix(in_oklab,var(--text),transparent_92%)]"
                onClick={() => setShowTemplateOptions((v) => !v)}
              >
                Plantilla
              </button>

              {showTemplateOptions && (
                <div className="absolute right-0 mt-1 w-44 z-30 overflow-hidden dropdown-menu">
                  <ul className="py-1">
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
                        Excel (.xlsx)
                      </a>
                    </li>

                    <div className="dropdown-sep" />

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
                        CSV (.csv)
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>No. control</th>
                <th>Nombre</th>
                {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map((u) => (
                  <Fragment key={`u_head_${u}`}>
                    <th className="text-center">U{u} Cal</th>
                    <th className="text-center">U{u} Asist%</th>
                  </Fragment>
                ))}
                <th className="text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loadingAlu && (
                <tr>
                  <td
                    colSpan={3 + (alumnos.unidades || 0) * 2}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Cargando…
                  </td>
                </tr>
              )}

              {!loadingAlu && pagedAlu.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + (alumnos.unidades || 0) * 2}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Sin alumnos.
                  </td>
                </tr>
              )}

              {!loadingAlu &&
                pagedAlu.length > 0 &&
                pagedAlu.map((r) => {
                  const estado = getEstado(r)
                  const esBaja = estado === "BAJA"

                  return (
                    <tr key={r.id_inscripcion} className="[&>td]:px-3 [&>td]:py-2">
                      <td className="whitespace-nowrap">{r.estudiante?.no_control}</td>
                      <td className="whitespace-nowrap">
                        {`${r.estudiante?.nombre ?? ""} ${r.estudiante?.ap_paterno ?? ""}`}
                      </td>

                      {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map((u) => {
                        const cal =
                          r.unidades?.find((x) => x.unidad === u)?.calificacion ?? ""
                        const asi =
                          r.unidades?.find((x) => x.unidad === u)?.asistencia ?? ""
                        return (
                          <Fragment key={`u_row_${r.id_inscripcion}-${u}`}>
                            <td className="text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={cal as any}
                                disabled={esBaja}
                                className="h-9 w-20 rounded-md border px-2 text-sm text-center disabled:opacity-60"
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
                                max={100}
                                defaultValue={asi as any}
                                disabled={esBaja}
                                className="h-9 w-20 rounded-md border px-2 text-sm text-center disabled:opacity-60"
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

                      <td className="text-right space-x-2 whitespace-nowrap">
                        {esBaja ? (
                          <button
                            className="rounded-md border px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                            onClick={() => reactivarInscripcion(r.id_inscripcion)}
                            title="Reactivar inscripción"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            className="rounded-md border px-3 py-1 text-xs text-orange-700 hover:bg-orange-50"
                            onClick={() => bajaInscripcion(r.id_inscripcion)}
                            title="Dar de baja"
                          >
                            Baja
                          </button>
                        )}
                        <button
                          className="rounded-md border px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => eliminarInscripcion(r.id_inscripcion)}
                          title="Eliminar inscripción"
                        >
                          Eliminar
                        </button>
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
              className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
              onClick={() => setPageAlu((p) => Math.max(1, p - 1))}
              disabled={pageSafeAlu <= 1}
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600">
              Página {pageSafeAlu} / {totalPagesAlu}
            </span>
            <button
              className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
              onClick={() => setPageAlu((p) => Math.min(totalPagesAlu, p + 1))}
              disabled={pageSafeAlu >= totalPagesAlu}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* ====== Sección de Gráficas (2 por fila) ====== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          ref={pieRef}
          data-export-title="Pastel (Aprobados vs Reprobados)"
          className="rounded-xl bg-white border shadow p-4"
        >
          <div className="h-[420px]">
            <PieChartPage grupo={grupo} />
          </div>
        </div>

        <div
          ref={scatterRef}
          data-export-title="Dispersión (Asistencia vs Promedio)"
          className="rounded-xl bg-white border shadow p-4"
        >
          <div className="h-[420px]">
            <ScatterChartPage alumnos={alumnos?.rows} />
          </div>
        </div>

        <div
          ref={controlRef}
          data-export-title="Carta de Control (Promedios)"
          className="rounded-xl bg-white border shadow p-4"
        >
          <div className="h-[440px]">
            <ControlChart promedio={promedio} />
          </div>
        </div>

        <div
          ref={paretoRef}
          data-export-title="Pareto (Motivo de bajas)"
          className="rounded-xl bg-white border shadow p-4"
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
          aria-label="Exportando gráficas"
        >
          <div className="rounded-xl bg-white shadow-lg px-5 py-4 flex items-center gap-3">
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" role="img" aria-label="cargando">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-medium">Exportando gráficas…</p>
              <p className="text-sm text-slate-600">Esto puede tardar unos segundos.</p>
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
