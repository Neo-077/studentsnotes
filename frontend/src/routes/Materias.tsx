// src/routes/Materias.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import { Catalogos } from '../lib/catalogos'
import * as XLSX from 'xlsx'
import confirmService from '../lib/confirmService'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiSave, FiEdit, FiTrash2, FiDownload, FiUpload, FiSearch, FiFilter, FiArrowLeft } from 'react-icons/fi'

export default function Materias() {
  type Materia = { id_materia: number; clave?: string; nombre: string; unidades: number; creditos: number }
  type RelMC = { id_materia: number; id_carrera: number; semestre: number | null; carrera?: { nombre: string; clave?: string } }

  const { t } = useTranslation()

  const [rows, setRows] = useState<Materia[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [relaciones, setRelaciones] = useState<RelMC[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id?: number; nombre?: string; clave?: string }>({ open: false })
  const [edit, setEdit] = useState<{ open: boolean; id?: number; nombre?: string; unidades?: string; creditos?: string }>({ open: false })

  // crear
  const [f, setF] = useState({ nombre: '', unidades: '5', creditos: '5', id_carrera: '', semestre: '' })

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

  // Pairs existentes (materia,carrera) actuales en UI:
  const existingPairs = useMemo(() => {
    const set = new Set<string>()
    for (const r of relaciones) {
      const mat = rows.find(m => m.id_materia === r.id_materia)
      if (!mat) continue
      set.add(materiaKey(mat.nombre, r.id_carrera))
    }
    return set
  }, [relaciones, rows])

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
    const listaCarreras = (carreras ?? []).map((c: any) => [c.nombre, c.clave ?? '', c.id_carrera])
    const listaMaterias = (rows ?? []).map((m: any) => [m.nombre, m.clave ?? '', m.id_materia])
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
    const map = new Map<number, Array<{ nombreCarrera: string; clave?: string; semestre: number | null }>>()
    for (const r of relaciones) {
      const arr = map.get(r.id_materia) || []
      arr.push({ nombreCarrera: r.carrera?.nombre || '', clave: r.carrera?.clave, semestre: r.semestre ?? null })
      map.set(r.id_materia, arr)
    }
    const rowsOut: Array<{ id_materia: number; clave?: string; nombre: string; unidades: number; creditos: number; carreraTexto: string }> = []
    for (const m of rows) {
      const rels = map.get(m.id_materia) || []
      if (rels.length === 0) {
        rowsOut.push({ id_materia: m.id_materia, clave: m.clave, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos, carreraTexto: '—' })
      } else {
        for (const c of rels) {
          const label = `${c.clave ? `${c.clave} — ` : ''}${c.nombreCarrera}${c.semestre ? ` · S${c.semestre}` : ''}`
          rowsOut.push({ id_materia: m.id_materia, clave: m.clave, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos, carreraTexto: label })
        }
      }
    }
    // ordenar por nombre y luego por carrera
    rowsOut.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.carreraTexto.localeCompare(b.carreraTexto, 'es', { sensitivity: 'base' }))
    return rowsOut
  }, [rows, relaciones])

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

    // Si existe materia con ese nombre, reutilizamos
    const existing = (rows || []).find(m => norm(m.nombre) === payload.nombre)

    // Validar duplicado (materia,carrera) siempre que haya carrera (ahora obligatoria)
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
          // fallback: recargar y buscar por nombre
          const latest = (await Catalogos.materias()) ?? []
          const found = latest.find((m: any) => norm(m.nombre) === payload.nombre)
          id_materia = found?.id_materia
        }
      }

      // Crear vínculo materia-carrera (ahora la carrera es obligatoria)
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
    // close any local confirm state (defensive)
    setConfirmDel({ open: false })
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
      // user-friendly toast
      const msg = t('subjects.messages.deleted')
        ; (await import('../lib/notifyService')).default.notify({ type: 'success', message: `${msg}: ${m.nombre}` })
      await load()
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const msg = format(e, { entity: 'la materia', action: 'delete' })
        ; (await import('../lib/notifyService')).default.notify({ type: 'error', message: msg })
    }
  }

  /** ===== Importación con anti-duplicados (materia,carrera) ===== **/
  function sheetToRows(sheet: XLSX.WorkSheet) {
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: null })
    // Normalizamos y resolvemos 'carrera' a id
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

      // 1) Normalizar y descartar vacíos
      let incoming = sheetToRows(sheet).filter(r => !!r.nombre)

      // 2) Quitar duplicados DENTRO DEL ARCHIVO por (materia,carrera)
      const seen = new Set<string>()
      const uniqueInFile: any[] = []
      const dupInFile: any[] = []
      for (const r of incoming) {
        const k = materiaKey(r.nombre, r.id_carrera ?? 0)
        if (seen.has(k)) dupInFile.push(r)
        else { seen.add(k); uniqueInFile.push(r) }
      }

      // 3) Quitar los que YA EXISTEN en UI por (materia,carrera)
      const notInUI = uniqueInFile.filter(r => {
        const k = materiaKey(r.nombre, r.id_carrera ?? 0)
        return !existingPairs.has(k)
      })
      const dupVsUI = uniqueInFile.length - notInUI.length

      // 4) (Opcional) Pre-chequeo en servidor para pares existentes
      let dupVsDb = 0
      let filtered = notInUI
      try {
        const pairs = notInUI
          .filter(r => r.id_carrera) // solo chequear si tiene carrera
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
        // si no existe endpoint, continuamos
      }

      // 5) Generar XLSX limpio SOLO con filas finales
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

      // 6) Subir a tu endpoint bulk
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
      </div>

      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-3 shadow-sm grid md:grid-cols-4 gap-3">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">{t('subjects.form.nameLabel')} <span className="text-red-500" aria-hidden="true">*</span></label>
          <input
            className="h-10 rounded-xl border px-3 text-sm"
            placeholder={t('subjects.form.namePlaceholder')}
            value={f.nombre}
            aria-required="true"
            onChange={e => setF({ ...f, nombre: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">{t('subjects.form.unitsLabel')} <span className="text-red-500" aria-hidden="true">*</span></label>
          <input
            className="h-10 rounded-xl border px-3 text-sm"
            type="number"
            min={1}
            max={10}
            placeholder={t('subjects.form.unitsPlaceholder')}
            value={f.unidades}
            aria-required="true"
            onChange={e => setF({ ...f, unidades: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">{t('subjects.form.creditsLabel')} <span className="text-red-500" aria-hidden="true">*</span></label>
          <input
            className="h-10 rounded-xl border px-3 text-sm"
            type="number"
            min={1}
            max={30}
            placeholder={t('subjects.form.creditsPlaceholder')}
            value={f.creditos}
            aria-required="true"
            onChange={e => setF({ ...f, creditos: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">{t('subjects.form.careerLabel')} <span className="text-red-500" aria-hidden="true">*</span></label>
          <select
            className="h-10 rounded-xl border px-3 text-sm"
            value={f.id_carrera}
            aria-required="true"
            onChange={e => setF({ ...f, id_carrera: e.target.value })}
          >
            <option value="">{t('subjects.form.careerPlaceholder')}</option>
            {carreras.map(c => (
              <option key={c.id_carrera} value={c.id_carrera}>
                {c.clave ? `${c.clave} — ` : ''}{c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">{t('subjects.form.semesterLabel')}</label>
          <input
            className="h-10 rounded-xl border px-3 text-sm"
            placeholder={t('subjects.form.semesterPlaceholder')}
            type="number"
            min={1}
            max={12}
            value={f.semestre}
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

      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('subjects.search.placeholder')}
            className="h-10 flex-1 min-w-[220px] rounded-xl border px-3 text-sm"
          />
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
              ) : list.map(m => (
                <tr key={`${m.id_materia}-${m.carreraTexto}`} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="font-mono text-xs">{m.clave ?? '—'}</td>
                  <td>{m.nombre}</td>
                  <td className="text-slate-600">{m.carreraTexto}</td>
                  <td>{m.unidades}</td>
                  <td>{m.creditos}</td>
                  <td className="text-right flex items-center gap-2 justify-end">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* global confirmService used instead of local ConfirmModal */}

      {edit.open && (
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
                <label className="text-xs text-slate-600">
                  {t('subjects.editModal.nameLabel')}
                </label>
                <input
                  className="h-10 rounded-xl border px-3 text-sm"
                  value={edit.nombre ?? ''}
                  onChange={e => setEdit(s => ({ ...s, nombre: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">
                  {t('subjects.editModal.unitsLabel')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="h-10 rounded-xl border px-3 text-sm"
                  value={edit.unidades ?? ''}
                  onChange={e => setEdit(s => ({ ...s, unidades: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">
                  {t('subjects.editModal.creditsLabel')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="h-10 rounded-xl border px-3 text-sm"
                  value={edit.creditos ?? ''}
                  onChange={e => setEdit(s => ({ ...s, creditos: e.target.value }))}
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
                    await api.put(`/materias/${edit.id}`, payload, { skipConfirm: true })
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