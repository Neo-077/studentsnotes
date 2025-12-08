// src/routes/Estudiantes.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import { Catalogos } from '../lib/catalogos'
import * as XLSX from 'xlsx'
import ModalBajaEstudiante from '../components/inscripciones/ModalBajaEstudiante'
import { useTranslation } from 'react-i18next'
import { getCareerLabel, getGenderLabel } from '../lib/labels'
import { FiDownload, FiUpload, FiSearch, FiTrash2, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import { useAccessibility } from '../store/useAccessibility'
import { TTS } from '../lib/tts'

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
  const { t, i18n } = useTranslation()

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [carreras, setCarreras] = useState<any[]>([])
  const [idCarrera, setIdCarrera] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'dropped'>('active')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [modalBaja, setModalBaja] = useState<{ open: boolean; id?: number }>({ open: false })

  // ===== Accesibilidad / voz =====
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    TTS.speak(text, { rate: voiceRate })
  }

  const speakCell = (label: string, value?: string | number | null | undefined) => {
    if (!voiceEnabled) return
    if (!TTS.isSupported()) return
    const raw = value == null ? 'Sin valor' : String(value)
    const clean =
      raw.trim() === '' || raw.trim() === '—'
        ? 'Sin valor'
        : raw.trim()
    speak(`${label}: ${clean}`)
  }

  // Textos de ayuda con voz
  const pageHelpText = t(
    'students.tts.pageHelp',
    'En esta pantalla puedes consultar y filtrar la lista de estudiantes, ver su número de control, nombre completo, carrera, género, fechas y estatus, además de dar de baja a un alumno si eres administrador.'
  )

  const searchHelpText = t(
    'students.tts.searchHelp',
    'En este cuadro de búsqueda puedes escribir parte del número de control, el nombre o los apellidos para filtrar la tabla de alumnos.'
  )

  const filterStatusHelpText = t(
    'students.tts.statusFilterHelp',
    'En este filtro puedes elegir entre ver solo los alumnos activos, solo los dados de baja o todos.'
  )

  const careersFilterHelpText = t(
    'students.tts.careerFilterHelp',
    'En este filtro puedes limitar la tabla a una sola carrera o dejar la opción todas las carreras.'
  )

  // Resumen por alumno
  function studentSummary(r: Row) {
    const fullName = [r.nombre, r.ap_paterno, r.ap_materno].filter(Boolean).join(' ')
    const careerLabel =
      (r.carrera?.clave ? `${r.carrera.clave} — ` : '') +
      ((getCareerLabel(r.carrera) || r.carrera?.nombre) ?? String(r.id_carrera))
    const statusText = r.activo ? t('students.status.active') : t('students.status.inactive')
    const controlPart = r.no_control ? `Número de control ${r.no_control}. ` : ''
    const birthPart = r.fecha_nacimiento ? `Fecha de nacimiento ${r.fecha_nacimiento}. ` : ''
    const entryPart = r.fecha_ingreso ? `Fecha de ingreso ${r.fecha_ingreso}. ` : ''
    const genderLabel = getGenderLabel(r.genero) || r.genero?.descripcion || String(r.id_genero)
    return `Alumno ${fullName}. ${controlPart}Carrera ${careerLabel}. Género ${genderLabel}. ${birthPart}${entryPart}Estatus ${statusText}.`
  }

  useEffect(() => {
    Catalogos.carreras().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      setCarreras(arr)
    })
  }, [i18n?.language])

  const reqRef = useRef(0)
  async function load(silent = false) {
    const my = ++reqRef.current
    if (!silent) setLoading(true)
    setMsg(null)
    try {
      let path = '/estudiantes'
      const effectivePageSize = statusFilter && statusFilter !== 'all' ? 100000 : pageSize
      const qs = new URLSearchParams({
        q,
        page: String(page),
        pageSize: String(effectivePageSize),
      })

      if (role === 'maestro') {
        path = `/estudiantes/elegibles/docente`
      } else {
        if (idCarrera) {
          qs.append('id_carrera', String(idCarrera))
        }
        if (statusFilter && statusFilter !== 'all') {
          qs.append('activo', statusFilter === 'active' ? '1' : '0')
        }
      }

      const fullPath = qs.toString() ? `${path}?${qs.toString()}` : path
      const data = await api.get(fullPath)
      if (reqRef.current === my) {
        setRows(data.rows || [])
        setTotal(data.total || 0)
      }
      return data
    } catch (e: any) {
      if (reqRef.current === my) {
        const message = e?.message || ''
        setMsg(t('students.errors.loadFailed', { message }))
      }
      return null
    } finally {
      if (reqRef.current === my) {
        if (!silent) setLoading(false)
      }
    }
  }

  useEffect(() => { if (initialized) load(false) }, [initialized, page, pageSize])

  useEffect(() => {
    setPage(1)
    if (initialized) load(false)
  }, [statusFilter])

  // Búsqueda reactiva
  useEffect(() => {
    const tmo = setTimeout(() => { if (initialized) { setPage(1); load(false) } }, 250)
    return () => clearTimeout(tmo)
  }, [initialized, q, ...(role === 'admin' ? [idCarrera] : [])])

  // Recarga silenciosa
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

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter(r => (statusFilter === 'active') ? !!r.activo : !r.activo)
  }, [rows, statusFilter])

  const totalForPagination = statusFilter === 'all' ? total : filteredRows.length
  const maxPageEffective = useMemo(() => Math.max(1, Math.ceil(totalForPagination / pageSize)), [totalForPagination, pageSize])
  const pageSafeEffective = Math.min(page, maxPageEffective)
  const startIdx = (pageSafeEffective - 1) * pageSize
  const endIdx = startIdx + pageSize

  const sortedRows = useMemo(() => {
    const base = statusFilter === 'all' ? rows : filteredRows
    return [...base].sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
        (a.ap_paterno || '').localeCompare(b.ap_paterno || '', 'es', { sensitivity: 'base' }) ||
        (a.ap_materno || '').localeCompare(b.ap_materno || '', 'es', { sensitivity: 'base' })
    )
  }, [rows, filteredRows, statusFilter])

  const displayedRows = statusFilter === 'all'
    ? sortedRows.slice(startIdx, endIdx)
    : sortedRows.slice(startIdx, endIdx)

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
    const data = await load()
    try {
      const newTotal = data?.total ?? total
      const newMax = Math.max(1, Math.ceil((newTotal || 0) / pageSize))
      if (page > newMax) {
        setPage(newMax)
      }
    } catch {
      // noop
    }
    ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: t('students.messages.dropped') })
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
      } catch { }

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

      ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: parts.join(' | ') })
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
    const listaGeneros = (gen ?? []).map((g: any) => [getGenderLabel(g) || g.descripcion, g.clave ?? '', g.id_genero])
    const listaCarreras = (car ?? []).map((c: any) => [getCareerLabel(c) || c.nombre, c.clave ?? '', c.id_carrera])

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

  /** ========= Descargar tabla de alumnos (lista actual) ========= **/
  function downloadStudentsXLSX() {
    // exporta todos los alumnos filtrados y ordenados (no solo la página)
    const data = sortedRows
    const headers = [
      'no_control',
      'nombre_completo',
      'carrera',
      'genero',
      'fecha_nacimiento',
      'fecha_ingreso',
      'estatus',
    ]
    const rowsAoA = [
      headers,
      ...data.map((r) => {
        const fullName = [r.nombre, r.ap_paterno, r.ap_materno].filter(Boolean).join(' ')
        const career =
          (r.carrera?.clave ? `${r.carrera.clave} — ` : '') +
          ((getCareerLabel(r.carrera) || r.carrera?.nombre) ?? String(r.id_carrera))
        const gender = getGenderLabel(r.genero) || r.genero?.descripcion || String(r.id_genero)
        const statusText = r.activo ? t('students.status.active') : t('students.status.inactive')
        return [
          r.no_control ?? '',
          fullName,
          career,
          gender,
          r.fecha_nacimiento ?? '',
          r.fecha_ingreso ?? '',
          statusText,
        ]
      }),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rowsAoA)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ALUMNOS')
    XLSX.writeFile(wb, 'lista_estudiantes.xlsx')
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

        <div className="flex items-center gap-2">
          {/* Explicación general de la pantalla */}
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(pageHelpText)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={t('students.tts.pageHelpAria', 'Escuchar explicación de la pantalla de alumnos')}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t('students.tts.pageHelpButton', 'Explicar pantalla')}</span>
            </button>
          )}

          {/* Botón para descargar lista actual */}
          <button
            type="button"
            onClick={downloadStudentsXLSX}
            className="rounded-lg border px-3 py-2 text-sm inline-flex items-center"
          >
            <FiDownload className="mr-2" size={16} />
            {t('students.buttons.exportList', 'Descargar lista')}
          </button>

          {role === 'admin' && (
            <>
              <button
                onClick={downloadTemplateXLSX}
                className="rounded-lg border px-3 py-2 text-sm inline-flex items-center"
              >
                <FiDownload className="mr-2" size={16} />
                {t('students.buttons.downloadTemplate')}
              </button>
              <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer inline-flex items-center">
                <FiUpload className="mr-2" size={16} />
                {t('students.buttons.importFile')}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
              </label>
            </>
          )}
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm"
      >
        {/* Búsqueda con voz */}
        <div className="flex-1 min-w-80 flex items-center gap-1">
          <div className="relative flex-1 min-w-0">
            <FiSearch className="absolute left-2 top-2.5" size={14} style={{ color: "var(--muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('students.searchPlaceholder')}
              className="h-10 flex-1 min-w-0 rounded-xl border pl-7 pr-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full max-w-full box-border"
              aria-label={t('students.searchPlaceholder')}
              onFocus={() => speak(t('students.searchPlaceholder'))}
            />
          </div>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(searchHelpText)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex-shrink-0"
              aria-label={t('students.tts.searchHelpAria', 'Escuchar instrucciones del cuadro de búsqueda de alumnos')}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t('students.tts.fieldHelpButton', '¿Cómo buscar?')}</span>
            </button>
          )}
        </div>

        {role === 'admin' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <select
              value={idCarrera}
              onChange={(e) => setIdCarrera(e.target.value ? Number(e.target.value) : '')}
              className="h-10 rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
            >
              <option value="">{t('students.filters.allCareers')}</option>
              {carreras.map((c) => (
                <option key={c.id_carrera} value={c.id_carrera}>
                  {c.clave ? `${c.clave} — ` : ''}{getCareerLabel(c) || c.nombre}
                </option>
              ))}
            </select>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(careersFilterHelpText)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex-shrink-0"
                aria-label={t('students.tts.careerFilterHelpAria', 'Escuchar explicación del filtro de carrera')}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t('students.tts.fieldHelpButton', 'Ayuda')}</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 rounded-xl border px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
            title={t('students.table.status')}
          >
            <option value="active">{t('students.status.active')}</option>
            <option value="dropped">{t('students.status.inactive')}</option>
            <option value="all">{t('classGroups.filters.termAll')}</option>
          </select>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(filterStatusHelpText)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex-shrink-0"
              aria-label={t('students.tts.statusFilterHelpAria', 'Escuchar explicación del filtro de estatus de alumnos')}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t('students.tts.fieldHelpButton', 'Ayuda')}</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 inline-flex items-center"
        >
          <FiSearch className="mr-2" size={16} />
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
              {loading && displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                    {t('students.table.loading')}
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                    {t('students.table.empty')}
                  </td>
                </tr>
              ) : (
                displayedRows.map(r => {
                  const careerText = (getCareerLabel(r.carrera) || r.carrera?.nombre) ?? String(r.id_carrera)
                  const genderText = getGenderLabel(r.genero) || r.genero?.descripcion || String(r.id_genero)
                  const statusText = r.activo ? t('students.status.active') : t('students.status.inactive')
                  const lastName1 = r.ap_paterno ?? '—'
                  const lastName2 = r.ap_materno ?? '—'

                  return (
                    <tr
                      key={r.id_estudiante}
                      className="[&>td]:px-3 [&>td]:py-2 hover:bg-slate-50/60"
                    >
                      {/* Número de control */}
                      <td className="font-mono">
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.noControl'), r.no_control ?? 'Sin número')}
                        >
                          {r.no_control ?? '—'}
                        </button>
                      </td>

                      {/* Nombre */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.name'), r.nombre)}
                        >
                          {r.nombre}
                        </button>
                      </td>

                      {/* Apellido paterno */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.lastName1'), lastName1)}
                        >
                          {lastName1}
                        </button>
                      </td>

                      {/* Apellido materno */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.lastName2'), lastName2)}
                        >
                          {lastName2}
                        </button>
                      </td>

                      {/* Carrera */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.career'), careerText)}
                        >
                          {careerText}
                        </button>
                      </td>

                      {/* Género */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.gender'), genderText)}
                        >
                          {genderText}
                        </button>
                      </td>

                      {/* Fecha nacimiento */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.birthDate'), r.fecha_nacimiento ?? 'Sin fecha')}
                        >
                          {r.fecha_nacimiento ?? '—'}
                        </button>
                      </td>

                      {/* Fecha ingreso */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.entryDate'), r.fecha_ingreso ?? 'Sin fecha')}
                        >
                          {r.fecha_ingreso ?? '—'}
                        </button>
                      </td>

                      {/* Estatus */}
                      <td>
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                          onClick={() => speakCell(t('students.table.status'), statusText)}
                        >
                          {statusText}
                        </button>
                      </td>

                      {role === 'admin' && (
                        <td className="flex items-center gap-2 justify-end">
                          {/* Resumen de voz del alumno */}
                          {voiceEnabled && (
                            <button
                              type="button"
                              onClick={() => speak(studentSummary(r))}
                              className="px-2 py-1.5 text-[11px] inline-flex items-center rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100"
                              aria-label={t('students.tts.rowSummaryAria', 'Escuchar resumen del alumno {{name}}', {
                                name: r.nombre,
                              })}
                            >
                              <span aria-hidden="true">🔊</span>
                            </button>
                          )}

                          {r.activo ? (
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-50 rounded-md border"
                              onClick={() => askBaja(r)}
                              title={t('students.actions.dropTitle')}
                            >
                              <FiTrash2 className="mr-2" size={16} />
                              {t('students.actions.drop')}
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              {t('students.labels.dropped')}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {t('students.footer.total', { count: totalForPagination })}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border px-2 py-1 inline-flex items-center"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <FiArrowLeft className="mr-2" size={14} />
              {t('students.pagination.prev')}
            </button>
            <span className="text-sm">
              {t('students.pagination.pageOf', { page: pageSafeEffective, maxPage: maxPageEffective })}
            </span>
            <button
              className="rounded border px-2 py-1 inline-flex items-center"
              disabled={page >= maxPageEffective}
              onClick={() => setPage(p => Math.min(maxPageEffective, p + 1))}
            >
              {t('students.pagination.next')}
              <FiArrowRight className="ml-2" size={14} />
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
