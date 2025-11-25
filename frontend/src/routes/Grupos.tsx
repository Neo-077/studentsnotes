// src/routes/Grupos.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Catalogos } from "../lib/catalogos"
import ConfirmModal from "../components/ConfirmModal"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import api from "../lib/api"
import * as XLSX from "xlsx"

type Grupo = {
  id_grupo: number
  grupo_codigo: string
  horario: string
  cupo: number
  materia?: { id_materia?: number; nombre: string }
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
  const { t } = useTranslation()

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
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id?: number; label?: string }>({
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
        // Por defecto: Todos (null)
        setTerminoId(null)
        setForm((f) => ({ ...f, id_termino: null }))
      }
    }
    void boot()
  }, [])

  // materias por carrera
  useEffect(() => {
    async function loadMaterias() {
      const mats = await Catalogos.materias(carreraId ? { carrera_id: carreraId } : undefined)
      setMaterias(mats ?? [])
    }
    void loadMaterias()
  }, [carreraId])

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
      const path = qs ? `/grupos?${qs}` : "/grupos"
      const data = await api.get(path)
      if (reqRef.current === my) setGrupos(data || [])
    } catch (e: any) {
      if (reqRef.current === my)
        setErr(e.message || t("groups.errors.loadFailed"))
    } finally {
      if (reqRef.current === my) {
        if (!silent) setLoading(false)
      }
    }
  }
  useEffect(() => {
    setPage(1)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminoId, carreraId, materiaId])

  // refrescar en segundo plano al volver de background/enfocar/reconectar
  useEffect(() => {
    const handler = () => void load(true)
    window.addEventListener("focus", handler)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handler()
    })
    window.addEventListener("pageshow", handler)
    window.addEventListener("online", handler)
    return () => {
      window.removeEventListener("focus", handler)
      window.removeEventListener("online", handler)
      window.removeEventListener("pageshow", handler)
      document.removeEventListener("visibilitychange", () => {})
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
      const mat = g.materia?.nombre?.toLowerCase() || ""
      const cod = g.grupo_codigo?.toLowerCase() || ""
      const doc = `${g.docente?.nombre || ""} ${g.docente?.ap_paterno || ""}`.toLowerCase()
      const hor = g.horario?.toLowerCase() || ""
      return mat.includes(q) || cod.includes(q) || doc.includes(q) || hor.includes(q)
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
      const conflictos = await api.get(`/grupos?${q.toString()}`)
      if (Array.isArray(conflictos) && conflictos.length > 0) {
        return setMsg(t("groups.messages.teacherConflict"))
      }

      setSaving(true)
      await api.post("/grupos", payload)
      setMsg(t("groups.messages.created"))
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
      setMsg(`${baseMsg}${dupMsg}`)

      if (Array.isArray(res.errors)) setImportErrors(res.errors)

      if (detectedTerminoId) {
        setTerminoId(detectedTerminoId)
        localStorage.setItem("grupos.terminoId", String(detectedTerminoId))
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

  // Descargar plantilla en Excel con listas de referencia
  async function downloadTemplateXLSX() {
    const headers = ["carrera", "materia", "docente", "termino", "modalidad", "horario", "cupo"]

    const wsMain = XLSX.utils.aoa_to_sheet([headers])

    const carreras = await Catalogos.carreras().catch(() => [])

    const listaMaterias = (materias ?? []).map((m: any) => [m.nombre, m.clave ?? "", m.id_materia])
    const listaCarreras = (Array.isArray(carreras) ? carreras : (carreras as any)?.data ?? []).map(
      (c: any) => [c.nombre, c.clave ?? "", c.id_carrera]
    )
    const listaDocentes = (docentes ?? []).map((d: any) => [
      `${d.nombre} ${d.ap_paterno ?? ""} ${d.ap_materno ?? ""}`.trim(),
      d.id_docente,
    ])
    const listaModalidades = (modalidades ?? []).map((m: any) => [m.nombre, m.id_modalidad])
    const listaTerminos = (terminos ?? []).map((t: any) => [
      `${t.anio} ${String(t.periodo).toUpperCase()}`,
      t.id_termino,
    ])
    const listaHorarios = HORARIOS.map((h) => [h])

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
        "Rellena la hoja GRUPOS usando exactamente los textos de nombre/clave mostrados aquí. Campos: carrera (nombre o clave), materia (nombre o clave), docente (nombre completo), modalidad (nombre), termino (AAAA PERIODO), horario (LUN-VIE HH:00-HH:00), cupo. Si indicas carrera, la materia debe pertenecer a esa carrera.",
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
    const label = `${g.materia?.nombre ?? "—"} — ${g.grupo_codigo} — ${docente}`
    setConfirmDel({ open: true, id: g.id_grupo, label })
  }

  async function confirmDelete() {
    if (!confirmDel.id) {
      setConfirmDel({ open: false })
      return
    }
    setMsg(null)
    try {
      await api.delete(`/grupos/${confirmDel.id}`)
      setConfirmDel({ open: false })
      await load()
      setMsg(t("groups.messages.deleted"))
    } catch (e: any) {
      setMsg(
        (t("groups.messages.deleteErrorPrefix") as string) +
          (e.message || t("groups.messages.deleteGenericError"))
      )
    }
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

  return (
    <div className="space-y-6">
      {/* ===== Filtros ===== */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">
            {t("groups.filters.termLabel")}
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
            <option value="">{t("groups.filters.termAll")}</option>
            {terminos.map((tTerm) => (
              <option key={tTerm.id_termino} value={tTerm.id_termino}>
                {tTerm.anio} {tTerm.periodo}
              </option>
            ))}
          </select>
        </div>

        <ConfirmModal
          open={confirmDel.open}
          title={t("groups.deleteModal.title")}
          subtitle={t("groups.deleteModal.subtitle")}
          confirmLabel={t("groups.deleteModal.confirm")}
          danger
          onCancel={() => setConfirmDel({ open: false })}
          onConfirm={confirmDelete}
        >
          <div className="space-y-2 text-sm">
            <div>{t("groups.deleteModal.question")}</div>
            <div className="rounded-lg border bg-slate-50 px-3 py-2">
              {confirmDel.label}
            </div>
          </div>
        </ConfirmModal>

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">
            {t("groups.filters.careerLabel")}
          </label>
          <CarreraPicker
            value={carreraId ?? undefined}
            onChange={(id) => {
              setCarreraId(id as number | null)
              setMateriaId(null)
            }}
            label={false}
            className="h-10 w-full rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">
            {t("groups.filters.subjectLabel")}
          </label>
          <MateriaPicker
            value={materiaId}
            onChange={setMateriaId}
            terminoId={terminoId ?? undefined}
            carreraId={carreraId ?? undefined}
            disabled={!carreraId}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">
            {t("groups.filters.searchLabel")}
          </label>
          <input
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder={t("groups.filters.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          onClick={downloadTemplateXLSX}
          className="rounded-lg border px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
        >
          {t("groups.buttons.downloadTemplate")}
        </button>

        <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
          {t("groups.buttons.importFile")}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* ===== Formulario ===== */}
      <form
        onSubmit={onCreate}
        className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
      >
        <h3 className="font-medium text-lg">{t("groups.form.title")}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Carrera que acota las materias */}
          <div className="col-span-1">
            <CarreraPicker
              value={carreraId ?? undefined}
              onChange={(id) => {
                setCarreraId(id)
                setForm((f) => ({ ...f, id_materia: null }))
              }}
              label={false}
              className="h-10 w-full rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          {/* Materia */}
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={form.id_materia ?? ""}
            onChange={(e) =>
              setForm({ ...form, id_materia: Number(e.target.value) || null })
            }
          >
            <option value="">{t("groups.form.subjectPlaceholder")}</option>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.id_materia}>
                {m.nombre}
              </option>
            ))}
          </select>

          {/* Docente */}
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={form.id_docente ?? ""}
            onChange={(e) =>
              setForm({ ...form, id_docente: Number(e.target.value) || null })
            }
          >
            <option value="">{t("groups.form.teacherPlaceholder")}</option>
            {docentes.map((d) => (
              <option key={d.id_docente} value={d.id_docente}>
                {d.nombre} {d.ap_paterno ?? ""}
              </option>
            ))}
          </select>

          {/* Modalidad */}
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={form.id_modalidad ?? ""}
            onChange={(e) =>
              setForm({ ...form, id_modalidad: Number(e.target.value) || null })
            }
          >
            <option value="">{t("groups.form.modalityPlaceholder")}</option>
            {modalidades.map((m) => (
              <option key={m.id_modalidad} value={m.id_modalidad}>
                {m.nombre}
              </option>
            ))}
          </select>

          {/* Horario obligatorio */}
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
            required
          >
            <option value="">{t("groups.form.schedulePlaceholder")}</option>
            {HORARIOS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {/* Cupo */}
          <input
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder={t("groups.form.capacityPlaceholder")}
            type="number"
            value={form.cupo}
            onChange={(e) => setForm({ ...form, cupo: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
          disabled={saving || !carreraId || !form.id_materia}
        >
          {saving
            ? t("groups.form.submitSaving")
            : !carreraId
            ? t("groups.form.submitSelectCareer")
            : !form.id_materia
            ? t("groups.form.submitSelectSubject")
            : t("groups.form.submitDefault")}
        </button>

        {(msg || err) && <div className="text-sm mt-2">{msg || err}</div>}

        {importErrors.length > 0 && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <div className="font-medium mb-1">
              {t("groups.importErrors.title", {
                count: Math.min(5, importErrors.length),
              })}
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {importErrors.slice(0, 5).map((e, i) => (
                <li key={i}>
                  {t("groups.importErrors.rowPrefix", {
                    row: e.row,
                    error: e.error,
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* ===== Lista ===== */}
      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>{t("groups.table.subject")}</th>
                <th>{t("groups.table.career")}</th>
                <th>{t("groups.table.code")}</th>
                <th>{t("groups.table.teacher")}</th>
                <th>{t("groups.table.modality")}</th>
                <th>{t("groups.table.schedule")}</th>
                <th>{t("groups.table.capacity")}</th>
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
                    <td>{g.materia?.nombre ?? "—"}</td>
                    <td>
                      {(g as any)?.materia?.carrera?.nombre ||
                        (g as any)?.materia?.carrera_nombre ||
                        "—"}
                    </td>
                    <td>{g.grupo_codigo}</td>
                    <td>
                      {g.docente
                        ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}`
                        : t("groups.table.noTeacher")}
                    </td>
                    <td>{g.modalidad?.nombre ?? "—"}</td>
                    <td>{g.horario}</td>
                    <td>{g.cupo}</td>
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
            >
              {t("groups.pagination.prev")}
            </button>
            <div className="px-1">{pageOfText}</div>
            <button
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              type="button"
            >
              {t("groups.pagination.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}