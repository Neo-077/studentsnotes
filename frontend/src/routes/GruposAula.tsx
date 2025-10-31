import React, { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
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

export default function GruposAula() {
  const navigate = useNavigate()
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
      const t = await Catalogos.terminos()
      setTerminos(t ?? [])
      const saved = Number(localStorage.getItem('grupos.terminoId') || '')
      if (saved && (t ?? []).some((x:any)=> x.id_termino === saved)) {
        setTerminoId(saved)
      } else {
        // Por defecto: Todos
        setTerminoId(null)
      }
    }
    boot()
  }, [])

  // Cargar grupos según filtros seleccionados
  useEffect(() => {
    async function load(silent = false) {
      if (!silent) setLoading(true); setErr(null)
      try {
        const q = new URLSearchParams()
        if (terminoId) q.set("termino_id", String(terminoId))
        if (carreraId) q.set("carrera_id", String(carreraId))
        if (materiaId) q.set("materia_id", String(materiaId))
        const qs = q.toString()
        const path = qs ? `/grupos?${qs}` : '/grupos'
        const data = await api.get(path)
        setGrupos(data || [])
      } catch (e: any) {
        setErr(e.message || "Error al cargar grupos")
      } finally {
        if (!silent) setLoading(false)
      }
    }
    setPage(1)
    load()

    // refrescar silenciosamente al volver del background/enfocar/reconectar
    const handler = () => load(true)
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') handler() })
    window.addEventListener('online', handler)
    return ()=>{
      window.removeEventListener('focus', handler)
      window.removeEventListener('online', handler)
      document.removeEventListener('visibilitychange', ()=>{})
    }
  }, [terminoId, carreraId, materiaId])

  // Persistir selección de término para sincronizar con la vista de Grupos
  useEffect(() => {
    if (terminoId) localStorage.setItem('grupos.terminoId', String(terminoId))
  }, [terminoId])

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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(lista.length / pageSize)), [lista.length])
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
  const fileRef = useRef<HTMLInputElement|null>(null)
  const totalPagesAlu = useMemo(() => Math.max(1, Math.ceil((alumnos.rows?.length || 0) / pageSizeAlu)), [alumnos])
  const pageSafeAlu = Math.min(pageAlu, totalPagesAlu)
  const startAlu = (pageSafeAlu - 1) * pageSizeAlu
  const endAlu = startAlu + pageSizeAlu
  const pagedAlu = useMemo(() => (alumnos.rows || []).slice(startAlu, endAlu), [alumnos, startAlu, endAlu])

  async function openModalAlumnos(g: any) {
    setMsgAlu(null)
    setOpenAlumnos({ id_grupo: g.id_grupo, titulo: `${g.materia?.nombre ?? ''} • ${g.grupo_codigo}` })
    setPageAlu(1)
    await loadAlumnos(g.id_grupo)
  }

  async function loadAlumnos(id_grupo: number) {
    setLoadingAlu(true); setMsgAlu(null)
    try {
      const data = await api.get(`/inscripciones?grupo_id=${id_grupo}`)
      setAlumnos(data || { cupo: 0, unidades: 0, rows: [] })
    } catch (e: any) {
      setMsgAlu(e.message || 'Error')
    } finally { setLoadingAlu(false) }
  }

  async function agregarPorNoControl(no_control: string) {
    if (!openAlumnos) return
    setMsgAlu(null)
    try {
      if ((alumnos.rows?.length || 0) >= (alumnos.cupo || 0)) { setMsgAlu('Cupo lleno'); return }
      const q = encodeURIComponent(no_control.trim())
      const res = await api.get(`/estudiantes?q=${q}`)
      const lista = Array.isArray(res?.rows) ? res.rows : res
      const est = (lista || []).find((x: any) => String(x.no_control) === no_control.trim()) || (lista || [])[0]
      if (!est) { setMsgAlu('Estudiante no encontrado'); return }
      await api.post('/inscripciones', { id_estudiante: est.id_estudiante, id_grupo: openAlumnos.id_grupo })
      await loadAlumnos(openAlumnos.id_grupo)
    } catch (e: any) { setMsgAlu(e.message || 'Error') }
  }

  async function actualizarUnidad(id_inscripcion: number, unidad: number, campo: 'calificacion' | 'asistencia', valor: string) {
    if (!openAlumnos) return
    const num = Number(valor)
    if (!isFinite(num)) return
    try {
      const payload = { unidades: [{ unidad, [campo]: num }] }
      await api.put(`/inscripciones/${id_inscripcion}/unidades`, payload)
    } catch {}
  }

  async function bajaInscripcion(id_inscripcion: number) {
    if (!openAlumnos) return
    try {
      await api.delete(`/inscripciones/${id_inscripcion}`)
      await loadAlumnos(openAlumnos.id_grupo)
    } catch (e: any) { setMsgAlu(e.message || 'Error') }
  }

  async function onImportFile(file: File) {
    if (!openAlumnos || !file) return
    try {
      setImporting(true); setMsgAlu(null)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' })
      const list: string[] = []
      for (const r of rows) {
        const vals = Object.values(r)
        let nc = ''
        if (r.no_control != null) nc = String(r.no_control)
        else if (r["No. control"] != null) nc = String(r["No. control"]) 
        else if (r["NO CONTROL"] != null) nc = String(r["NO CONTROL"]) 
        else if (vals.length) nc = String(vals[0])
        nc = nc.trim()
        if (nc) list.push(nc)
      }
      if (list.length === 0) { setMsgAlu('Archivo sin números de control'); return }
      await api.post('/inscripciones/bulk', { id_grupo: openAlumnos.id_grupo, no_control: list })
      await loadAlumnos(openAlumnos.id_grupo)
    } catch (e: any) {
      setMsgAlu(e.message || 'Error al importar')
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([["no_control"], [""]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
    XLSX.writeFile(wb, 'plantilla_inscripciones.xlsx')
  }

  return (
    <div className="space-y-6">
      {/* Filtros superiores */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Término</label>
          <select
            className="h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={terminoId ?? ""}
            onChange={(e) => {
              const v = e.target.value
              if (!v) { setTerminoId(null); localStorage.removeItem('grupos.terminoId') }
              else { const n = Number(v); setTerminoId(n); localStorage.setItem('grupos.terminoId', String(n)) }
            }}
          >
            <option value="">Todos</option>
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
        <>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {paged.map(g => (
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
                  <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50" onClick={()=> {
                    const titulo = `${g.materia?.nombre ?? ''} • ${g.grupo_codigo}`
                    navigate(`/grupos/aula/${g.id_grupo}`, { state: { id_grupo: g.id_grupo, titulo } })
                  }}>Detalles</button>
                </div>
              </div>
            ))}
          </div>
          {/* paginación */}
          <div className="flex items-center justify-between pt-3 text-sm">
            <div className="text-slate-600">Mostrando {lista.length === 0 ? 0 : (start + 1)}–{Math.min(end, lista.length)} de {lista.length}</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-1 disabled:opacity-50"
                onClick={()=> setPage(p => Math.max(1, p-1))}
                disabled={pageSafe <= 1}
                type="button"
              >Anterior</button>
              <div className="px-1">Página {pageSafe} / {totalPages}</div>
              <button
                className="rounded-md border px-3 py-1 disabled:opacity-50"
                onClick={()=> setPage(p => Math.min(totalPages, p+1))}
                disabled={pageSafe >= totalPages}
                type="button"
              >Siguiente</button>
            </div>
          </div>
        </>
      )}

      {openAlumnos && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={()=> setOpenAlumnos(null)}>
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-lg">Alumnos — {openAlumnos.titulo}</div>
              <button className="rounded-md border px-3 py-1 text-sm" onClick={()=> setOpenAlumnos(null)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Cupo: {(alumnos.rows||[]).length} / {alumnos.cupo} • Unidades: {alumnos.unidades} {( (alumnos.rows||[]).length >= (alumnos.cupo||0) ) && <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">Cupo lleno</span>}</div>
                <div className="flex gap-2 items-center">
                  <input id="alu_noctrl" placeholder="No. control" className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows||[]).length >= (alumnos.cupo||0)} />
                  <button className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows||[]).length >= (alumnos.cupo||0)} onClick={()=>{
                    const el = document.getElementById('alu_noctrl') as HTMLInputElement
                    if (el?.value) agregarPorNoControl(el.value)
                  }}>Agregar</button>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{ const f = e.currentTarget.files?.[0]; if (f) onImportFile(f) }} />
                  <button className="h-9 rounded-md border px-3 text-sm disabled:opacity-50" disabled={importing} onClick={()=> fileRef.current?.click()}>{importing ? 'Importando…' : 'Importar'}</button>
                  <button className="h-9 rounded-md border px-3 text-sm" onClick={downloadTemplate}>Plantilla</button>
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
        </div>
      )}
    </div>
  )
}
