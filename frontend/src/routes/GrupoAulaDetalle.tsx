import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import api from "../lib/api"
import * as XLSX from "xlsx"
import PieChartPage from "../pages/PieChart"
import ScatterChartPage from "../pages/ScatterChart"
import ControlChart from "../pages/ControlChart"

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
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [grupo, setGrupo] = useState<any>({})
  const [promedio, setPromedio] = useState<any>({})

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
      // Normalizar estructura esperada para evitar accesos a undefined
      const normalized = (() => {
        const cupo = Number((data as any)?.cupo) || 0
        const unidades = Number((data as any)?.unidades ?? (data as any)?.grupo?.unidades ?? (data as any)?.materia?.unidades) || 0
        const rows = Array.isArray((data as any)?.rows)
          ? (data as any).rows
          : Array.isArray(data)
            ? (data as any)
            : []
        return { cupo, unidades, rows }
      })()
      setAlumnos(normalized)
      setGrupo((data as any)?.grupo || { aprobados: 0, reprobados: 0, total: 0 })
      setPromedio((data as any)?.promedio || [])
      if (!titulo) {
        // si viene la materia y código dentro de alguna fila, intenta formarlo
        const first = (((data as any)?.rows) || [])[0]
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
    } catch { }
  }

  async function bajaInscripcion(id_inscripcion: number) {
    try {
      await api.delete(`/inscripciones/${id_inscripcion}`)
      await loadAlumnos(id_grupo)
    } catch (e: any) { setMsgAlu(e.message || 'Error') }
  }

  async function handleImportFile(file: File) {
    if (!file) return
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
        if ((r as any).no_control != null) nc = String((r as any).no_control)
        else if ((r as any)["No. control"] != null) nc = String((r as any)["No. control"])
        else if ((r as any)["NO CONTROL"] != null) nc = String((r as any)["NO CONTROL"])
        else if (vals.length) nc = String(vals[0])
        nc = nc.trim()
        if (nc) list.push(nc)
      }
      if (list.length === 0) { setMsgAlu('Archivo sin números de control'); return }
      await api.post('/inscripciones/bulk', { id_grupo, no_control: list })
      await loadAlumnos(id_grupo)
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Alumnos — {titulo || `Grupo ${id_grupo}`}</div>
        <Link to="/grupos/aula" className="rounded-md border px-3 py-1 text-sm">Volver</Link>
      </div>

      <div className="rounded-2xl bg-white border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Cupo: {(alumnos.rows || []).length} / {alumnos.cupo} • Unidades: {alumnos.unidades} {((alumnos.rows || []).length >= (alumnos.cupo || 0)) && <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 ring-1 ring-red-100">Cupo lleno</span>}</div>
          <div className="flex gap-2 items-center">
            <input id="alu_noctrl" placeholder="No. control" className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows || []).length >= (alumnos.cupo || 0)} />
            <button className="h-9 rounded-md border px-3 text-sm" disabled={(alumnos.rows || []).length >= (alumnos.cupo || 0)} onClick={() => {
              const el = document.getElementById('alu_noctrl') as HTMLInputElement
              if (el?.value) agregarPorNoControl(el.value)
            }}>Agregar</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) handleImportFile(f) }} />
            <button className="h-9 rounded-md border px-3 text-sm disabled:opacity-50" disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? 'Importando…' : 'Importar'}</button>
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
                {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map(u => (
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
                  <td colSpan={2 + (alumnos.unidades || 0) * 2 + 1} className="px-3 py-6 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
              {!loadingAlu && pagedAlu.length === 0 && (
                <tr>
                  <td colSpan={2 + (alumnos.unidades || 0) * 2 + 1} className="px-3 py-6 text-center text-slate-500">Sin alumnos.</td>
                </tr>
              )}
              {!loadingAlu && pagedAlu.length > 0 && pagedAlu.map((r: any) => (
                <tr key={r.id_inscripcion} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="whitespace-nowrap">{r.estudiante?.no_control}</td>
                  <td className="whitespace-nowrap">{`${r.estudiante?.nombre ?? ''} ${r.estudiante?.ap_paterno ?? ''}`}</td>
                  {Array.from({ length: alumnos.unidades || 0 }, (_, i) => i + 1).map(u => {
                    const cal = r.unidades?.find((x: any) => x.unidad === u)?.calificacion ?? ''
                    const asi = r.unidades?.find((x: any) => x.unidad === u)?.asistencia ?? ''
                    return (
                      <Fragment key={`u_row_${r.id_inscripcion}-${u}`}>
                        <td className="text-center">
                          <input type="number" min={0} max={100} defaultValue={cal as any}
                            className="h-9 w-20 rounded-md border px-2 text-sm text-center"
                            onBlur={(e) => actualizarUnidad(r.id_inscripcion, u, 'calificacion', e.currentTarget.value)} />
                        </td>
                        <td className="text-center">
                          <input type="number" min={0} max={100} defaultValue={asi as any}
                            className="h-9 w-20 rounded-md border px-2 text-sm text-center"
                            onBlur={(e) => actualizarUnidad(r.id_inscripcion, u, 'asistencia', e.currentTarget.value)} />
                        </td>
                      </Fragment>
                    )
                  })}
                  <td className="text-right">
                    <button className="rounded-md border px-3 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => bajaInscripcion(r.id_inscripcion)}>Baja</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">Mostrando {(alumnos?.rows?.length || 0) === 0 ? 0 : (startAlu + 1)}–{Math.min(endAlu, alumnos?.rows?.length || 0)} de {alumnos?.rows?.length || 0}</div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={pageSafeAlu <= 1} onClick={() => setPageAlu(p => Math.max(1, p - 1))}>Anterior</button>
            <div className="px-1">Página {pageSafeAlu} / {totalPagesAlu}</div>
            <button className="rounded-md border px-3 py-1 disabled:opacity-50" disabled={pageSafeAlu >= totalPagesAlu} onClick={() => setPageAlu(p => Math.min(totalPagesAlu, p + 1))}>Siguiente</button>
          </div>
        </div>
      </div>
      <div>
        <PieChartPage grupo={grupo} />
        <ScatterChartPage alumnos={alumnos?.rows} />
        <ControlChart promedio={promedio} />
      </div>
    </div>
  )
}
