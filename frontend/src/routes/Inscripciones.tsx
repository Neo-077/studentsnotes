import { useEffect, useMemo, useState } from "react"
import CarreraPicker from "../components/inscripciones/CarreraPicker"
import AddStudentForm from "../components/inscripciones/AddStudentForm"
import EnrollPanel from "../components/inscripciones/EnrollPanel"
import MateriaPicker from "../components/inscripciones/MateriaPicker"
import SemestrePicker from "../components/inscripciones/SemestrePicker"
import { Catalogos } from "../lib/catalogos"
import api from "../lib/api"

type Grupo = {
  id_grupo: number
  grupo_codigo: string
  horario: string | null
  cupo: number
  materia?: { id_materia?: number; nombre: string }
  docente?: { nombre: string; ap_paterno: string | null; ap_materno: string | null }
  termino?: { anio: number; periodo: string }
  modalidad?: { nombre: string }
}

export default function Inscripciones() {
  const [terminos, setTerminos] = useState<any[]>([])
  const [terminoId, setTerminoId] = useState<number | null>(null)
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materiaId, setMateriaId] = useState<number | null>(null)
  const [semestre, setSemestre] = useState<number | null>(null)

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  // Cargar términos y seleccionar el más reciente
  useEffect(() => {
    Catalogos.terminos().then((t) => {
      setTerminos(t)
      if (t?.length) setTerminoId(t[0].id_termino)
    })
  }, [])

  // Cargar grupos por término y materia (server-side)
  useEffect(() => {
    async function load() {
      const q = new URLSearchParams()
      if (terminoId) q.set("termino_id", String(terminoId))
      if (materiaId) q.set("materia_id", String(materiaId))
      const data = await api.get(`/grupos?${q.toString()}`)
      setGrupos(data || [])
    }
    load().catch(() => setGrupos([]))
  }, [terminoId, materiaId])

  // Filtrado por semestre (client-side usando grupo_codigo "S{n}-...")
  const gruposFiltrados = useMemo(() => {
    if (!semestre) return grupos
    const tag = `S${semestre}-`
    return grupos.filter(g => (g.grupo_codigo || '').startsWith(tag))
  }, [grupos, semestre])

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6">
      <section className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Término</label>
            <select
              className="border rounded-xl px-3 py-2"
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

          <CarreraPicker value={carreraId ?? undefined} onChange={(id) => setCarreraId(id)} />
          <SemestrePicker value={semestre} onChange={setSemestre} />
          <MateriaPicker value={materiaId} onChange={setMateriaId} />
        </div>

        {/* Cards tipo classroom */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gruposFiltrados.map((g) => (
            <button
              key={g.id_grupo}
              onClick={() => setSelectedGroupId(g.id_grupo)}
              className={`text-left border rounded-2xl p-4 shadow-soft hover:border-blue-600 transition ${
                selectedGroupId === g.id_grupo ? "border-blue-600" : ""
              }`}
            >
              <h4 className="font-medium">
                {g.materia?.nombre ?? "Materia"} — {g.grupo_codigo}
              </h4>
              <p className="text-sm text-gray-600">
                {g.horario || "Horario N/D"} • Cupo: {g.cupo}
              </p>
              <p className="text-xs text-gray-500">
                {g.docente ? `${g.docente.nombre} ${g.docente.ap_paterno ?? ""}` : "Docente N/D"} · {g.modalidad?.nombre ?? "Modalidad N/D"}
              </p>
            </button>
          ))}
          {gruposFiltrados.length === 0 && (
            <div className="text-sm text-gray-500">No hay grupos para el filtro seleccionado.</div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <AddStudentForm defaultCarreraId={carreraId ?? undefined} />
        <EnrollPanel groupId={selectedGroupId} onChangeGroupId={(id) => setSelectedGroupId(id)} />
      </aside>
    </div>
  )
}
