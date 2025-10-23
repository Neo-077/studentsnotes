import { useEffect, useMemo, useState } from "react"
import { Catalogos } from "../lib/catalogos"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import QuickEnroll from "../components/inscripciones/QuickEnroll"
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
  const [materiaId, setMateriaId] = useState<number | null>(null)

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

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
      setLoading(true)
      try {
        const q = new URLSearchParams()
        q.set("termino_id", String(terminoId))
        if (materiaId) q.set("materia_id", String(materiaId))
        const data = await api.get(`/grupos?${q.toString()}`)
        if (!cancel) {
          setGrupos(data || [])
          if ((data?.length ?? 0) > 0 && !data.find((g: Grupo) => g.id_grupo === selectedGroupId)) {
            setSelectedGroupId(data[0].id_grupo)
          }
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminoId, materiaId])

  const gruposList = useMemo(() => grupos, [grupos])

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      {/* IZQUIERDA: filtros + grupos */}
      <section className="space-y-4">
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
              <label className="text-xs text-slate-500">Materia</label>
              <MateriaPicker value={materiaId} onChange={setMateriaId} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && <div className="col-span-full text-sm text-slate-500">Cargando grupos…</div>}
          {!loading && gruposList.map(g => {
            const active = selectedGroupId === g.id_grupo
            return (
              <button
                key={g.id_grupo}
                onClick={() => setSelectedGroupId(g.id_grupo)}
                className={[
                  "text-left rounded-2xl border p-4 shadow-sm transition",
                  "hover:shadow-md hover:border-blue-500",
                  active ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
                ].join(" ")}
              >
                <h4 className="font-medium">
                  {g.materia?.nombre ?? "Materia"}
                  <span className="text-slate-400"> — {g.grupo_codigo}</span>
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {g.horario || "Horario N/D"} <span className="mx-1">•</span> Cupo: {g.cupo}
                </p>
                <p className="text-xs text-slate-500">
                  {g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "Docente N/D"}
                  <span className="mx-1">·</span>
                  {g.modalidad?.nombre ?? "Modalidad N/D"}
                </p>
              </button>
            )
          })}
          {!loading && gruposList.length === 0 && (
            <div className="col-span-full text-sm text-slate-500">No hay grupos para los filtros seleccionados.</div>
          )}
        </div>
      </section>

      {/* DERECHA: Inscripción rápida por número de control */}
      <aside className="space-y-4">
        <QuickEnroll groupId={selectedGroupId} />
        <div className="rounded-2xl border bg-white p-3 shadow-sm text-xs text-slate-500">
          Tip: escribe el <b>número de control</b> y presiona Enter. Si existe, verás el nombre y podrás inscribirlo.
        </div>
      </aside>
    </div>
  )
}
