import { useEffect, useMemo, useState } from 'react'
import { FiDownload, FiUpload, FiSearch, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import api from '../lib/api'
import { Catalogos } from '../lib/catalogos'

type Row = {
  id_estudiante: number
  no_control: string | null
  nombre: string
  ap_paterno: string | null
  ap_materno: string | null
  id_carrera: number
  id_genero: number
  fecha_nacimiento?: string | null
  fecha_ingreso?: string | null
  activo: boolean
  carrera?: { nombre: string; clave?: string }
  genero?: { descripcion: string }
}

export default function Students() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [carreras, setCarreras] = useState<any[]>([])
  const [idCarrera, setIdCarrera] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    Catalogos.carreras().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      setCarreras(arr)
    })
  }, [])

  async function load() {
    setLoading(true)
    setMsg(null)
    try {
      const data = await api.get(`/estudiantes?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}${idCarrera ? `&id_carrera=${idCarrera}` : ''}`)
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setMsg('Error cargando estudiantes: ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [page, pageSize]) // carga inicial + cambios

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    await load()
  }

  async function onUpload(file: File) {
    setMsg(null)
    const fd = new FormData()
    fd.append('file', file)           // 👈 nombre de campo debe ser "file"
    try {
      const report = await api.post('/estudiantes/bulk', fd as any) // 👈 backend
      let extra = ''
      if (report?.errors?.length) {
        const preview = report.errors.slice(0, 3).map((e: any) => `fila ${e.row}: ${e.error}`).join(' | ')
        extra = ` — Ejemplos: ${preview}${report.errors.length > 3 ? ' …' : ''}`
        console.warn('Errores de importación:', report.errors)
      }
      ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `✅ Importación: ${report.summary.valid}/${report.summary.received} válidos, insertados ${report.summary.inserted}, errores ${report.summary.errors}${extra}` })
      await load()
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Error importando'))
    }
  }

  function downloadTemplate() {
    const headers = ['no_control', 'nombre', 'ap_paterno', 'ap_materno', 'genero', 'carrera', 'fecha_nacimiento'].join(',')
    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plantilla_estudiantes.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Estudiantes</h2>
          <p className="text-sm text-slate-600">Busca, filtra e importa estudiantes.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="rounded-lg border px-3 py-2 text-sm inline-flex items-center">
            <FiDownload className="mr-2" size={14} />
            Descargar plantilla (CSV)
          </button>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer inline-flex items-center">
            <FiUpload className="mr-2" size={14} />
            Importar (.xlsx/.xls/.csv)
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (no_control, nombre, apellidos)" className="h-10 flex-1 min-w-[220px] rounded-lg border px-3" />
        <select value={idCarrera} onChange={(e) => setIdCarrera(e.target.value ? Number(e.target.value) : '')} className="h-10 rounded-lg border px-3">
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c.id_carrera} value={c.id_carrera}>{c.clave ? `${c.clave} — ` : ''}{c.nombre}</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-white inline-flex items-center">
          <FiSearch className="mr-2" size={16} />
          Buscar
        </button>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>No. control</th>
                <th>Nombre</th>
                <th>Carrera</th>
                <th>Género</th>
                <th>Nacimiento</th>
                <th>Ingreso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Sin resultados.</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id_estudiante} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono">{r.no_control ?? '—'}</td>
                    <td>{r.nombre} {r.ap_paterno ?? ''} {r.ap_materno ?? ''}</td>
                    <td>{r.carrera?.clave ? `${r.carrera.clave} — ` : ''}{r.carrera?.nombre ?? r.id_carrera}</td>
                    <td>{r.genero?.descripcion ?? r.id_genero}</td>
                    <td>{r.fecha_nacimiento ?? '—'}</td>
                    <td>{r.fecha_ingreso ?? '—'}</td>
                    <td>{r.activo ? 'Activo' : 'Inactivo'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-xs text-slate-500">{total.toLocaleString()} en total</div>
          <div className="flex items-center gap-2">
            <button className="rounded border px-2 py-1 inline-flex items-center" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><FiArrowLeft className="mr-2" size={14} />Anterior</button>
            <span className="text-sm">Página {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button className="rounded border px-2 py-1 inline-flex items-center" disabled={page >= maxPage} onClick={() => setPage(p => Math.min(maxPage, p + 1))}>Siguiente<FiArrowRight className="ml-2" size={14} /></button>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} className="rounded border px-2 py-1 text-sm">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
          </div>
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  )
}
