// src/routes/Estudiantes.tsx
import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { Catalogos } from '../lib/catalogos'
import * as XLSX from 'xlsx'

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

export default function Estudiantes() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [carreras, setCarreras] = useState<any[]>([])
  const [idCarrera, setIdCarrera] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => { Catalogos.carreras().then(setCarreras) }, [])

  async function load() {
    setLoading(true)
    setMsg(null)
    try {
      const qs = new URLSearchParams({
        q,
        page: String(page),
        pageSize: String(pageSize),
        ...(idCarrera ? { id_carrera: String(idCarrera) } : {}),
      })
      const data = await api.get(`/estudiantes?${qs.toString()}`)
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setMsg('Error cargando estudiantes: ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, pageSize])

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    await load()
  }

  async function onDelete(id: number) {
    if (!window.confirm('¿Eliminar este estudiante? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/estudiantes/${id}`)
      await load()
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Error eliminando estudiante'))
    }
  }

  /** ========= Helpers ========= **/
  const norm = (s: any) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  function toISOAny(v: any): string | null {
    if (v == null || v === '') return null
    if (typeof v === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30))
      const ms = Math.round(v * 24 * 3600 * 1000)
      const d = new Date(epoch.getTime() + ms)
      const y = d.getUTCFullYear()
      if (y < 1900 || y > 2100) return null
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${mm}-${dd}`
    }
    if (v instanceof Date && !isNaN(v.getTime())) {
      const y = v.getFullYear()
      const mm = String(v.getMonth() + 1).padStart(2, '0')
      const dd = String(v.getDate()).padStart(2, '0')
      return `${y}-${mm}-${dd}`
    }
    const s = String(v).trim()
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/')
      return `${yyyy}-${mm}-${dd}`
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    return null
  }

  /** ========= Importación CSV/XLSX ========= **/
  async function onUpload(file: File) {
    setMsg(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('El archivo no tiene hojas')
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as Record<string, any>[]
      if (rows.length === 0) throw new Error('El archivo está vacío')

      const [generos, carreras] = await Promise.all([
        Catalogos.generos(),
        Catalogos.carreras()
      ])

      const generoByText = new Map<string, number>()
      for (const g of generos ?? []) {
        generoByText.set(norm(g.descripcion), g.id_genero)
        if (g.clave) generoByText.set(norm(g.clave), g.id_genero)
        if (norm(g.descripcion).startsWith('m')) generoByText.set('m', g.id_genero)
        if (norm(g.descripcion).startsWith('f')) generoByText.set('f', g.id_genero)
      }

      const carreraByClave = new Map<string, number>()
      const carreraByNombre = new Map<string, number>()
      for (const c of carreras ?? []) {
        if (c.clave) carreraByClave.set(norm(c.clave), c.id_carrera)
        carreraByNombre.set(norm(c.nombre), c.id_carrera)
      }

      const HEADER_MAP: Record<string, string> = {
        'nombre': 'nombre',
        'ap_paterno': 'ap_paterno',
        'ap_materno': 'ap_materno',
        'genero': 'genero',
        'carrera': 'carrera',
        'fecha_nacimiento': 'fecha_nacimiento'
      }

      const mapped = rows.map((r) => {
        const out: any = {}
        for (const [k, v] of Object.entries(r)) {
          const key = HEADER_MAP[norm(k)]
          if (key) out[key] = v
        }
        return out
      })

      const normalized = mapped.map((r, i) => {
        const rowNum = i + 2
        const nombre = String(r.nombre ?? '').trim()
        const ap_paterno = String(r.ap_paterno ?? '').trim()
        const ap_materno = r.ap_materno ? String(r.ap_materno).trim() : null

        if (!nombre || !ap_paterno) {
          throw new Error(`Fila ${rowNum}: faltan campos obligatorios (nombre o ap_paterno)`)
        }

        let id_genero: number | null = null
        if (r.genero) {
          const gkey = norm(r.genero)
          if (/^\d+$/.test(gkey)) id_genero = Number(gkey)
          else id_genero = generoByText.get(gkey) ?? null
        }
        if (!id_genero) throw new Error(`Fila ${rowNum}: Género no válido (${r.genero})`)

        let id_carrera: number | null = null
        if (r.carrera) {
          const ckey = norm(r.carrera)
          if (carreraByClave.has(ckey)) id_carrera = carreraByClave.get(ckey)!
          else if (carreraByNombre.has(ckey)) id_carrera = carreraByNombre.get(ckey)!
          else if (/^\d+$/.test(ckey)) id_carrera = Number(ckey)
        }
        if (!id_carrera) throw new Error(`Fila ${rowNum}: Carrera no válida (${r.carrera})`)

        return {
          nombre,
          ap_paterno,
          ap_materno,
          id_genero,
          id_carrera,
          fecha_nacimiento: toISOAny(r.fecha_nacimiento ?? null),
        }
      })

      const headers = ['nombre','ap_paterno','ap_materno','id_genero','id_carrera','fecha_nacimiento']
      const lines = [headers.join(',')]
      for (const r of normalized) {
        const vals = headers.map(h => {
          const v = (r as any)[h]
          const s = v == null ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        lines.push(vals.join(','))
      }
      const csv = lines.join('\n')

      const newFile = new File([csv], 'estudiantes_convertido.csv', { type: 'text/csv;charset=utf-8' })
      const fd = new FormData()
      fd.append('file', newFile)

      const report = await api.post('/estudiantes/bulk', fd as any)
      setMsg(`✅ Importación completada: ${report.summary.inserted} insertados, ${report.summary.errors} errores`)
      await load()
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Error importando'))
    } finally {
      const input = document.querySelector<HTMLInputElement>('input[type=file]')
      if (input) input.value = ''
    }
  }

  function downloadTemplate() {
    const headers = ['nombre','ap_paterno','ap_materno','genero','carrera','fecha_nacimiento'].join(',')
    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plantilla_estudiantes.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /** ========= Render ========= **/
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Estudiantes</h2>
          <p className="text-sm text-slate-600">Consulta, busca y carga estudiantes por archivo.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="rounded-lg border px-3 py-2 text-sm">
            Descargar plantilla (CSV)
          </button>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
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

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (no_control, nombre, apellidos)"
          className="h-10 flex-1 min-w-[220px] rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <select
          value={idCarrera}
          onChange={(e) => setIdCarrera(e.target.value ? Number(e.target.value) : '')}
          className="h-10 rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c.id_carrera} value={c.id_carrera}>
              {c.clave ? `${c.clave} — ` : ''}{c.nombre}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">Buscar</button>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>No. control</th>
                <th>Nombre</th>
                <th>Apellido paterno</th>
                <th>Apellido materno</th>
                <th>Carrera</th>
                <th>Género</th>
                <th>Nacimiento</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Sin resultados.</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id_estudiante} className="[&>td]:px-3 [&>td]:py-2 hover:bg-slate-50/60">
                    <td className="font-mono">{r.no_control ?? '—'}</td>
                    <td>{r.nombre}</td>
                    <td>{r.ap_paterno ?? '—'}</td>
                    <td>{r.ap_materno ?? '—'}</td>
                    <td>{r.carrera?.clave ? `${r.carrera.clave} — ` : ''}{r.carrera?.nombre ?? r.id_carrera}</td>
                    <td>{r.genero?.descripcion ?? r.id_genero}</td>
                    <td>{r.fecha_nacimiento ?? '—'}</td>
                    <td>{r.fecha_ingreso ?? '—'}</td>
                    <td><span>{r.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs hover:bg-red-50 hover:border-red-300 text-red-600"
                        onClick={() => onDelete(r.id_estudiante)}
                        title="Eliminar estudiante"
                      >Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-xs text-slate-500">{total.toLocaleString()} en total</div>
          <div className="flex items-center gap-2">
            <button className="rounded border px-2 py-1" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span className="text-sm">Página {page} / {maxPage}</span>
            <button className="rounded border px-2 py-1" disabled={page >= maxPage} onClick={() => setPage(p => Math.min(maxPage, p + 1))}>Siguiente</button>
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
