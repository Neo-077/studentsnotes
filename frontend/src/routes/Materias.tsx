// src/routes/Materias.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import { Catalogos } from '../lib/catalogos'
import * as XLSX from 'xlsx'
import confirmService from '../lib/confirmService'
import { useTranslation } from 'react-i18next'
import { getCareerLabel, getSubjectLabel } from '../lib/labels'
import { FiPlus, FiEdit, FiTrash2, FiDownload, FiUpload, FiSearch, FiArrowLeft } from 'react-icons/fi'
import { useAccessibility } from '../store/useAccessibility'
import { TTS } from '../lib/tts'

export default function Materias() {
  const { t } = useTranslation()

  type Materia = { id_materia: number; clave?: string; nombre: string; unidades: number; creditos: number }
  type Relacion = { id_materia: number; id_carrera?: number | null; semestre?: number | null; carrera?: { nombre?: string; clave?: string } }

  const [rows, setRows] = useState<Materia[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [f, setF] = useState({ nombre: '', unidades: '5', creditos: '5', id_carrera: '', semestre: '' })
  const [edit, setEdit] = useState<{ open: boolean; id?: number; nombre?: string; unidades?: string; creditos?: string }>({ open: false })

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
    const clean = raw.trim() === '' || raw.trim() === '—' ? 'Sin valor' : raw.trim()
    speak(`${label}: ${clean}`)
  }

  // Textos explicativos de los apartados
  const pageHelpText = t(
    'subjects.tts.pageHelp',
    'En esta pantalla puedes administrar materias: darlas de alta con sus unidades y créditos, vincularlas a carreras, buscarlas, importarlas desde un archivo y editarlas o eliminarlas.'
  )

  const createSectionHelp = t(
    'subjects.tts.createSectionHelp',
    'Completa el formulario con el nombre de la materia, sus unidades, créditos y la carrera a la que pertenece. Después presiona el botón Guardar materia.'
  )

  const listSectionHelp = t(
    'subjects.tts.listSectionHelp',
    'En este apartado puedes buscar materias, descargar la plantilla de ejemplo, importar un archivo y gestionar cada fila con los botones de resumen, editar y eliminar.'
  )

  const searchHelpText = t(
    'subjects.tts.searchHelp',
    'Escribe parte de la clave, el nombre o la carrera para filtrar la tabla de materias.'
  )

  const nameLabel = t('subjects.form.nameLabel')
  const nameInstructions = t(
    'subjects.tts.nameInstructions',
    'Escribe el nombre completo de la materia. Este campo es obligatorio.'
  )

  const unitsLabel = t('subjects.form.unitsLabel')
  const unitsInstructions = t(
    'subjects.tts.unitsInstructions',
    'Escribe el número de unidades de la materia. Normalmente es un valor entre uno y diez.'
  )

  const creditsLabel = t('subjects.form.creditsLabel')
  const creditsInstructions = t(
    'subjects.tts.creditsInstructions',
    'En este campo escribe el número de créditos de la materia. Normalmente es un valor entre uno y treinta.'
  )

  const careerLabel = t('subjects.form.careerLabel')
  const careerInstructions = t(
    'subjects.tts.careerInstructions',
    'En esta lista desplegable selecciona la carrera a la que pertenece la materia. Es obligatorio elegir una carrera.'
  )

  const semesterLabel = t('subjects.form.semesterLabel')
  const semesterInstructions = t(
    'subjects.tts.semesterInstructions',
    'En este campo puedes escribir el semestre sugerido para cursar la materia, en un rango de uno a doce. Si lo dejas vacío, no se asigna semestre.'
  )

  const fieldHelpButtonLabel = t(
    'subjects.tts.fieldHelpButton',
    '¿Qué debo escribir?'
  )

  const fieldHelpAria = (label: string) =>
    t(
      'subjects.tts.fieldHelpAria',
      'Escuchar instrucciones del campo {{label}}',
      { label }
    )

  /** ===== Helpers ===== **/
  const norm = (s: any) =>
    String(s ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  const materiaKey = (nombre: string, id_carrera: number | '' | undefined | null) =>
    `${norm(nombre)}|${id_carrera ? Number(id_carrera) : 0}`

  function carreraInputToId(v: any): number | null {
    if (v == null || v === '') return null
    const asNum = Number(v)
    if (!isNaN(asNum)) return asNum
    // por clave o por nombre
    const n = norm(String(v))
    const found = carreras.find((c: any) => norm(c.clave ?? '') === n || norm(c.nombre ?? '') === n)
    return found ? Number(found.id_carrera) : null
  }

  // Pairs existentes (materia,carrera) actuales en UI
  const existingPairs = useMemo(() => {
    const set = new Set<string>()
    for (const r of relaciones) {
      const mat = rows.find(m => m.id_materia === r.id_materia)
      if (!mat) continue
      set.add(materiaKey(mat.nombre, r.id_carrera))
    }
    return set
  }, [relaciones, rows])

  /** ===== Data load ===== **/
  const reqRef = useRef(0)
  async function load(silent = false) {
    const my = ++reqRef.current
    if (!silent) setLoading(true)
    setMsg(null)
    try {
      const [mats, cars, rels] = await Promise.all([
        Catalogos.materias(),
        Catalogos.carreras(),
        api.get('/materia-carrera')
      ])
      if (reqRef.current === my) {
        setRows(mats ?? [])
        setCarreras(cars ?? [])
        setRelaciones(Array.isArray(rels) ? rels : [])
      }
    }
    catch (e: any) {
      const message = e?.message || ''
      setMsg(message || t('subjects.errors.loadFailed'))
    }
    finally {
      if (reqRef.current === my) { if (!silent) setLoading(false) }
    }
  }
  useEffect(() => { load(false) }, [])

  // Recarga silenciosa al volver del background/enfocar/reconectar
  useEffect(() => {
    const handler = () => load(true)
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') handler() })
    window.addEventListener('pageshow', handler)
    window.addEventListener('online', handler)
    return () => {
      window.removeEventListener('focus', handler)
      window.removeEventListener('online', handler)
      window.removeEventListener('pageshow', handler)
      document.removeEventListener('visibilitychange', () => { })
    }
  }, [])

  useEffect(() => {
    if (!edit.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEdit({ open: false }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edit.open])

  function downloadTemplateXLSX() {
    const headers = ['nombre', 'unidades', 'creditos', 'carrera', 'semestre']
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const listaCarreras = (carreras ?? []).map((c: any) => [getCareerLabel(c), c.clave ?? '', c.id_carrera])
    const listaMaterias = (rows ?? []).map((m: any) => [getSubjectLabel(m) || m.nombre, m.clave ?? '', m.id_materia])
    const wsHelp = XLSX.utils.aoa_to_sheet([
      ['LISTAS'],
      [],
      ['Carreras: nombre', 'clave', 'id'],
      ...listaCarreras,
      [],
      ['Materias existentes: nombre', 'clave', 'id'],
      ...listaMaterias,
      [],
      ['Instrucciones'],
      ['Obligatorio: nombre, unidades, creditos.'],
      ["Opcional: 'carrera' puede ser id, clave o nombre exacto."],
      ["Opcional: 'semestre' (1-12) si se vinculará con carrera."],
      ["Regla: NO se permite duplicar (materia,carrera). La misma materia SÍ puede estar en otra carrera."],
      ["La 'clave' se autogenera en el backend."]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, 'MATERIAS')
    XLSX.utils.book_append_sheet(wb, wsHelp, 'LISTAS')
    XLSX.writeFile(wb, 'plantilla_materias.xlsx')
  }

  // Construir filas por relación materia-carrera (una por vínculo, o una sola si no hay vínculos)
  const filasMateriaCarrera = useMemo(() => {
    const map = new Map<number, Array<{ nombreCarrera: string; clave?: string; semestre: number | null; id_carrera?: number | null }>>()
    for (const r of relaciones) {
      const arr = map.get(r.id_materia) || []
      arr.push({ nombreCarrera: r.carrera?.nombre || '', clave: r.carrera?.clave, semestre: r.semestre ?? null, id_carrera: r.id_carrera ?? null })
      map.set(r.id_materia, arr)
    }
    const rowsOut: Array<{ id_materia: number; clave?: string; nombre: string; unidades: number; creditos: number; carreraTexto: string }> = []
    for (const m of rows) {
      const rels = map.get(m.id_materia) || []
      if (rels.length === 0) {
        rowsOut.push({ id_materia: m.id_materia, clave: m.clave, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos, carreraTexto: '—' })
      } else {
        for (const c of rels) {
          const careerObj = carreras.find(cx => Number(cx.id_carrera) === Number(c.id_carrera)) || (c.nombreCarrera ? { nombre: c.nombreCarrera } : undefined)
          const careerLabel = getCareerLabel(careerObj) || c.nombreCarrera || ''
          const label = `${careerLabel}${c.semestre ? ` · S${c.semestre}` : ''}`

          rowsOut.push({
            id_materia: m.id_materia,
            clave: m.clave,
            nombre: m.nombre,
            unidades: m.unidades,
            creditos: m.creditos,
            carreraTexto: label,
          })
        }
      }
    }
    rowsOut.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.carreraTexto.localeCompare(b.carreraTexto, 'es', { sensitivity: 'base' }))
    return rowsOut
  }, [rows, relaciones, carreras])

  const list = useMemo(() => {
    const arr = [...filasMateriaCarrera]
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      return arr.filter(r => [`${r.clave ?? ''}`, r.nombre, r.carreraTexto].join(' ').toLowerCase().includes(s))
    }
    return arr
  }, [filasMateriaCarrera, q])

  /** ===== Crear con validación (materia única por carrera) ===== **/
  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const payload = {
      nombre: norm(f.nombre),
      unidades: Number(f.unidades || 5),
      creditos: Number(f.creditos || 5)
    }
    const idCarr = carreraInputToId(f.id_carrera)

    if (!payload.nombre) {
      setMsg(t('subjects.messages.nameRequired'))
      return
    }

    if (!idCarr) {
      setMsg(t('subjects.messages.careerRequired'))
      return
    }

    const existing = (rows || []).find(m => norm(m.nombre) === payload.nombre)

    if (existing) {
      const dupKey = materiaKey(existing.nombre, idCarr)
      if (existingPairs.has(dupKey)) {
        setMsg(t('subjects.messages.linkExists'))
        return
      }
    }

    try {
      let id_materia = existing?.id_materia
      if (!id_materia) {
        const created = await api.post('/materias', payload, { skipConfirm: true } as any)
        id_materia = created?.id_materia
        if (!id_materia) {
          const latest = (await Catalogos.materias()) ?? []
          const found = latest.find((m: any) => norm(m.nombre) === payload.nombre)
          id_materia = found?.id_materia
        }
      }

      if (id_materia && idCarr) {
        const dupKey = materiaKey(payload.nombre, idCarr)
        if (existingPairs.has(dupKey)) {
          setMsg(t('subjects.messages.linkExists'))
          return
        }
        await api.post('/materia-carrera', {
          id_materia, id_carrera: idCarr, semestre: f.semestre ? Number(f.semestre) : null
        }, { skipConfirm: true } as any)
        const createdMsg = existing ? t('subjects.messages.linkCreatedExisting') : t('subjects.messages.createdAndLinked')
          ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `${createdMsg}: ${payload.nombre}` })
      } else {
        const createdMsg = existing ? t('subjects.messages.alreadyExisted') : t('subjects.messages.created')
          ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `${createdMsg}: ${payload.nombre}` })
      }

      setF({ nombre: '', unidades: '5', creditos: '5', id_carrera: '', semestre: '' })
      await load()
    }
    catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      setMsg('❌ ' + (format(e, { entity: 'la materia' }) || t('subjects.errors.createFailed')))
    }
  }

  function askEdit(m: Materia) {
    setEdit({ open: true, id: m.id_materia, nombre: m.nombre, unidades: String(m.unidades), creditos: String(m.creditos) })
  }

  async function askDelete(m: Materia) {
    const title = t('subjects.deleteModal.title')
    const question = t('subjects.deleteModal.question')
    const codeLabel = t('subjects.deleteModal.codeLabel')
    const description = `${question}\n${m.nombre}\n${codeLabel}: ${m.clave ?? '—'}`
    const ok = await confirmService.requestConfirm({
      titleText: title,
      descriptionText: description,
      confirmLabelText: t('subjects.deleteModal.confirmLabel'),
      cancelLabelText: t('confirm.no'),
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/materias/${m.id_materia}`, { skipConfirm: true } as any)
      const msg = t('subjects.messages.deleted')
        ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `${msg}: ${m.nombre}` })
      await load()
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const friendly = format(e, { entity: 'la materia', action: 'delete' })
        ; (await import('../lib/notifyService')).default.notify({ type: 'error', message: friendly })
    }
  }

  /** ===== Importación con anti-duplicados (materia,carrera) ===== **/
  function sheetToRows(sheet: XLSX.WorkSheet) {
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: null })
    return json.map((r) => {
      const nombre = norm(r.nombre ?? '')
      const unidades = Number(r.unidades ?? 5)
      const creditos = Number(r.creditos ?? 5)
      const id_carrera = carreraInputToId(r.carrera ?? r.id_carrera ?? '')
      const semestre = r.semestre != null && r.semestre !== '' ? Number(r.semestre) : null
      return { nombre, unidades, creditos, id_carrera, semestre }
    })
  }

  async function onImport(file: File) {
    setMsg(null)
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error(t('subjects.errors.importNoSheets'))

      let incoming = sheetToRows(sheet).filter(r => !!r.nombre)

      const seen = new Set<string>()
      const uniqueInFile: any[] = []
      const dupInFile: any[] = []
      for (const r of incoming) {
        const k = materiaKey(r.nombre, r.id_carrera ?? 0)
        if (seen.has(k)) dupInFile.push(r)
        else { seen.add(k); uniqueInFile.push(r) }
      }

      const notInUI = uniqueInFile.filter(r => {
        const k = materiaKey(r.nombre, r.id_carrera ?? 0)
        return !existingPairs.has(k)
      })
      const dupVsUI = uniqueInFile.length - notInUI.length

      let dupVsDb = 0
      let filtered = notInUI
      try {
        const pairs = notInUI
          .filter(r => r.id_carrera)
          .map(r => ({ nombre: r.nombre, id_carrera: Number(r.id_carrera) }))
        if (pairs.length) {
          const res = await api.post('/materias/dedup-check', { pairs })
          const existsKeys: string[] = Array.isArray(res?.exists) ? res.exists : []
          const existsSet = new Set(existsKeys)
          filtered = notInUI.filter(r => {
            const k = materiaKey(r.nombre, r.id_carrera ?? 0)
            return !existsSet.has(k)
          })
          dupVsDb = notInUI.length - filtered.length
        }
      } catch {
      }

      const headers = ['nombre', 'unidades', 'creditos', 'id_carrera', 'semestre']
      const dataAoA = [
        headers,
        ...filtered.map(r => [r.nombre, r.unidades, r.creditos, r.id_carrera ?? '', r.semestre ?? ''])
      ]
      const cleanSheet = XLSX.utils.aoa_to_sheet(dataAoA)
      const cleanBook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(cleanBook, cleanSheet, 'MATERIAS_LIMPIAS')
      const out = XLSX.write(cleanBook, { type: 'array', bookType: 'xlsx' })
      const cleanBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fd = new FormData()
      fd.append('file', cleanBlob, `materias_limpias_${Date.now()}.xlsx`)

      const rep = await api.post('/materias/bulk', fd as any)

      const inserted = rep?.summary?.inserted ?? 0
      const errors = rep?.summary?.errors ?? 0

      const parts: string[] = []
      parts.push(t('subjects.import.summaryBase', { inserted, errors }))
      if (dupInFile.length) {
        parts.push(t('subjects.import.duplicatesInFile', { count: dupInFile.length }))
      }
      if (dupVsUI) {
        parts.push(t('subjects.import.duplicatesInUI', { count: dupVsUI }))
      }
      if (dupVsDb) {
        parts.push(t('subjects.import.duplicatesInDb', { count: dupVsDb }))
      }

      ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: parts.join(' | ') })
      await load()
    } catch (err: any) {
      setMsg('❌ ' + (err.message || t('subjects.errors.importFailed')))
    } finally {
      const input = document.querySelector<HTMLInputElement>('input[type=file]')
      if (input) input.value = ''
      setLoading(false)
    }
  }

  /** ===== Resumen por materia para voz ===== **/
  function materiaSummary(m: { clave?: string; nombre: string; carreraTexto: string; unidades: number; creditos: number }) {
    const codePart = m.clave ? `Clave ${m.clave}. ` : ''
    const careerPart = m.carreraTexto && m.carreraTexto !== '—'
      ? `Pertenece a ${m.carreraTexto}. `
      : 'Sin carrera vinculada. '
    const unitsPart = `Tiene ${m.unidades} unidades y ${m.creditos} créditos.`
    return `Materia ${m.nombre}. ${codePart}${careerPart}${unitsPart}`
  }

  /** ===== Render ===== **/
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('subjects.title')}</h2>
          <p className="text-sm text-slate-600">
            {t('subjects.subtitle')}
          </p>
        </div>

        {voiceEnabled && (
          <button
            type="button"
            onClick={() => speak(pageHelpText)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={t('subjects.tts.pageHelpAria', 'Escuchar explicación de la pantalla de materias')}
          >
            <span aria-hidden="true">🔊</span>
            <span>{t('subjects.tts.pageHelpButton', 'Explicar pantalla')}</span>
          </button>
        )}
      </div>

      {/* Formulario crear materia */}
      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-3 shadow-sm grid md:grid-cols-4 gap-3">
        {/* Encabezado del apartado con ayuda de voz */}
        <div className="md:col-span-4 flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700">
            {t('subjects.form.sectionTitle', 'Agregar nueva materia')}
          </span>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(createSectionHelp)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={t('subjects.tts.createSectionHelpAria', 'Escuchar explicación del apartado para crear materias')}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t('subjects.tts.sectionHelpButton', 'Explicar apartado')}</span>
            </button>
          )}
        </div>

        {/* Nombre */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs" htmlFor="materia-nombre" style={{ color: "var(--muted)" }}>
              {nameLabel} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(nameInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={fieldHelpAria(nameLabel)}
              >
                <span aria-hidden="true">🔊</span>
                <span>{fieldHelpButtonLabel}</span>
              </button>
            )}
          </div>
          <input
            id="materia-nombre"
            className="h-10 rounded-xl border px-3 text-sm"
            placeholder={t('subjects.form.namePlaceholder')}
            value={f.nombre}
            aria-required="true"
            aria-label={nameLabel}
            onFocus={() => speak(nameLabel)}
            onChange={e => setF({ ...f, nombre: e.target.value })}
          />
        </div>

        {/* Unidades */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500" htmlFor="materia-unidades">
              {unitsLabel} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(unitsInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={fieldHelpAria(unitsLabel)}
              >
                <span aria-hidden="true">🔊</span>
                <span>{fieldHelpButtonLabel}</span>
              </button>
            )}
          </div>
          <input
            id="materia-unidades"
            className="h-10 rounded-xl border px-3 text-sm"
            type="number"
            min={1}
            max={10}
            placeholder={t('subjects.form.unitsPlaceholder')}
            value={f.unidades}
            aria-required="true"
            aria-label={unitsLabel}
            onFocus={() => speak(unitsLabel)}
            onChange={e => setF({ ...f, unidades: e.target.value })}
          />
        </div>

        {/* Créditos */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500" htmlFor="materia-creditos">
              {creditsLabel} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(creditsInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={fieldHelpAria(creditsLabel)}
              >
                <span aria-hidden="true">🔊</span>
                <span>{fieldHelpButtonLabel}</span>
              </button>
            )}
          </div>
          <input
            id="materia-creditos"
            className="h-10 rounded-xl border px-3 text-sm"
            type="number"
            min={1}
            max={30}
            placeholder={t('subjects.form.creditsPlaceholder')}
            value={f.creditos}
            aria-required="true"
            aria-label={creditsLabel}
            onFocus={() => speak(creditsLabel)}
            onChange={e => setF({ ...f, creditos: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-slate-500" htmlFor="materia-carrera">
            {careerLabel} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(careerInstructions)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={fieldHelpAria(careerLabel)}
            >
              <span aria-hidden="true">🔊</span>
              <span>{fieldHelpButtonLabel}</span>
            </button>
          )}
        </div>

        {/* Carrera */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500" htmlFor="materia-carrera">
              {careerLabel} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(careerInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={fieldHelpAria(careerLabel)}
              >
                <span aria-hidden="true">🔊</span>
                <span>{fieldHelpButtonLabel}</span>
              </button>
            )}
          </div>
          <select
            id="materia-carrera"
            className="h-10 rounded-xl border px-3 text-sm"
            value={f.id_carrera}
            aria-required="true"
            aria-label={careerLabel}
            onFocus={() => speak(careerLabel)}
            onChange={e => setF({ ...f, id_carrera: e.target.value })}
          >
            <option value="">{t('subjects.form.careerPlaceholder')}</option>
            {carreras.map(c => (
              <option key={c.id_carrera} value={c.id_carrera}>
                {c.clave ? `${c.clave} — ` : ''}{getCareerLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Semestre */}
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500" htmlFor="materia-semestre">
              {semesterLabel}
            </label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(semesterInstructions)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={fieldHelpAria(semesterLabel)}
              >
                <span aria-hidden="true">🔊</span>
                <span>{fieldHelpButtonLabel}</span>
              </button>
            )}
          </div>
          <input
            id="materia-semestre"
            className="h-10 rounded-xl border px-3 text-sm"
            placeholder={t('subjects.form.semesterPlaceholder')}
            type="number"
            min={1}
            max={12}
            value={f.semestre}
            aria-label={semesterLabel}
            onFocus={() => speak(semesterLabel)}
            onChange={e => setF({ ...f, semestre: e.target.value })}
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm inline-flex items-center">
            <FiPlus className="mr-2" size={16} />
            {t('subjects.form.submit')}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>

      {/* Listado + Import */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        {/* Encabezado del apartado con ayuda de voz */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold">
            {t('subjects.list.sectionTitle', 'Listado de materias')}
          </h3>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(listSectionHelp)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={t('subjects.tts.listSectionHelpAria', 'Escuchar explicación del apartado de lista de materias')}
            >
              <span aria-hidden="true">🔊</span>
              <span>{t('subjects.tts.sectionHelpButton', 'Explicar apartado')}</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Búsqueda con ícono y ayuda de voz */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <div className="relative flex-1 min-w-0">
              <FiSearch className="absolute left-2 top-2.5" size={14} style={{ color: "var(--muted)" }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t('subjects.search.placeholder')}
                className="w-full h-10 rounded-xl border px-3 text-sm pl-8"
              />
            </div>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(searchHelpText)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={t('subjects.tts.searchHelpAria', 'Escuchar instrucciones del cuadro de búsqueda de materias')}
              >
                <span aria-hidden="true">🔊</span>
                <span>{t('subjects.tts.fieldHelpButton', '¿Cómo buscar?')}</span>
              </button>
            )}
          </div>

          <button
            onClick={downloadTemplateXLSX}
            className="rounded-lg border px-3 py-2 text-sm inline-flex items-center"
          >
            <FiDownload className="mr-2" size={16} />
            {t('subjects.buttons.downloadTemplate')}
          </button>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer inline-flex items-center">
            <FiUpload className="mr-2" size={16} />
            {t('subjects.buttons.importFile')}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>{t('subjects.table.code')}</th>
                <th>{t('subjects.table.name')}</th>
                <th>{t('subjects.table.career')}</th>
                <th>{t('subjects.table.units')}</th>
                <th>{t('subjects.table.credits')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && filasMateriaCarrera.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center">
                    {t('subjects.table.loading')}
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center">
                    {t('subjects.table.empty')}
                  </td>
                </tr>
              ) : list.map(m => {
                const subj = rows.find(r => r.id_materia === m.id_materia)
                const displayName = getSubjectLabel(subj) || m.nombre
                const displayCareer = m.carreraTexto

                return (
                  <tr
                    key={`${m.id_materia}-${m.carreraTexto}`}
                    className="[&>td]:px-3 [&>td]:py-2"
                  >
                    {/* Código */}
                    <td className="font-mono text-xs">
                      <button
                        type="button"
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                        onClick={() => speakCell(t('subjects.table.code'), m.clave ?? 'Sin clave')}
                      >
                        {m.clave ?? '—'}
                      </button>
                    </td>

                    {/* Nombre */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                        onClick={() => speakCell(t('subjects.table.name'), displayName)}
                      >
                        {displayName}
                      </button>
                    </td>

                    {/* Carrera */}
                    <td className="text-slate-600">
                      <button
                        type="button"
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                        onClick={() => speakCell(t('subjects.table.career'), displayCareer)}
                      >
                        {displayCareer}
                      </button>
                    </td>

                    {/* Unidades */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                        onClick={() => speakCell(t('subjects.table.units'), m.unidades)}
                      >
                        {m.unidades}
                      </button>
                    </td>

                    {/* Créditos */}
                    <td>
                      <button
                        type="button"
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                        onClick={() => speakCell(t('subjects.table.credits'), m.creditos)}
                      >
                        {m.creditos}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="flex items-center gap-1">
                      {voiceEnabled && (
                        <button
                          type="button"
                          onClick={() => speak(materiaSummary(m))}
                          className="px-2 py-1.5 text-[11px] inline-flex items-center rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100"
                          aria-label={t('subjects.tts.rowSummaryAria', 'Escuchar resumen de la materia {{name}}', {
                            name: m.nombre,
                          })}
                        >
                          <span aria-hidden="true">🔊</span>
                        </button>
                      )}

                      <button
                        onClick={() => askEdit({ id_materia: m.id_materia, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos } as any)}
                        className="px-3 py-1.5 text-xs inline-flex items-center"
                      >
                        <FiEdit className="mr-2" size={16} />
                        {t('subjects.buttons.edit')}
                      </button>
                      <button
                        onClick={() => askDelete({ id_materia: m.id_materia, nombre: m.nombre, clave: m.clave } as any)}
                        className="px-3 py-1.5 text-xs inline-flex items-center"
                      >
                        <FiTrash2 className="mr-2" size={16} />
                        {t('subjects.buttons.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* global confirmService used instead of local ConfirmModal */}

      {
        edit.open && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={() => setEdit({ open: false })}
          >
            <div
              className="w-full max-w-md rounded-2xl border bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b">
                <div className="text-sm font-semibold">
                  {t('subjects.editModal.title')}
                </div>
              </div>
              <div className="px-4 py-4 grid gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-slate-600" htmlFor="edit-materia-nombre">
                    {t('subjects.editModal.nameLabel')}
                  </label>
                  <input
                    id="edit-materia-nombre"
                    className="h-10 rounded-xl border px-3 text-sm"
                    value={edit.nombre ?? ''}
                    onChange={e => setEdit(s => ({ ...s, nombre: e.target.value }))}
                    onFocus={() => speak(t('subjects.editModal.nameLabel'))}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-slate-600" htmlFor="edit-materia-unidades">
                    {t('subjects.editModal.unitsLabel')}
                  </label>
                  <input
                    id="edit-materia-unidades"
                    type="number"
                    min={1}
                    max={10}
                    className="h-10 rounded-xl border px-3 text-sm"
                    value={edit.unidades ?? ''}
                    onChange={e => setEdit(s => ({ ...s, unidades: e.target.value }))}
                    onFocus={() => speak(t('subjects.editModal.unitsLabel'))}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-slate-600" htmlFor="edit-materia-creditos">
                    {t('subjects.editModal.creditsLabel')}
                  </label>
                  <input
                    id="edit-materia-creditos"
                    type="number"
                    min={1}
                    max={30}
                    className="h-10 rounded-xl border px-3 text-sm"
                    value={edit.creditos ?? ''}
                    onChange={e => setEdit(s => ({ ...s, creditos: e.target.value }))}
                    onFocus={() => speak(t('subjects.editModal.creditsLabel'))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
                <button
                  className="rounded-md border px-3 py-2 text-sm inline-flex items-center"
                  onClick={() => setEdit({ open: false })}
                >
                  <FiArrowLeft className="mr-2" size={16} />
                  {t('subjects.editModal.cancel')}
                </button>
                <button
                  className="rounded-md px-3 py-2 text-sm inline-flex items-center"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-ctr)' }}
                  onClick={async () => {
                    if (!edit.id) return setEdit({ open: false })
                    try {
                      const payload: any = {}
                      if (edit.nombre != null) payload.nombre = norm(edit.nombre)
                      if (edit.unidades != null) payload.unidades = Number(edit.unidades)
                      if (edit.creditos != null) payload.creditos = Number(edit.creditos)
                      // The edit modal itself is the user's confirmation, so call the API directly
                      // Pass `skipConfirm: true` so the central API wrapper doesn't show another confirm modal
                      await api.put(`/materias/${edit.id}`, payload, { skipConfirm: true } as any)
                      const msg = t('subjects.messages.updated')
                        ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `${msg}: ${payload.nombre || ''}` })
                      setEdit({ open: false })
                      await load()
                    } catch (e: any) {
                      const format = (await import('../lib/errorFormatter')).default
                      const friendly = format(e, { entity: 'la materia', action: 'update' }) || t('subjects.errors.updateFailed')
                        ; (await import('../lib/notifyService')).default.notify({ type: 'error', message: friendly })
                    }
                  }}
                >
                  {t('subjects.editModal.save')}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
