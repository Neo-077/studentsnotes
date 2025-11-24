import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import { Catalogos } from '../lib/catalogos'
import * as XLSX from 'xlsx'
import ModalBajaEstudiante from '../components/inscripciones/ModalBajaEstudiante'
import { useTranslation } from 'react-i18next'

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
  const { initialized, role } = useAuth()
  const { t } = useTranslation()

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [carreras, setCarreras] = useState<any[]>([])
  const [idCarrera, setIdCarrera] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [modalBaja, setModalBaja] = useState<{ open: boolean; id?: number }>({ open: false })

  useEffect(() => { Catalogos.carreras().then(setCarreras) }, [])

  const reqRef = useRef(0)
  async function load(silent = false) {
    const my = ++reqRef.current
    if (!silent) setLoading(true)
    setMsg(null)
    try {
      let path = '/estudiantes'
      const qs = new URLSearchParams({
        q,
        page: String(page),
        pageSize: String(pageSize),
      })

      if (role === 'maestro') {
        path = `/estudiantes/elegibles/docente`
      } else {
        if (idCarrera) {
          qs.append('id_carrera', String(idCarrera))
        }
      }

      const fullPath = qs.toString() ? `${path}?${qs.toString()}` : path
      const data = await api.get(fullPath)
      if (reqRef.current === my) {
        setRows(data.rows || [])
        setTotal(data.total || 0)
      }
    } catch (e: any) {
      if (reqRef.current === my) {
        const message = e?.message || ''
        setMsg(t('students.errors.loadFailed', { message }))
      }
    } finally {
      if (reqRef.current === my) { if (!silent) setLoading(false) }
    }
  }

  useEffect(() => { if (initialized) load(false) }, [initialized, page, pageSize])

  // Búsqueda reactiva (debounce) al escribir o cambiar carrera (solo para admin)
  useEffect(() => {
    const tmo = setTimeout(() => { if (initialized) { setPage(1); load(false) } }, 250)
    return () => clearTimeout(tmo)
  }, [initialized, q, ...(role === 'admin' ? [idCarrera] : [])])

  // Recarga silenciosa al volver del background/enfocar/reconectar
  useEffect(() => {
    const handler = () => { if (initialized) load(true) }
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handler()
    })
    window.addEventListener('pageshow', handler)
    window.addEventListener('online', handler)
    return () => {
      window.removeEventListener('focus', handler)
      window.removeEventListener('online', handler)
      window.removeEventListener('pageshow', handler)
      document.removeEventListener('visibilitychange', () => { })
    }
  }, [initialized])

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    await load()
  }

  function askBaja(r: Row) {
    setModalBaja({ open: true, id: r.id_estudiante })
  }

  async function handleConfirmBaja() {
    setModalBaja({ open: false })
    await load()
    setMsg(t('students.messages.dropped'))
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

  // ======= Helpers de deduplicación para importación =======
  const keyFromRow = (r: any) => {
    const nombre = norm(r.nombre)
    const apPat = norm(r.ap_paterno ?? '')
    const apMat = norm(r.ap_materno ?? '')
    const fnac = toISOAny(r.fecha_nacimiento) || ''
    return `${nombre}|${apPat}|${apMat}|${fnac}`
  }

  function sheetToRows(sheet: XLSX.WorkSheet) {
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: null })
    return json.map((r) => ({
      nombre: String(r.nombre ?? '').trim(),
      ap_paterno: r.ap_paterno ? String(r.ap_paterno).trim() : null,
      ap_materno: r.ap_materno ? String(r.ap_materno).trim() : null,
      genero: r.genero ?? r.id_genero ?? null,
      carrera: r.carrera ?? r.id_carrera ?? null,
      fecha_nacimiento: toISOAny(r.fecha_nacimiento),
    }))
  }

  /** ========= Importación CSV/XLSX con anti-duplicados ========= **/
  async function onUpload(file: File) {
    setMsg(null)
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) {
        // Usamos el mensaje genérico de error de importación para mantener i18n
        throw new Error(t('students.import.errorGeneric'))
      }
      const ws = wb.Sheets[firstSheetName]

      let incoming = sheetToRows(ws).filter(r => norm(r.nombre).length > 0)

      const seen = new Set<string>()
      const uniqueInFile: any[] = []
      const dupInFile: any[] = []
      for (const r of incoming) {
        const k = keyFromRow(r)
        if (seen.has(k)) dupInFile.push(r)
        else { seen.add(k); uniqueInFile.push(r) }
      }

      let alreadyInDbKeys: string[] = []
      try {
        const keys = uniqueInFile.map(keyFromRow)
        if (keys.length > 0) {
          const res = await api.post('/estudiantes/dedup-check', { keys })
          alreadyInDbKeys = Array.isArray(res.exists) ? res.exists : []
        }
      } catch {
        // Ignorar si no existe o falla
      }

      const finalRows = alreadyInDbKeys.length
        ? uniqueInFile.filter(r => !alreadyInDbKeys.includes(keyFromRow(r)))
        : uniqueInFile

      const headers = ['nombre', 'ap_paterno', 'ap_materno', 'genero', 'carrera', 'fecha_nacimiento']
      const dataAoA = [
        headers,
        ...finalRows.map(r => [
          r.nombre,
          r.ap_paterno,
          r.ap_materno,
          r.genero,
          r.carrera,
          r.fecha_nacimiento,
        ])
      ]
      const cleanSheet = XLSX.utils.aoa_to_sheet(dataAoA)
      const cleanBook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(cleanBook, cleanSheet, 'ESTUDIANTES_LIMPIOS')
      const out = XLSX.write(cleanBook, { type: 'array', bookType: 'xlsx' })
      const cleanBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fd = new FormData()
      fd.append('file', cleanBlob, `estudiantes_limpios_${Date.now()}.xlsx`)

      const report = await api.post('/estudiantes/bulk', fd as any)

      const dupInFileCount = dupInFile.length
      const dupInDbCount = alreadyInDbKeys.length
      const inserted = report?.summary?.inserted ?? 0
      const errors = report?.summary?.errors ?? 0

      const parts: string[] = []
      parts.push(t('students.import.summaryBase', { inserted, errors }))
      if (dupInFileCount) {
        parts.push(t('students.import.duplicatesInFile', { count: dupInFileCount }))
      }
      if (dupInDbCount) {
        parts.push(t('students.import.duplicatesInDb', { count: dupInDbCount }))
      }

      setMsg(parts.join(' | '))
      await load()
    } catch (e: any) {
      const fallback = t('students.import.errorGeneric')
      setMsg('❌ ' + (e?.message || fallback))
    } finally {
      const input = document.querySelector<HTMLInputElement>('input[type=file]')
      if (input) input.value = ''
      setLoading(false)
    }
  }

  async function downloadTemplateXLSX() {
    const headers = ['nombre', 'ap_paterno', 'ap_materno', 'genero', 'carrera', 'fecha_nacimiento']
    const wsMain = XLSX.utils.aoa_to_sheet([headers])

    const [gen, car] = await Promise.all([
      Catalogos.generos(),
      Catalogos.carreras()
    ])
    const listaGeneros = (gen ?? []).map((g: any) => [g.descripcion, g.clave ?? '', g.id_genero])
    const listaCarreras = (car ?? []).map((c: any) => [c.nombre, c.clave ?? '', c.id_carrera])

    const wsHelp = XLSX.utils.aoa_to_sheet([
      ['LISTAS DE REFERENCIA'],
      [],
      ['Géneros: descripcion', 'clave', 'id'],
      ...listaGeneros,
      [],
      ['Carreras: nombre', 'clave', 'id'],
      ...listaCarreras,
      [],
      ['Instrucciones'],
      ['Usa los textos de descripcion/clave exactamente como aparecen. También puedes usar IDs. Fecha en YYYY-MM-DD.']
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, 'ESTUDIANTES')
    XLSX.utils.book_append_sheet(wb, wsHelp, 'LISTAS')
    XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx')
  }

  /** ========= Render ========= **/
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('students.title')}</h2>
          <p className="text-sm text-slate-600">
            {role === 'maestro'
              ? t('students.subtitleTeacher')
              : t('students.subtitleAdmin')}
          </p>
        </div>

        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplateXLSX} className="rounded-lg border px-3 py-2 text-sm">
              {t('students.buttons.downloadTemplate')}
            </button>
            <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
              {t('students.buttons.importFile')}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </label>
          </div>
        )}
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('students.searchPlaceholder')}
          className="h-10 flex-1 min-w-[220px] rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        {role === 'admin' && (
          <select
            value={idCarrera}
            onChange={(e) => setIdCarrera(e.target.value ? Number(e.target.value) : '')}
            className="h-10 rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">{t('students.filters.allCareers')}</option>
            {carreras.map((c) => (
              <option key={c.id_carrera} value={c.id_carrera}>
                {c.clave ? `${c.clave} — ` : ''}{c.nombre}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t('students.buttons.search')}
        </button>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>{t('students.table.noControl')}</th>
                <th>{t('students.table.name')}</th>
                <th>{t('students.table.lastName1')}</th>
                <th>{t('students.table.lastName2')}</th>
                <th>{t('students.table.career')}</th>
                <th>{t('students.table.gender')}</th>
                <th>{t('students.table.birthDate')}</th>
                <th>{t('students.table.entryDate')}</th>
                <th>{t('students.table.status')}</th>
                {role === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                    {t('students.table.loading')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                    {t('students.table.empty')}
                  </td>
                </tr>
              ) : (
                [...rows]
                  .sort(
                    (a, b) =>
                      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
                      (a.ap_paterno || '').localeCompare(b.ap_paterno || '', 'es', { sensitivity: 'base' }) ||
                      (a.ap_materno || '').localeCompare(b.ap_materno || '', 'es', { sensitivity: 'base' })
                  )
                  .map(r => (
                    <tr
                      key={r.id_estudiante}
                      className="[&>td]:px-3 [&>td]:py-2 hover:bg-slate-50/60"
                    >
                      <td className="font-mono">{r.no_control ?? '—'}</td>
                      <td>{r.nombre}</td>
                      <td>{r.ap_paterno ?? '—'}</td>
                      <td>{r.ap_materno ?? '—'}</td>
                      <td>
                        {r.carrera?.clave ? `${r.carrera.clave} — ` : ''}
                        {r.carrera?.nombre ?? r.id_carrera}
                      </td>
                      <td>{r.genero?.descripcion ?? r.id_genero}</td>
                      <td>{r.fecha_nacimiento ?? '—'}</td>
                      <td>{r.fecha_ingreso ?? '—'}</td>
                      <td>
                        <span>
                          {r.activo ? t('students.status.active') : t('students.status.inactive')}
                        </span>
                      </td>
                      {role === 'admin' && (
                        <td>
                          {r.activo ? (
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-50 rounded-md border"
                              onClick={() => askBaja(r)}
                              title={t('students.actions.dropTitle')}
                            >
                              {t('students.actions.drop')}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {t('students.labels.dropped')}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-xs text-slate-500">
            {t('students.footer.total', { count: total.toLocaleString() })}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border px-2 py-1"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              {t('students.pagination.prev')}
            </button>
            <span className="text-sm">
              {t('students.pagination.pageOf', { page, maxPage })}
            </span>
            <button
              className="rounded border px-2 py-1"
              disabled={page >= maxPage}
              onClick={() => setPage(p => Math.min(maxPage, p + 1))}
            >
              {t('students.pagination.next')}
            </button>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="rounded border px-2 py-1 text-sm"
            >
              {[10, 20, 50, 100].map(n => (
                <option key={n} value={n}>
                  {t('students.pagination.perPage', { n })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      {role === 'admin' && (
        <ModalBajaEstudiante
          open={modalBaja.open}
          idEstudiante={modalBaja.id}
          onConfirm={handleConfirmBaja}
          onCancel={() => setModalBaja({ open: false })}
        />
      )}
    </div>
  )
}