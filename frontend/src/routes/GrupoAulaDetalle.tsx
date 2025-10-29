import React, { Fragment, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import api from "../lib/api"

export default function GrupoAulaDetalle() {
  const navigate = useNavigate()
  const { id_grupo: idParam } = useParams()
  const id_grupo = Number(idParam)
  const location = useLocation() as any
  const tituloState = location?.state?.titulo as string | undefined

  const [titulo, setTitulo] = useState<string>(tituloState || "")
  const [alumnos, setAlumnos] = useState<any>({ cupo: 0, unidades: 0, rows: [] as any[] })
  const [loadingAlu, setLoadingAlu] = useState(false)
  const [msgAlu, setMsgAlu] = useState<string | null>(null)
  const [pageAlu, setPageAlu] = useState(1)
  const pageSizeAlu = 15

  const totalPagesAlu = useMemo(() => Math.max(1, Math.ceil((alumnos.rows?.length || 0) / pageSizeAlu)), [alumnos])
  const pageSafeAlu = Math.min(pageAlu, totalPagesAlu)
  const startAlu = (pageSafeAlu - 1) * pageSizeAlu
  const endAlu = startAlu + pageSizeAlu
  const pagedAlu = useMemo(() => (alumnos.rows || []).slice(startAlu, endAlu), [alumnos, startAlu, endAlu])

  useEffect(() => {
    if (!Number.isFinite(id_grupo)) {
      navigate("/grupos/aula", { replace: true })
      return
    }
    loadAlumnos(id_grupo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_grupo])

  async function loadAlumnos(id: number) {
    setLoadingAlu(true); setMsgAlu(null)
    try {
      const data = await api.get(`/inscripciones?grupo_id=${id}`)
      setAlumnos(data || { cupo: 0, unidades: 0, rows: [] })
      if (!titulo) {
        // si viene la materia y código dentro de alguna fila, intenta formarlo
        const first = (data?.rows || [])[0]
        const t = location?.state?.titulo
        setTitulo(typeof t === 'string' && t ? t : (first?.grupo_titulo || ""))
      }
    } catch (e: any) {
      setMsgAlu(e.message || 'Error')
    } finally { setLoadingAlu(false) }
  }

  async function agregarPorNoControl(no_control: string) {
    setMsgAlu(null)
    try {
      if ((alumnos.rows?.length || 0) >= (alumnos.cupo || 0)) { setMsgAlu('Cupo lleno'); return }
      const q = encodeURIComponent(no_control.trim())
      const res = await api.get(`/estudiantes?q=${q}`)
      const lista = Array.isArray(res?.rows) ? res.rows : res
      const est = (lista || []).find((x: any) => String(x.no_control) === no_control.trim()) || (lista || [])[0]
      if (!est) { setMsgAlu('Estudiante no encontrado'); return }
      await api.post('/inscripciones', { id_estudiante: est.id_estudiante, id_grupo })
      await loadAlumnos(id_grupo)
    } catch (e: any) { setMsgAlu(e.message || 'Error') }
  }

  async function actualizarUnidad(id_inscripcion: number, unidad: number, campo: 'calificacion' | 'asistencia', valor: string) {
    const num = Number(valor)
    if (!isFinite(num)) return
    try {
      const payload = { unidades: [{ unidad, [campo]: num }] }
      await api.put(`/inscripciones/${id_inscripcion}/unidades`, payload)
    } catch {}
  }

  async function bajaInscripcion(id_inscripcion: number) {
    try {
      await api.delete(`/inscripciones/${id_inscripcion}`)
      await loadAlumnos(id_grupo)
    } catch (e: any) { setMsgAlu(e.message || 'Error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Alumnos — {titulo || `Grupo ${id_grupo}`}</div>
        <Link to="/grupos/aula" className="rounded-md border px-3 py-1 text-sm">Volver</Link>
      </div>

      <div className="rounded-2xl bg-white border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Cupo: {(alumnos.rows||[]).length} / {alumnos.cupo} • Unidades: {alumnos.unidades} {((alumnos.rows||[]).length >= (alumnos.cupo||0)) && <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">Cupo lleno</span>}</div>
          <div className="flex gap-2 items-center">
            <input id="alu_noctrl" placeholder="No. control" className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows||[]).length >= (alumnos.cupo||0)} />
            <button className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows||[]).length >= (alumnos.cupo||0)} onClick={()=>{
              const el = document.getElementById('alu_noctrl') as HTMLInputElement
              if (el?.value) agregarPorNoControl(el.value)
            }}>Agregar</button>
          </div>
        </div>

        {msgAlu && <div className="text-sm text-red-600">{msgAlu}</div>}

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>No. control</th>
                <th>Nombre</th>
                {Array.from({ length: alumnos.unidades || 0 }, (_,i)=> i+1).map(u => (
                  <Fragment key={`u_head_${u}`}>
                    <th className="text-center">U{u} Cal</th>
                    <th className="text-center">U{u} Asist%</th>
                  </Fragment>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingAlu && (
                <tr>
                  <td colSpan={2 + (alumnos.unidades||0)*2 + 1} className="px-3 py-6 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
              {!loadingAlu && pagedAlu.length === 0 && (
                <tr>
                  <td colSpan={2 + (alumnos.unidades||0)*2 + 1} className="px-3 py-6 text-center text-slate-500">Sin alumnos.</td>
                </tr>
              )}
              {!loadingAlu && pagedAlu.length > 0 && pagedAlu.map((r:any)=> (
                <tr key={r.id_inscripcion} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="whitespace-nowrap">{r.estudiante?.no_control}</td>
                  <td className="whitespace-nowrap">{`${r.estudiante?.nombre ?? ''} ${r.estudiante?.ap_paterno ?? ''}`}</td>
                  {Array.from({ length: alumnos.unidades || 0 }, (_,i)=> i+1).map(u => {
                    const cal = r.unidades?.find((x:any)=> x.unidad===u)?.calificacion ?? ''
                    const asi = r.unidades?.find((x:any)=> x.unidad===u)?.asistencia ?? ''
                    return (
                      <Fragment key={`u_row_${r.id_inscripcion}-${u}`}>
                        <td className="text-center">
                          <input type="number" min={0} max={100} defaultValue={cal as any}
                            className="h-9 w-20 rounded-md border px-2 text-sm text-center"
                            onBlur={(e)=> actualizarUnidad(r.id_inscripcion, u, 'calificacion', e.currentTarget.value)} />
                        </td>
                        <td className="text-center">
                          <input type="number" min={0} max={100} defaultValue={asi as any}
                            className="h-9 w-20 rounded-md border px-2 text-sm text-center"
                            onBlur={(e)=> actualizarUnidad(r.id_inscripcion, u, 'asistencia', e.currentTarget.value)} />
                        </td>
                      </Fragment>
                    )
                  })}
                  <td className="text-right">
                    <button className="rounded-md border px-3 py-1 text-xs text-red-600 hover:bg-red-50" onClick={()=> bajaInscripcion(r.id_inscripcion)}>Baja</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">Mostrando {alumnos.rows.length === 0 ? 0 : (startAlu + 1)}–{Math.min(endAlu, alumnos.rows.length)} de {alumnos.rows.length}</div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={pageSafeAlu<=1} onClick={()=> setPageAlu(p=>Math.max(1,p-1))}>Anterior</button>
            <div className="px-1">Página {pageSafeAlu} / {totalPagesAlu}</div>
            <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={pageSafeAlu>=totalPagesAlu} onClick={()=> setPageAlu(p=>Math.min(totalPagesAlu,p+1))}>Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  )
}
