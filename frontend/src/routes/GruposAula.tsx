// src/routes/GruposAula.tsx
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Catalogos } from "../lib/catalogos"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import api from "../lib/api"
import confirmService from '../lib/confirmService'
import * as XLSX from "xlsx"
import { useTranslation } from "react-i18next"
import { FiArrowRight, FiArrowLeft, FiPlus, FiDownload, FiUpload, FiFilter, FiTrash2 } from 'react-icons/fi'
import { getCareerLabel, getSubjectLabel, formatHorario, getGenericLabel, getTermLabel, shortLabel } from '../lib/labels'
import SpeakOnClick from '../components/SpeakOnClick'

type Grupo = {
  id_grupo: number
  grupo_codigo: string
  horario: string
  cupo: number
  materia?: { id_materia?: number; nombre: string }
  docente?: { nombre: string; ap_paterno: string | null; ap_materno: string | null }
  modalidad?: { nombre: string }
}

export default function GruposAula() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [terminos, setTerminos] = useState<any[]>([])
  const [terminoId, setTerminoId] = useState<number | null>(null)
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materiaId, setMateriaId] = useState<number | null>(null)
  const [query, setQuery] = useState("")

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // paginación
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Cargar términos y setear el guardado (o primero por defecto)
  useEffect(() => {
    async function boot() {
      const tms = await Catalogos.terminos()
      setTerminos(tms ?? [])
      const saved = Number(localStorage.getItem("grupos.terminoId") || "")
      if (saved && (tms ?? []).some((x: any) => x.id_termino === saved)) {
        setTerminoId(saved)
      } else {
        setTerminoId(null)
      }
    }
    void boot()
    // re-run when language changes so translated term labels are fetched
  }, [i18n?.language])

  // Cargar grupos según filtros seleccionados
  useEffect(() => {
    async function load(silent = false) {
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
        setGrupos(data || [])
      } catch (e: any) {
        setErr(
          t("classGroups.errors.loadFailed", {
            message: e?.message ?? "",
          })
        )
      } finally {
        if (!silent) setLoading(false)
      }
    }
    setPage(1)
    void load()

    // refrescar silenciosamente al volver del background/enfocar/reconectar
    const handler = () => void load(true)
    window.addEventListener("focus", handler)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handler()
    })
    window.addEventListener("online", handler)
    return () => {
      window.removeEventListener("focus", handler)
      window.removeEventListener("online", handler)
      document.removeEventListener("visibilitychange", () => { })
    }
    // Re-run when filters or language change so server returns translated fields
  }, [terminoId, carreraId, materiaId, t, i18n?.language])

  // Persistir selección de término
  useEffect(() => {
    if (terminoId) localStorage.setItem("grupos.terminoId", String(terminoId))
  }, [terminoId])

  // Filtro de texto en cliente
  const lista = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return grupos
    return grupos.filter((g) => {
      const mat = (getSubjectLabel(g.materia) || g.materia?.nombre || "").toLowerCase()
      const cod = g.grupo_codigo?.toLowerCase() || ""
      const doc = `${g.docente?.nombre || ""} ${g.docente?.ap_paterno || ""}`.toLowerCase()
      return mat.includes(q) || cod.includes(q) || doc.includes(q)
    })
  }, [grupos, query, i18n?.language])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(lista.length / pageSize)),
    [lista.length]
  )
  const pageSafe = Math.min(page, totalPages)
  const start = (pageSafe - 1) * pageSize
  const end = start + pageSize
  const paged = useMemo(() => lista.slice(start, end), [lista, start, end])

  // ====== Modal de alumnos por grupo ======
  const [openAlumnos, setOpenAlumnos] = useState<{ id_grupo: number; titulo: string } | null>(null)
  const [alumnos, setAlumnos] = useState<any>({ cupo: 0, unidades: 0, rows: [] as any[] })
  const [loadingAlu, setLoadingAlu] = useState(false)
  const [msgAlu, setMsgAlu] = useState<string | null>(null)
  const [pageAlu, setPageAlu] = useState(1)
  const pageSizeAlu = 15
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

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

  async function openModalAlumnos(g: any) {
    setMsgAlu(null)
    setOpenAlumnos({
      id_grupo: g.id_grupo,
      titulo: `${getSubjectLabel(g.materia) ?? ""} • ${g.grupo_codigo}`,
    })
    setPageAlu(1)
    await loadAlumnos(g.id_grupo)
  }

  async function loadAlumnos(id_grupo: number) {
    setLoadingAlu(true)
    setMsgAlu(null)
    try {
      let path = `/inscripciones?grupo_id=${id_grupo}`
      if (i18n?.language && String(i18n.language).startsWith("en")) path += "&lang=en"
      const data = await api.get(path)
      setAlumnos(data || { cupo: 0, unidades: 0, rows: [] })
    } catch (e: any) {
      setMsgAlu(
        e?.message ||
        t("classGroups.studentsModal.messages.errorGeneric")
      )
    } finally {
      setLoadingAlu(false)
    }
  }

  async function agregarPorNoControl(no_control: string) {
    if (!openAlumnos) return
    setMsgAlu(null)
    try {
      if ((alumnos.rows?.length || 0) >= (alumnos.cupo || 0)) {
        setMsgAlu(t("classGroups.studentsModal.full"))
        return
      }
      const q = encodeURIComponent(no_control.trim())
      let estPath = `/estudiantes?q=${q}`
      if (i18n?.language && String(i18n.language).startsWith("en")) estPath += "&lang=en"
      const res = await api.get(estPath)
      const listaRes = Array.isArray(res?.rows) ? res.rows : res
      const est =
        (listaRes || []).find(
          (x: any) => String(x.no_control) === no_control.trim()
        ) || (listaRes || [])[0]
      if (!est) {
        setMsgAlu(
          t("classGroups.studentsModal.messages.studentNotFound")
        )
        return
      }
      await api.post("/inscripciones", {
        id_estudiante: est.id_estudiante,
        id_grupo: openAlumnos.id_grupo,
      }, { skipConfirm: true } as any)
      await loadAlumnos(openAlumnos.id_grupo)
    } catch (e: any) {
      setMsgAlu(
        e?.message ||
        t("classGroups.studentsModal.messages.errorGeneric")
      )
    }
  }

  async function actualizarUnidad(
    id_inscripcion: number,
    unidad: number,
    campo: "calificacion" | "asistencia",
    valor: string
  ) {
    if (!openAlumnos) return
    const num = Number(valor)
    if (!isFinite(num)) return
    try {
      const payload = { unidades: [{ unidad, [campo]: num }] }
      await api.put(`/inscripciones/${id_inscripcion}/unidades`, payload, { skipConfirm: true } as any)
    } catch {
      // silencioso
    }
  }

  async function bajaInscripcion(id_inscripcion: number) {
    if (!openAlumnos) return
    try {
      const ok = await confirmService.requestConfirm({
        titleKey: 'confirm.delete.title',
        descriptionText: t('classGroups.studentsModal.confirmUnsubscribe') || t('confirm.delete.description'),
        confirmLabelKey: 'confirm.yes',
        cancelLabelKey: 'confirm.no',
        danger: true,
      })
      if (!ok) return
      await api.delete(`/inscripciones/${id_inscripcion}`, { skipConfirm: true } as any)
      await loadAlumnos(openAlumnos.id_grupo)
        ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: t('classGroups.studentsModal.messages.unsubscribed') || 'Inscripción eliminada' })
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const msg = format(e, { entity: 'la inscripción', action: 'delete' })
        ; (await import('../lib/notifyService')).default.notify({ type: 'error', message: msg })
    }
  }

  async function onImportFile(file: File) {
    if (!openAlumnos || !file) return
    try {
      setImporting(true)
      setMsgAlu(null)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" })
      const list: string[] = []
      for (const r of rows) {
        const vals = Object.values(r)
        let nc = ""
        if (r.no_control != null) nc = String(r.no_control)
        else if (r["No. control"] != null) nc = String(r["No. control"])
        else if (r["NO CONTROL"] != null) nc = String(r["NO CONTROL"])
        else if (vals.length) nc = String(vals[0])
        nc = nc.trim()
        if (nc) list.push(nc)
      }
      if (list.length === 0) {
        setMsgAlu(
          t("classGroups.studentsModal.messages.noControlInFile")
        )
        return
      }
      await api.post("/inscripciones/bulk", {
        id_grupo: openAlumnos.id_grupo,
        no_control: list,
      })
      await loadAlumnos(openAlumnos.id_grupo)
    } catch (e: any) {
      setMsgAlu(
        e?.message ||
        t("classGroups.studentsModal.messages.importError")
      )
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([["no_control"], [""]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Alumnos")
    XLSX.writeFile(wb, "plantilla_inscripciones.xlsx")
  }

  const alumnosCount = (alumnos.rows || []).length

  return (
    <div className="space-y-6">
      {/* Filtros superiores */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="grid gap-1 w-40 min-w-0">
          <label className="text-xs text-slate-500">
            {t("classGroups.filters.termLabel")}
          </label>
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={terminoId ?? ""}
            onChange={(e) => {
              const v = e.target.value
              if (!v) {
                setTerminoId(null)
                localStorage.removeItem("grupos.terminoId")
              } else {
                const n = Number(v)
                setTerminoId(n)
                localStorage.setItem("grupos.terminoId", String(n))
              }
            }}
          >
            <option value="">
              {t("classGroups.filters.termAll")}
            </option>
            {terminos.map((tmo) => (
              <option key={tmo.id_termino} value={tmo.id_termino}>
                {getTermLabel(tmo)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1 w-56 min-w-0">
          <label className="text-xs text-slate-500">{t("classGroups.filters.careerLabel")}</label>
          <CarreraPicker
            value={carreraId ?? undefined}
            onChange={(id) => {
              setCarreraId(id as number | null)
              setMateriaId(null)
            }}
            label={false}
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <div className="grid gap-1 w-56 min-w-0">
          <label className="text-xs text-slate-500">
            {t("classGroups.filters.subjectLabel")}
          </label>
          <MateriaPicker
            value={materiaId}
            onChange={setMateriaId}
            terminoId={terminoId ?? undefined}
            carreraId={carreraId ?? undefined}
          />
        </div>

        <div className="grid gap-1 flex-1 min-w-0">
          <label className="text-xs text-slate-500">
            {t("classGroups.filters.searchLabel")}
          </label>
          <input
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full max-w-full box-border"
            placeholder={t("classGroups.filters.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {t("classGroups.header.title")}
        </h3>
        <div className="text-sm text-slate-500">
          {loading
            ? t("classGroups.header.loading")
            : t("classGroups.header.results", { count: lista.length })}
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {lista.length === 0 && !loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
          {t("classGroups.empty.noResults")}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {paged.map((g) => (
              <div
                key={g.id_grupo}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 truncate">
                      <SpeakOnClick className="block">{getSubjectLabel(g.materia) || "—"}</SpeakOnClick>
                    </div>
                    {/* Carrera si está disponible */}
                    {(() => {
                      const carreraObj = (g as any)?.materia?.carrera || ((g as any)?.materia?.carrera_nombre ? { nombre: (g as any)?.materia?.carrera_nombre } : undefined)
                      const carreraLabel = getCareerLabel(carreraObj)
                      return carreraLabel ? (
                        <div className="text-[11px] text-slate-400 truncate">
                          <SpeakOnClick className="block">{shortLabel(carreraLabel, 2)}</SpeakOnClick>
                        </div>
                      ) : null
                    })()}
                    <div className="text-lg font-semibold leading-tight truncate">
                      <SpeakOnClick className="block">{g.grupo_codigo}</SpeakOnClick>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 whitespace-nowrap">
                    {getGenericLabel(g.modalidad) || "—"}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm">
                  <div className="truncate">
                    <SpeakOnClick className="block">{g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "N/D"}</SpeakOnClick>
                  </div>
                  <div className="text-slate-600">{formatHorario(g.horario)}</div>
                  <div className="text-slate-500 text-xs">
                    {t("classGroups.cards.capacity", {
                      capacity: g.cupo,
                    })}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50 inline-flex items-center"
                    onClick={() => {
                      const titulo = `${getSubjectLabel(g.materia) ?? ""} • ${g.grupo_codigo}`
                      navigate(`/grupos/aula/${g.id_grupo}`, {
                        state: { id_grupo: g.id_grupo, titulo },
                      })
                    }}
                  >
                    {t("classGroups.cards.details")}
                    <FiArrowRight className="ml-2" size={14} />
                  </button>

                  {/* Si quieres volver a usar el modal de alumnos, puedes descomentar:
                  <button
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => openModalAlumnos(g)}
                  >
                    {t("classGroups.studentsModal.openButton")}
                  </button>
                  */}
                </div>
              </div>
            ))}
          </div>
          {/* paginación */}
          <div className="flex items-center justify-between pt-3 text-sm">
            <div className="text-slate-600">
              {t("classGroups.pagination.summary", {
                from: lista.length === 0 ? 0 : start + 1,
                to: Math.min(end, lista.length),
                total: lista.length,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                type="button"
              >
                {t("classGroups.pagination.prev")}
              </button>
              <div className="px-1">
                {t("classGroups.pagination.pageOf", {
                  page: pageSafe,
                  totalPages,
                })}
              </div>
              <button
                className="rounded-md border px-3 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
                type="button"
              >
                {t("classGroups.pagination.next")}
              </button>
            </div>
          </div>
        </>
      )}

      {openAlumnos && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setOpenAlumnos(null)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-lg">
                {t("classGroups.studentsModal.title", {
                  title: openAlumnos.titulo,
                })}
              </div>
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setOpenAlumnos(null)}
              >
                {t("classGroups.studentsModal.close")}
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {t("classGroups.studentsModal.summary", {
                    current: alumnosCount,
                    capacity: alumnos.cupo,
                    units: alumnos.unidades,
                  })}{" "}
                  {alumnosCount >= (alumnos.cupo || 0) && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">
                      {t("classGroups.studentsModal.full")}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    id="alu_noctrl"
                    placeholder={t(
                      "classGroups.studentsModal.addByIdPlaceholder"
                    )}
                    className="h-9 rounded-md border px-3 text-sm"
                    disabled={alumnosCount >= (alumnos.cupo || 0)}
                  />
                  <button
                    className="h-9 rounded-md border px-3 text-sm inline-flex items-center"
                    disabled={alumnosCount >= (alumnos.cupo || 0)}
                    onClick={() => {
                      const el = document.getElementById(
                        "alu_noctrl"
                      ) as HTMLInputElement
                      if (el?.value) agregarPorNoControl(el.value)
                    }}
                  >
                    <FiPlus className="mr-2" size={14} />
                    {t("classGroups.studentsModal.addButton")}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0]
                      if (f) onImportFile(f)
                    }}
                  />
                  <button
                    className="h-9 rounded-md border px-3 text-sm disabled:opacity-50 inline-flex items-center"
                    disabled={importing}
                    onClick={() => fileRef.current?.click()}
                  >
                    <FiUpload className="mr-2" size={14} />
                    {importing
                      ? t("classGroups.studentsModal.importing")
                      : t("classGroups.studentsModal.importButton")}
                  </button>
                  <button
                    className="h-9 rounded-md border px-3 text-sm inline-flex items-center"
                    onClick={downloadTemplate}
                  >
                    <FiDownload className="mr-2" size={14} />
                    {t("classGroups.studentsModal.templateButton")}
                  </button>
                </div>
              </div>

              {msgAlu && (
                <div className="text-sm text-red-600">{msgAlu}</div>
              )}

              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                      <th>
                        {t(
                          "classGroups.studentsModal.table.noControl"
                        )}
                      </th>
                      <th>
                        {t("classGroups.studentsModal.table.name")}
                      </th>
                      {Array.from(
                        { length: alumnos.unidades || 0 },
                        (_, i) => i + 1
                      ).map((u) => (
                        <Fragment key={`u_head_${u}`}>
                          <th className="text-center">
                            {t(
                              "classGroups.studentsModal.table.unitCalShort",
                              { u }
                            )}
                          </th>
                          <th className="text-center">
                            {t(
                              "classGroups.studentsModal.table.unitAttendanceShort",
                              { u }
                            )}
                          </th>
                        </Fragment>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingAlu && (
                      <tr>
                        <td
                          colSpan={
                            2 + (alumnos.unidades || 0) * 2 + 1
                          }
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          {t(
                            "classGroups.studentsModal.table.loading"
                          )}
                        </td>
                      </tr>
                    )}
                    {!loadingAlu && pagedAlu.length === 0 && (
                      <tr>
                        <td
                          colSpan={
                            2 + (alumnos.unidades || 0) * 2 + 1
                          }
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          {t(
                            "classGroups.studentsModal.table.empty"
                          )}
                        </td>
                      </tr>
                    )}
                    {!loadingAlu &&
                      pagedAlu.length > 0 &&
                      pagedAlu.map((r: any) => (
                        <tr
                          key={r.id_inscripcion}
                          className="[&>td]:px-3 [&>td]:py-2"
                        >
                          <td className="whitespace-nowrap">
                            {r.estudiante?.no_control}
                          </td>
                          <td className="whitespace-nowrap">
                            {`${r.estudiante?.nombre ?? ""} ${r.estudiante?.ap_paterno ?? ""
                              }`}
                          </td>
                          {Array.from(
                            { length: alumnos.unidades || 0 },
                            (_, i) => i + 1
                          ).map((u) => {
                            const cal =
                              r.unidades?.find(
                                (x: any) => x.unidad === u
                              )?.calificacion ?? ""
                            const asi =
                              r.unidades?.find(
                                (x: any) => x.unidad === u
                              )?.asistencia ?? ""
                            return (
                              <Fragment
                                key={`u_row_${r.id_inscripcion}-${u}`}
                              >
                                <td className="text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    defaultValue={cal as any}
                                    className="h-9 w-20 rounded-md border px-2 text-sm text-center"
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
                                    className="h-9 w-20 rounded-md border px-2 text-sm text-center"
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
                          <td className="text-right">
                            <button
                              className="rounded-md border px-3 py-1 text-xs text-red-600 hover:bg-red-50 inline-flex items-center"
                              onClick={() =>
                                bajaInscripcion(r.id_inscripcion)
                              }
                            >
                              <FiTrash2 className="mr-2" size={12} />
                              {t(
                                "classGroups.studentsModal.dropButton"
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-600">
                  {t(
                    "classGroups.studentsModal.pagination.summary",
                    {
                      from:
                        alumnos.rows.length === 0
                          ? 0
                          : startAlu + 1,
                      to: Math.min(
                        endAlu,
                        alumnos.rows.length
                      ),
                      total: alumnos.rows.length,
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border px-3 py-1 disabled:opacity-50"
                    disabled={pageSafeAlu <= 1}
                    onClick={() =>
                      setPageAlu((p) => Math.max(1, p - 1))
                    }
                  >
                    {t(
                      "classGroups.studentsModal.pagination.prev"
                    )}
                  </button>
                  <div className="px-1">
                    {t(
                      "classGroups.studentsModal.pagination.pageOf",
                      {
                        page: pageSafeAlu,
                        totalPages: totalPagesAlu,
                      }
                    )}
                  </div>
                  <button
                    className="rounded-md border px-3 py-1 disabled:opacity-50"
                    disabled={pageSafeAlu >= totalPagesAlu}
                    onClick={() =>
                      setPageAlu((p) =>
                        Math.min(totalPagesAlu, p + 1)
                      )
                    }
                  >
                    {t(
                      "classGroups.studentsModal.pagination.next"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}