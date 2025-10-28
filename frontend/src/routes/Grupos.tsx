// src/routes/Grupos.tsx
import { useEffect, useMemo, useState } from "react"
import { Catalogos } from "../lib/catalogos"
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

const HORARIOS = [
  "LUN-VIE 7:00-8:00",
  "LUN-VIE 8:00-9:00",
  "LUN-VIE 9:00-10:00",
  "LUN-VIE 10:00-11:00",
  "LUN-VIE 11:00-12:00",
  "LUN-VIE 12:00-13:00",
  "LUN-VIE 13:00-14:00",
  "MAR-JUE 8:00-10:00",
  "MAR-JUE 10:00-12:00",
  "LUN-MIE 09:00-10:30",
  "MIE-VIE 12:00-13:30",
]

export default function Grupos() {
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
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // ===== formulario =====
  const [form, setForm] = useState({
    id_materia: null as number | null,
    id_docente: null as number | null,
    id_termino: null as number | null,
    id_modalidad: null as number | null,
    grupo_codigo: "", // autogenerado
    horario: "",
    cupo: "",
  })
  const [saving, setSaving] = useState(false)

  // boot
  useEffect(() => {
    async function boot() {
      const [t, d, m] = await Promise.all([
        Catalogos.terminos(),
        Catalogos.docentes(),
        Catalogos.modalidades()
      ])
      setTerminos(t ?? [])
      setDocentes(d ?? [])
      setModalidades(m ?? [])
      if (t?.length) {
        setTerminoId(t[0].id_termino)
        setForm(f => ({ ...f, id_termino: t[0].id_termino }))
      }
    }
    boot()
  }, [])

  // materias por carrera (para el selector del filtro y del form)
  useEffect(() => {
    async function loadMaterias() {
      // ⬇️ si no hay carrera, trae TODAS (antes retornabas array vacío)
      const mats = await Catalogos.materias(carreraId ? { carrera_id: carreraId } : undefined)
      setMaterias(mats ?? [])
    }
    loadMaterias()
  }, [carreraId])

  // actualizar el id_materia del formulario cuando el usuario elige una materia en el filtro (opcional)
  useEffect(() => {
    if (materiaId) setForm(f => ({ ...f, id_materia: materiaId }))
  }, [materiaId])

  // cargar grupos
  async function load() {
    if (!terminoId) return
    setLoading(true); setErr(null)
    try {
      const q = new URLSearchParams()
      q.set("termino_id", String(terminoId))
      if (carreraId) q.set("carrera_id", String(carreraId))
      if (materiaId) q.set("materia_id", String(materiaId))
      const data = await api.get(`/grupos?${q.toString()}`)
      setGrupos(data || [])
    } catch (e: any) {
      setErr(e.message || "Error al cargar grupos")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [terminoId, carreraId, materiaId])

  const lista = useMemo(() => grupos, [grupos])

  // ===== código autogenerado (cuando cambia la materia) =====
  useEffect(() => {
    if (!form.id_materia) {
      setForm(f => ({ ...f, grupo_codigo: "" }))
      return
    }
    const mat = materias.find((m: any) => m.id_materia === form.id_materia)
    const nombre = (mat?.nombre || "MATERIA").toUpperCase()
    const siglas = nombre
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 3) || "MAT"
    const num = Math.floor(1000 + Math.random() * 9000) // 4 dígitos
    const suf = String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
    const codigo = `${siglas}-${num} - SC${suf}`
    setForm(f => ({ ...f, grupo_codigo: codigo }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id_materia])

  // ===== crear grupo =====
  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (!form.id_materia) return setMsg("Selecciona una materia")
    if (!form.id_docente) return setMsg("Selecciona un docente")
    if (!form.id_modalidad) return setMsg("Selecciona una modalidad")
    if (!form.horario.trim()) return setMsg("El horario es obligatorio")

    const payload = {
      id_materia: form.id_materia,
      id_docente: form.id_docente,
      id_termino: form.id_termino,
      id_modalidad: form.id_modalidad,
      grupo_codigo: form.grupo_codigo || "AUTO",
      horario: form.horario.trim(),
      cupo: form.cupo ? Number(form.cupo) : 30, // default 30
    }

    try {
      // Validación de choque: mismo docente + mismo término + mismo horario
      const q = new URLSearchParams()
      q.set("docente_id", String(payload.id_docente))
      q.set("termino_id", String(payload.id_termino))
      q.set("horario", payload.horario)
      const conflictos = await api.get(`/grupos?${q.toString()}`)
      if (Array.isArray(conflictos) && conflictos.length > 0) {
        return setMsg("❌ El docente ya tiene un grupo en ese horario.")
      }

      setSaving(true)
      await api.post("/grupos", payload)
      setMsg("✅ Grupo creado correctamente")
      setForm(f => ({ ...f, horario: "", cupo: "" })) // limpia, mantiene ids
      await load()
    } catch (e: any) {
      setMsg("❌ " + (e.message || "Error al crear grupo"))
    } finally {
      setSaving(false)
    }
  }

  // ===== importar por Excel/CSV =====
  async function onUpload(file: File) {
    setMsg(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error("Archivo vacío")
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const fd = new FormData()
      fd.append("file", blob, file.name)
      const res = await api.post("/grupos/bulk", fd as any)
      setMsg(`✅ Importados: ${res.summary.inserted} / Errores: ${res.summary.errors}`)
      await load()
    } catch (e: any) {
      setMsg("❌ " + (e.message || "Error importando"))
    }
  }

  // plantilla CSV
  function downloadTemplate() {
    const headers = ["materia", "docente", "termino", "modalidad", "horario", "cupo"]
    const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "plantilla_grupos.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      {/* ===== Filtros ===== */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Término</label>
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={terminoId ?? ""}
            onChange={(e) => setTerminoId(Number(e.target.value))}
          >
            {terminos.map((t) => (
              <option key={t.id_termino} value={t.id_termino}>
                {t.anio} {t.periodo}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Carrera</label>
          <CarreraPicker value={carreraId ?? undefined} onChange={setCarreraId} />
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Materia</label>
          <MateriaPicker
            value={materiaId}
            onChange={setMateriaId}
            terminoId={terminoId ?? undefined}
            carreraId={carreraId ?? undefined}
          />
        </div>

        <button onClick={downloadTemplate} className="rounded-lg border px-3 py-2 text-sm">
          Descargar plantilla (CSV)
        </button>

        <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
          Importar (.xlsx/.csv)
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* ===== Formulario ===== */}
      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-medium text-lg">Nuevo Grupo</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Materia */}
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={form.id_materia ?? ""}
            onChange={(e) => setForm({ ...form, id_materia: Number(e.target.value) })}
          >
            <option value="">Materia…</option>
            {materias.map((m) => (
              <option key={m.id_materia} value={m.id_materia}>
                {m.nombre}
              </option>
            ))}
          </select>

          {/* Docente (lista fija) */}
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={form.id_docente ?? ""}
            onChange={(e) => setForm({ ...form, id_docente: Number(e.target.value) })}
          >
            <option value="">Docente…</option>
            {docentes.map((d) => (
              <option key={d.id_docente} value={d.id_docente}>
                {d.nombre} {d.ap_paterno ?? ""}
              </option>
            ))}
          </select>

          {/* Modalidad */}
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={form.id_modalidad ?? ""}
            onChange={(e) => setForm({ ...form, id_modalidad: Number(e.target.value) })}
          >
            <option value="">Modalidad…</option>
            {modalidades.map((m) => (
              <option key={m.id_modalidad} value={m.id_modalidad}>
                {m.nombre}
              </option>
            ))}
          </select>

          {/* Código autogenerado (solo lectura) */}
          <input
            className="h-10 rounded-xl border px-3 text-sm bg-slate-50"
            value={form.grupo_codigo}
            readOnly
            placeholder="Código (auto)"
            title="Se genera automáticamente al elegir la materia"
          />

          {/* Horario obligatorio */}
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
            required
          >
            <option value="">Horario… (obligatorio)</option>
            {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>

          {/* Cupo (default 30) */}
          <input
            className="h-10 rounded-xl border px-3 text-sm"
            placeholder="Cupo (default 30)"
            type="number"
            value={form.cupo}
            onChange={(e) => setForm({ ...form, cupo: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm"
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar grupo"}
        </button>

        {(msg || err) && <div className="text-sm mt-2">{msg || err}</div>}
      </form>

      {/* ===== Lista ===== */}
      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>Materia</th>
                <th>Código</th>
                <th>Docente</th>
                <th>Modalidad</th>
                <th>Horario</th>
                <th>Cupo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Sin resultados.</td></tr>
              ) : (
                lista.map((g) => (
                  <tr key={g.id_grupo} className="[&>td]:px-3 [&>td]:py-2">
                    <td>{g.materia?.nombre ?? "—"}</td>
                    <td>{g.grupo_codigo}</td>
                    <td>{g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "N/D"}</td>
                    <td>{g.modalidad?.nombre ?? "—"}</td>
                    <td>{g.horario}</td>
                    <td>{g.cupo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
