import { useEffect, useMemo, useState } from "react"
import { Catalogos } from "../lib/catalogos"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import api from "../lib/api"

type Grupo = {
  id_grupo: number
  grupo_codigo: string
  horario: string | null
  cupo: number
  materia?: { id_materia?: number; nombre: string }
  docente?: { nombre: string; ap_paterno: string | null; ap_materno: string | null }
  modalidad?: { nombre: string }
}

export default function Grupos() {
  const [terminos, setTerminos] = useState<any[]>([])
  const [terminoId, setTerminoId] = useState<number | null>(null)

  const [carreraId, setCarreraId] = useState<number | null>(null)   // ⬅️ nuevo
  const [materiaId, setMateriaId] = useState<number | null>(null)

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Catalogos.terminos().then((t) => {
      setTerminos(t ?? [])
      if (t?.length) setTerminoId(t[0].id_termino)
    })
  }, [])

  useEffect(() => {
    let cancel = false
    async function load() {
      if (!terminoId) return
      setLoading(true); setErr(null)
      try {
        const q = new URLSearchParams()
        q.set("termino_id", String(terminoId))
        if (carreraId) q.set("carrera_id", String(carreraId))  // ⬅️ enviar carrera
        if (materiaId) q.set("materia_id", String(materiaId))
        const data = await api.get(`/grupos?${q.toString()}`)
        if (!cancel) setGrupos(data || [])
      } catch (e: any) {
        if (!cancel) { setErr(e?.message || "Error al cargar grupos"); setGrupos([]) }
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [terminoId, carreraId, materiaId])

  const lista = useMemo(() => grupos, [grupos])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
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
            {/* Este picker ya solo mostrará materias del término seleccionado,
               pero el filtrado fuerte lo hace el backend con materia_carrera */}
            <MateriaPicker value={materiaId} onChange={setMateriaId} />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && <div className="col-span-full text-sm text-slate-500">Cargando grupos…</div>}
        {err && !loading && <div className="col-span-full text-sm text-red-600">{err}</div>}
        {!loading && !err && lista.map((g) => (
          <div key={g.id_grupo} className="text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <h4 className="font-medium">
              {g.materia?.nombre ?? "Materia"} <span className="text-slate-400">— {g.grupo_codigo}</span>
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              {g.horario || "Horario N/D"} <span className="mx-1">•</span> Cupo: {g.cupo}
            </p>
            <p className="text-xs text-slate-500">
              {g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "Docente N/D"} <span className="mx-1">·</span>
              {g.modalidad?.nombre ?? "Modalidad N/D"}
            </p>
          </div>
        ))}
        {!loading && !err && lista.length === 0 && (
          <div className="col-span-full text-sm text-slate-500">No hay grupos para los filtros.</div>
        )}
      </div>
    </div>
  )
}
