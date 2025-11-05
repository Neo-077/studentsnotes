// src/routes/Docentes.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import * as XLSX from 'xlsx'
import { Catalogos } from '../lib/catalogos'
import ConfirmModal from '../components/ConfirmModal'

export default function Docentes() {
  type Docente = {
    id_docente: number
    rfc: string
    nombre: string
    ap_paterno: string
    ap_materno?: string | null
    correo: string
    id_genero?: number | null
  }

  // ===== Config =====
  const EMAIL_DOMAIN = 'itt.mx' // ← cambia aquí si lo necesitas

  const [rows, setRows] = useState<Docente[]>([])
  const [generos, setGeneros] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id?: number; nombre?: string; rfc?: string }>(
    { open: false }
  )

  const [edit, setEdit] = useState<{
    open:boolean; id?: number; rfc?: string; nombre?: string; ap_paterno?: string; ap_materno?: string;
    // correo ya NO es editable: se regenera si cambian nombre o ap_paterno
    id_genero?: number | ''
  }>({ open:false })

  // crear (sin correo)
  const [f, setF] = useState({
    rfc: '', nombre: '', ap_paterno: '', ap_materno: '', id_genero: '' as number | string
  })

  /** ========= Helpers ========= **/
  const norm = (s: any) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{Letter}\p{Number}\s.]/gu, '') // limpia símbolos extraños
      .replace(/\s+/g, ' ')
      .trim()

  const normalizeRFC = (s: string) => String(s ?? '').toUpperCase().replace(/\s+/g,'').trim()
  const isValidRFC = (rfc: string) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/.test(normalizeRFC(rfc))

  const takeFirstToken = (s: string) => {
    const t = norm(s).split(' ').filter(Boolean)
    return t[0] || ''
  }
  const onlyLetters = (s: string) => norm(s).replace(/[^a-z0-9. ]/g,'').replace(/\s+/g,'') // tras norm, quitamos espacios

  function buildEmailLocalBase(nombre: string, ap_paterno: string) {
    const first = onlyLetters(takeFirstToken(nombre))
    const last  = onlyLetters(takeFirstToken(ap_paterno))
    const baseLocal = [first, last].filter(Boolean).join('.')
    return baseLocal || 'usuario'
  }

  function emailFromLocal(localPart: string) {
    return `${localPart}@${EMAIL_DOMAIN}`.toLowerCase()
  }

  // Genera un correo único validando contra UI y (opcional) BD
  async function ensureUniqueEmail(baseLocal: string, excludeId?: number): Promise<string> {
    const takenUI = new Set(
      rows
        .filter(d => excludeId ? d.id_docente !== excludeId : true)
        .map(d => d.correo.toLowerCase())
    )
    let i = 0
    const maxAttempts = 100
    while (i < maxAttempts) {
      const candidateLocal = i === 0 ? baseLocal : `${baseLocal}${i+1}` // marco.perez, marco.perez2, ...
      const candidate = emailFromLocal(candidateLocal)
      if (!takenUI.has(candidate)) {
        // pre-chequeo opcional en BD
        try {
          const check = await api.post('/docentes/dedup-check', { correos: [candidate], exclude_id: excludeId })
          const exists = Array.isArray(check?.exists?.correos) && check.exists.correos.includes(candidate)
          if (!exists) return candidate
        } catch {
          // si no existe endpoint, consideramos libre
          return candidate
        }
      }
      i++
    }
    // fallback extremo
    const ts = Date.now().toString().slice(-6)
    return emailFromLocal(`${baseLocal}${ts}`)
  }

  function mapGeneroInputToId(v: any): number | null {
    if (v == null || v === '') return null
    const asNum = Number(v)
    if (!isNaN(asNum)) return asNum
    const byText = generos.find((g:any)=> norm(g.descripcion) === norm(v))
    return byText ? byText.id_genero : null
  }

  /** ========= Data load ========= **/
  const reqRef = useRef(0)
  async function load(silent = false) {
    const myId = ++reqRef.current
    if (!silent) setLoading(true)
    setMsg(null)
    try {
      const [ds, gs] = await Promise.all([Catalogos.docentes(), Catalogos.generos()])
      if (reqRef.current === myId) {
        setRows(ds ?? [])
        setGeneros(gs ?? [])
      }
    } catch (e: any) {
      setMsg(e.message || 'Error cargando docentes')
    } finally {
      if (reqRef.current === myId) {
        if (!silent) setLoading(false)
      }
    }
  }
  useEffect(()=>{ load(false) }, [])

  // refrescar silencioso
  useEffect(()=>{
    const handler = () => load(true)
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') handler() })
    window.addEventListener('online', handler)
    return ()=>{
      window.removeEventListener('focus', handler)
      window.removeEventListener('online', handler)
      document.removeEventListener('visibilitychange', ()=>{})
    }
  }, [])

  useEffect(()=>{
    if (!edit.open) return
    const onKey = (e: KeyboardEvent)=>{ if (e.key === 'Escape') setEdit({ open:false }) }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [edit.open])

  /** ========= Listado + búsqueda ========= **/
  const dlist = useMemo(()=>{
    const list = [...rows]
    const filterFn = (arr: Docente[]) => arr.filter(d =>
      [d.rfc, d.correo, `${d.nombre} ${d.ap_paterno ?? ''} ${d.ap_materno ?? ''}`]
        .join(' ')
        .toLowerCase()
        .includes(q.trim().toLowerCase())
    )
    const base = q.trim() ? filterFn(list) : list
    base.sort((a,b)=> a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})
      || (a.ap_paterno||'').localeCompare(b.ap_paterno||'','es',{sensitivity:'base'})
      || (a.ap_materno||'').localeCompare(b.ap_materno||'','es',{sensitivity:'base'}))
    return base
  }, [rows, q])

  /** ========= Crear (correo auto) ========= **/
  async function onCreate(e: React.FormEvent){
    e.preventDefault(); setMsg(null)

    const payloadBase = {
      rfc: normalizeRFC(f.rfc),
      nombre: f.nombre.trim().toUpperCase(),
      ap_paterno: f.ap_paterno.trim().toUpperCase(),
      ap_materno: f.ap_materno.trim() ? f.ap_materno.trim().toUpperCase() : null,
      id_genero: f.id_genero ? Number(f.id_genero) : null,
    }

    // Reglas mínimas
    if (!payloadBase.rfc || !payloadBase.nombre || !payloadBase.ap_paterno){
      setMsg('Completa RFC, nombre y apellido paterno.')
      return
    }
    if (!isValidRFC(payloadBase.rfc)) { setMsg('RFC inválido. Verifica el formato SAT.'); return }

    // Antiduplicados RFC en memoria
    if (rows.some(d => normalizeRFC(d.rfc) === payloadBase.rfc)) {
      setMsg('Ya existe un docente con ese RFC.')
      return
    }
    // Pre-chequeo opcional RFC
    try {
      const check = await api.post('/docentes/dedup-check', { rfcs: [payloadBase.rfc] })
      if (check?.exists?.rfcs?.length) { setMsg('El RFC ya existe en BD.'); return }
    } catch { /* ignorar si no existe endpoint */ }

    // Generar correo único
    const baseLocal = buildEmailLocalBase(payloadBase.nombre, payloadBase.ap_paterno)
    const correo = await ensureUniqueEmail(baseLocal)

    const payload = { ...payloadBase, correo }

    try {
      await api.post('/docentes', payload)
      setMsg('✅ Docente creado')
      setF({ rfc:'', nombre:'', ap_paterno:'', ap_materno:'', id_genero:'' })
      await load()
    } catch(e:any){
      setMsg('❌ '+(e.message||'Error al crear docente'))
    }
  }

  /** ========= Editar (correo auto si cambian nombre/ap_paterno) ========= **/
  async function onSaveEdit(){
    if (!edit.id) { setEdit({ open:false }); return }
    const upd: any = {}

    if (edit.rfc != null) {
      const rfc = normalizeRFC(edit.rfc)
      if (!isValidRFC(rfc)) { setMsg('RFC inválido.'); return }
      if (rows.some(d => d.id_docente !== edit.id && normalizeRFC(d.rfc) === rfc)) {
        setMsg('Ya existe otro docente con ese RFC.')
        return
      }
      // Chequeo opcional RFC
      try {
        const check = await api.post('/docentes/dedup-check', { rfcs: [rfc], exclude_id: edit.id })
        if (check?.exists?.rfcs?.length) { setMsg('El RFC ya existe en BD.'); return }
      } catch {}
      upd.rfc = rfc
    }

    let willRegenEmail = false
    if (edit.nombre != null) { upd.nombre = edit.nombre.trim().toUpperCase(); willRegenEmail = true }
    if (edit.ap_paterno != null) { upd.ap_paterno = edit.ap_paterno.trim().toUpperCase(); willRegenEmail = true }
    if (edit.ap_materno != null) upd.ap_materno = edit.ap_materno.trim() ? edit.ap_materno.trim().toUpperCase() : null
    if (edit.id_genero !== undefined) upd.id_genero = edit.id_genero === '' ? null : Number(edit.id_genero)

    // Si cambió nombre o ap_paterno → regenerar correo manteniendo unicidad
    if (willRegenEmail) {
      const useNombre = upd.nombre ?? rows.find(r => r.id_docente===edit.id)?.nombre ?? ''
      const useApPat  = upd.ap_paterno ?? rows.find(r => r.id_docente===edit.id)?.ap_paterno ?? ''
      const baseLocal = buildEmailLocalBase(useNombre, useApPat)
      upd.correo = await ensureUniqueEmail(baseLocal, edit.id)
    }

    try{
      await api.put(`/docentes/${edit.id}`, upd)
      setMsg('✅ Docente actualizado')
      setEdit({ open:false })
      await load()
    }catch(e:any){
      setMsg('❌ '+(e.message||'Error actualizando docente'))
    }
  }

  /** ========= Importación (sin columna correo; se genera) ========= **/
  function downloadTemplateXLSX(){
    const headers = ['rfc','nombre','ap_paterno','ap_materno','genero'] // correo eliminado
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const listaGeneros = (generos ?? []).map((g:any) => [g.descripcion, g.id_genero])
    const wsHelp = XLSX.utils.aoa_to_sheet([
      ['LISTAS'],
      [],
      ['Géneros: descripcion','id'],
      ...listaGeneros,
      [],
      ['Instrucciones'],
      ['NO incluyas correo. Se genera automáticamente como nombre.apellido@' + EMAIL_DOMAIN]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, 'DOCENTES')
    XLSX.utils.book_append_sheet(wb, wsHelp, 'LISTAS')
    XLSX.writeFile(wb, 'plantilla_docentes.xlsx')
  }

  function sheetToRows(sheet: XLSX.WorkSheet) {
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: null })
    return json.map((r) => ({
      rfc: normalizeRFC(r.rfc || ''),
      nombre: String(r.nombre ?? '').trim().toUpperCase(),
      ap_paterno: String(r.ap_paterno ?? '').trim().toUpperCase(),
      ap_materno: r.ap_materno ? String(r.ap_materno).trim().toUpperCase() : null,
      id_genero: mapGeneroInputToId(r.genero ?? r.id_genero ?? '')
      // correo no viene; se genera
    }))
  }

  async function onImport(file: File) {
    setMsg(null); setLoading(true)
    try {
      // 1) Leer archivo
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) throw new Error('El archivo no contiene hojas.')
      const ws = wb.Sheets[firstSheetName]

      // 2) Normalizar
      let incoming = sheetToRows(ws)

      // 3) Validación básica fila a fila + limpieza
      const valid: any[] = []
      const invalid: any[] = []
      for (const r of incoming) {
        const errs: string[] = []
        if (!r.rfc) errs.push('RFC faltante')
        if (!r.nombre) errs.push('Nombre faltante')
        if (!r.ap_paterno) errs.push('Apellido paterno faltante')
        if (r.rfc && !isValidRFC(r.rfc)) errs.push('RFC inválido')

        if (errs.length) invalid.push({ ...r, _errors: errs })
        else valid.push(r)
      }

      // 4) Duplicados internos del archivo por RFC
      const seenRFC = new Set<string>()
      const uniqueInFile: any[] = []
      const dupInFile: any[] = []
      for (const r of valid) {
        if (seenRFC.has(r.rfc)) dupInFile.push(r)
        else { seenRFC.add(r.rfc); uniqueInFile.push(r) }
      }

      // 5) Duplicados vs UI (RFC ya cargados)
      const rfcInUI = new Set(rows.map(d => normalizeRFC(d.rfc)))
      const notInUI = uniqueInFile.filter(r => !rfcInUI.has(r.rfc))
      const dupVsUI = uniqueInFile.length - notInUI.length

      // 6) Pre-chequeo opcional en BD (RFC)
      let rfcsInDb: string[] = []
      try {
        const rfcs = notInUI.map((r:any)=> r.rfc)
        if (rfcs.length) {
          const res = await api.post('/docentes/dedup-check', { rfcs })
          rfcsInDb = Array.isArray(res?.exists?.rfcs) ? res.exists.rfcs : []
        }
      } catch { /* continuar */ }

      const notInDb = notInUI.filter(r => !rfcsInDb.includes(r.rfc))
      const dupVsDb = notInUI.length - notInDb.length

      // 7) Generar correos auto, evitando colisiones entre ellos, UI y BD
      //    Primero resolvemos colisiones locales (archivo + UI)
      const takenLocal = new Set<string>(rows.map(r => r.correo.toLowerCase()))
      const prepared: any[] = []
      for (const r of notInDb) {
        const baseLocal = buildEmailLocalBase(r.nombre, r.ap_paterno)
        let i = 0
        while (i < 200) {
          const candidate = emailFromLocal(i===0 ? baseLocal : `${baseLocal}${i+1}`)
          if (!takenLocal.has(candidate)) {
            takenLocal.add(candidate)
            prepared.push({ ...r, correo: candidate })
            break
          }
          i++
        }
        if (i >= 200) {
          // fallback exagerado
          prepared.push({ ...r, correo: emailFromLocal(`${baseLocal}${Date.now().toString().slice(-6)}`) })
        }
      }

      // 7b) Chequeo opcional de correos en BD (en lote)
      try {
        const correos = prepared.map(p => p.correo)
        if (correos.length) {
          const res = await api.post('/docentes/dedup-check', { correos })
          const mailsInDb = Array.isArray(res?.exists?.correos) ? new Set(res.exists.correos.map((m:string)=>m.toLowerCase())) : new Set()
          if (mailsInDb.size) {
            // re-asignar los que chocaron con BD
            for (const p of prepared) {
              if (mailsInDb.has(p.correo.toLowerCase())) {
                const baseLocal = p.correo.split('@')[0].replace(/\d+$/,'') // quita sufijo numérico si hay
                let j = 0
                while (j < 200) {
                  const candidate = emailFromLocal(j===0 ? baseLocal : `${baseLocal}${j+1}`)
                  if (!takenLocal.has(candidate) && !mailsInDb.has(candidate.toLowerCase())) {
                    takenLocal.add(candidate)
                    p.correo = candidate
                    break
                  }
                  j++
                }
              }
            }
          }
        }
      } catch { /* si no existe endpoint, seguimos */ }

      // 8) XLSX limpio (ahora sí incluye correo generado)
      const headers = ['rfc','nombre','ap_paterno','ap_materno','id_genero','correo']
      const dataAoA = [
        headers,
        ...prepared.map((r:any)=> [r.rfc, r.nombre, r.ap_paterno, r.ap_materno, r.id_genero, r.correo])
      ]
      const cleanSheet = XLSX.utils.aoa_to_sheet(dataAoA)
      const cleanBook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(cleanBook, cleanSheet, 'DOCENTES_LIMPIOS')
      const out = XLSX.write(cleanBook, { type: 'array', bookType: 'xlsx' })
      const cleanBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fd = new FormData()
      fd.append('file', cleanBlob, `docentes_limpios_${Date.now()}.xlsx`)

      const report = await api.post('/docentes/bulk', fd as any)

      const inserted = report?.summary?.inserted ?? 0
      const errors = report?.summary?.errors ?? 0

      setMsg(
        `✅ Importación: ${inserted} insertados, ${errors} errores` +
        (invalid.length ? ` | Inválidos: ${invalid.length}` : '') +
        (dupInFile.length ? ` | Duplicados en archivo (RFC): ${dupInFile.length}` : '') +
        (dupVsUI ? ` | Ya existían en lista (RFC): ${dupVsUI}` : '') +
        (dupVsDb ? ` | Ya existían en BD (RFC): ${dupVsDb}` : '')
      )
      await load()
    } catch (err:any) {
      setMsg('❌ '+(err.message || 'Error importando docentes'))
    } finally {
      const input = document.querySelector<HTMLInputElement>('input[type=file]')
      if (input) input.value = ''
      setLoading(false)
    }
  }

  /** ========= Acciones de fila ========= **/
  function askDelete(d: Docente){
    setConfirmDel({
      open: true, id: d.id_docente,
      nombre: `${d.nombre} ${d.ap_paterno ?? ''} ${d.ap_materno ?? ''}`.trim(),
      rfc: d.rfc
    })
  }
  function askEdit(d: Docente){
    setEdit({
      open:true, id: d.id_docente, rfc: d.rfc, nombre: d.nombre,
      ap_paterno: d.ap_paterno, ap_materno: d.ap_materno ?? '',
      id_genero: d.id_genero ?? ''
    })
  }
  async function confirmDelete(){
    if (!confirmDel.id){ setConfirmDel({ open:false }); return }
    try{
      await api.delete(`/docentes/${confirmDel.id}`)
      setConfirmDel({ open:false })
      await load()
      setMsg('✅ Docente eliminado')
    } catch(e:any){
      setMsg('❌ '+(e.message||'Error eliminando docente'))
    }
  }

  /** ========= Render ========= **/
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Docentes</h2>
          <p className="text-sm text-slate-600">Alta, listado, búsqueda e importación de docentes. El correo se genera automáticamente.</p>
        </div>
      </div>

      {/* Crear (sin correo) */}
      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-3 shadow-sm grid md:grid-cols-3 gap-3">
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="RFC"
               value={f.rfc} onChange={e=>setF({...f, rfc:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre(s)"
               value={f.nombre} onChange={e=>setF({...f, nombre:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido paterno"
               value={f.ap_paterno} onChange={e=>setF({...f, ap_paterno:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido materno (opcional)"
               value={f.ap_materno} onChange={e=>setF({...f, ap_materno:e.target.value})} />
        <select className="h-10 rounded-xl border px-3 text-sm md:col-span-1" value={f.id_genero}
                onChange={e=>setF({...f, id_genero:e.target.value})}>
          <option value="">Género (opcional)</option>
          {generos.map((g:any)=> <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
        </select>

        {/* Vista previa del correo generado */}
        <div className="md:col-span-3 text-xs text-slate-600">
          Correo (auto): {
            emailFromLocal(
              buildEmailLocalBase(f.nombre, f.ap_paterno)
            )
          }
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar docente</button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>

      {/* Listado + Import */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar (RFC, nombre, correo)" className="h-10 flex-1 min-w-[220px] rounded-xl border px-3 text-sm"/>
          <button onClick={downloadTemplateXLSX} className="rounded-lg border px-3 py-2 text-sm">Descargar plantilla (XLSX)</button>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            Importar (.xlsx/.csv)
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e)=> e.target.files?.[0] && onImport(e.target.files[0])}/>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>RFC</th><th>Nombre</th><th>Apellido paterno</th><th>Apellido materno</th><th>Correo</th><th>Género</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length===0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center">Cargando…</td></tr>
              ) : dlist.length===0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center">Sin docentes.</td></tr>
              ) : dlist.map(d => (
                <tr key={d.id_docente} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="font-mono">{d.rfc}</td>
                  <td>{d.nombre}</td>
                  <td>{d.ap_paterno ?? '—'}</td>
                  <td>{d.ap_materno ?? '—'}</td>
                  <td>{d.correo}</td>
                  <td>{(generos.find(g => g.id_genero===d.id_genero)?.descripcion) ?? '—'}</td>
                  <td className="text-right flex items-center gap-2 justify-end">
                    <button onClick={()=> askEdit(d)} className="px-3 py-1.5 text-xs">Editar</button>
                    <button onClick={()=> askDelete(d)} className="px-3 py-1.5 text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal eliminar */}
      <ConfirmModal
        open={confirmDel.open}
        title="Eliminar docente"
        subtitle="Esta acción no se puede deshacer"
        confirmLabel="Eliminar"
        danger
        onCancel={()=> setConfirmDel({ open:false })}
        onConfirm={confirmDelete}
      >
        <div className="space-y-2 text-sm">
          <div>¿Deseas eliminar al siguiente docente?</div>
          <div className="rounded-lg border bg-slate-50 px-3 py-2">
            <div className="font-medium">{confirmDel.nombre}</div>
            <div className="text-slate-600">RFC: {confirmDel.rfc}</div>
          </div>
        </div>
      </ConfirmModal>

      {/* Modal editar (correo no editable; se regenera si cambian nombre/ap_paterno) */}
      {edit.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={()=> setEdit({ open:false })}>
          <div className="w-full max-w-xl rounded-2xl border bg-white shadow-lg" onClick={(e)=> e.stopPropagation()}>
            <div className="px-4 py-3 border-b"><div className="text-sm font-semibold">Editar docente</div></div>
            <div className="px-4 py-4 grid md:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">RFC</label>
                <input className="h-10 rounded-xl border px-3 text-sm" value={edit.rfc ?? ''} onChange={e=> setEdit(s=>({...s, rfc:e.target.value}))} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">Nombre</label>
                <input className="h-10 rounded-xl border px-3 text-sm" value={edit.nombre ?? ''} onChange={e=> setEdit(s=>({...s, nombre:e.target.value}))} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">Apellido paterno</label>
                <input className="h-10 rounded-xl border px-3 text-sm" value={edit.ap_paterno ?? ''} onChange={e=> setEdit(s=>({...s, ap_paterno:e.target.value}))} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-slate-600">Apellido materno</label>
                <input className="h-10 rounded-xl border px-3 text-sm" value={edit.ap_materno ?? ''} onChange={e=> setEdit(s=>({...s, ap_materno:e.target.value}))} />
              </div>

              <div className="grid gap-1 md:col-span-2">
                <label className="text-xs text-slate-600">Correo (auto)</label>
                <input className="h-10 rounded-xl border px-3 text-sm" disabled
                  value={emailFromLocal(buildEmailLocalBase(edit.nombre ?? '', edit.ap_paterno ?? ''))} />
                <div className="text-[11px] text-slate-500 mt-1">
                  Se actualizará automáticamente si cambias el nombre o apellido paterno y se garantizará unicidad.
                </div>
              </div>

              <div className="grid gap-1 md:col-span-2">
                <label className="text-xs text-slate-600">Género</label>
                <select className="h-10 rounded-xl border px-3 text-sm" value={edit.id_genero ?? ''} onChange={e=> setEdit(s=>({...s, id_genero: e.target.value ? Number(e.target.value) : ''}))}>
                  <option value="">Sin especificar</option>
                  {generos.map((g:any)=> <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
              <button className="rounded-md border px-3 py-2 text-sm" onClick={()=> setEdit({ open:false })}>Cancelar</button>
              <button className="rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-ctr)' }}
                onClick={onSaveEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
