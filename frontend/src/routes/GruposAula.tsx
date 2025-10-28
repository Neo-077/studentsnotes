import { useEffect, useMemo, useState } from "react"
import { Catalogos } from "../lib/catalogos"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import api from "../lib/api"

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
  const [terminos, setTerminos] = useState<any[]>([])
  const [terminoId, setTerminoId] = useState<number | null>(null)
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materiaId, setMateriaId] = useState<number | null>(null)
  const [query, setQuery] = useState("")

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Cargar términos y setear el primero por defecto
  useEffect(() => {
    async function boot() {
      const t = await Catalogos.terminos()
      setTerminos(t ?? [])
      if (t?.length) setTerminoId(t[0].id_termino)
    }
    boot()
  }, [])

  // Cargar grupos según filtros seleccionados
  useEffect(() => {
    async function load() {
      if (!terminoId) return
      setLoading(true); setErr(null)
      try {
        const q = new URLSearchParams()
        q.set("termino_id", String(terminoId))
        if (carreraId) q.set("carrera_id", String(carreraId))
        if (materiaId) q.set("materia_id", String(materiaId))
        // usa el mismo endpoint que Grupos.tsx para asegurar consistencia con backend/DB
        const data = await api.get(`/grupos?${q.toString()}`)
        setGrupos(data || [])
      } catch (e: any) {
        setErr(e.message || "Error al cargar grupos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [terminoId, carreraId, materiaId])

  // Filtro de texto en cliente
  const lista = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return grupos
    return grupos.filter(g => {
      const mat = g.materia?.nombre?.toLowerCase() || ""
      const cod = g.grupo_codigo?.toLowerCase() || ""
      const doc = `${g.docente?.nombre || ""} ${g.docente?.ap_paterno || ""}`.toLowerCase()
      const hor = g.horario?.toLowerCase() || ""
      return mat.includes(q) || cod.includes(q) || doc.includes(q) || hor.includes(q)
    })
  }, [grupos, query])

  return (
    <div className="space-y-6">
      {/* Filtros superiores */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Término</label>
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
          <CarreraPicker
            value={carreraId ?? undefined}
            onChange={(id) => { setCarreraId(id as number | null); setMateriaId(null) }}
          />
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

        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Buscar</label>
          <input
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="Nombre, código, docente, horario"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Grupos</h3>
        <div className="text-sm text-slate-500">{loading ? "Cargando…" : `${lista.length} resultado(s)`}</div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {lista.length === 0 && !loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Sin resultados.</div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {lista.map(g => (
            <div key={g.id_grupo} className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 truncate">{g.materia?.nombre ?? "—"}</div>
                  {/* Carrera si está disponible */}
                  {(() => {
                    const carrera = (g as any)?.materia?.carrera?.nombre || (g as any)?.materia?.carrera_nombre
                    return carrera ? (
                      <div className="text-[11px] text-slate-400 truncate">{carrera}</div>
                    ) : null
                  })()}
                  <div className="text-lg font-semibold leading-tight truncate">{g.grupo_codigo}</div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 whitespace-nowrap">
                  {g.modalidad?.nombre ?? "—"}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-sm">
                <div className="truncate">{g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "N/D"}</div>
                <div className="text-slate-600">{g.horario}</div>
                <div className="text-slate-500 text-xs">Cupo: {g.cupo}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50">Detalles</button>
                <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50">Alumnos</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
