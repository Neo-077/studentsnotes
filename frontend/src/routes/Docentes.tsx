import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import * as XLSX from 'xlsx'
import { Catalogos } from '../lib/catalogos'
import ConfirmModal from '../components/ConfirmModal'

export default function Docentes() {
  type Docente = { id_docente: number; rfc: string; nombre: string; ap_paterno: string; ap_materno?: string | null; correo: string; id_genero?: number | null }
  const [rows, setRows] = useState<Docente[]>([])
  const [generos, setGeneros] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id?: number; nombre?: string; rfc?: string }>( { open: false } )
  const [edit, setEdit] = useState<{ open:boolean; id?: number; rfc?: string; nombre?: string; ap_paterno?: string; ap_materno?: string; correo?: string; id_genero?: number | '' }>({ open:false })

  // crear
  const [f, setF] = useState({ rfc: '', nombre: '', ap_paterno: '', ap_materno: '', correo: '', id_genero: '' as number | string })

  const reqRef = useRef(0)
  async function load(silent = false) {
    const myId = ++reqRef.current
    if (!silent) setLoading(true)
    setMsg(null)
    try {
      const [ds, gs] = await Promise.all([Catalogos.docentes(), Catalogos.generos()])
      setRows(ds ?? [])
      setGeneros(gs ?? [])
    } catch (e: any) {
      setMsg(e.message || 'Error cargando docentes')
    } finally {
      if (reqRef.current === myId) {
        if (!silent) setLoading(false)
      }
    }
  }
  useEffect(()=>{ load(false) }, [])

  // Al volver de background/enfocar/reconectar: refrescar sin bloquear UI si ya hay datos
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

  function downloadTemplateXLSX(){
    const headers = ['rfc','nombre','ap_paterno','ap_materno','correo','genero']
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const listaGeneros = (generos ?? []).map((g:any) => [g.descripcion, g.id_genero])
    const wsHelp = XLSX.utils.aoa_to_sheet([
      ['LISTAS'],
      [],
      ['Géneros: descripcion','id'],
      ...listaGeneros,
      [],
      ['Instrucciones'],
      ['Usa las descripciones tal cual aparecen en LISTAS o el id.']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, 'DOCENTES')
    XLSX.utils.book_append_sheet(wb, wsHelp, 'LISTAS')
    XLSX.writeFile(wb, 'plantilla_docentes.xlsx')
  }

  const dlist = useMemo(()=>{
    const list = [...rows]
    const filterFn = (arr: Docente[]) => arr.filter(d => [d.rfc, d.correo, `${d.nombre} ${d.ap_paterno ?? ''} ${d.ap_materno ?? ''}`].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
    const base = q.trim() ? filterFn(list) : list
    base.sort((a,b)=> a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})
      || (a.ap_paterno||'').localeCompare(b.ap_paterno||'','es',{sensitivity:'base'})
      || (a.ap_materno||'').localeCompare(b.ap_materno||'','es',{sensitivity:'base'}))
    return base
  }, [rows, q])

  async function onCreate(e: React.FormEvent){
    e.preventDefault(); setMsg(null)
    const payload = {
      rfc: f.rfc.trim().toUpperCase(),
      nombre: f.nombre.trim().toUpperCase(),
      ap_paterno: f.ap_paterno.trim().toUpperCase(),
      ap_materno: f.ap_materno.trim() ? f.ap_materno.trim().toUpperCase() : null,
      correo: f.correo.trim().toLowerCase(),
      id_genero: f.id_genero ? Number(f.id_genero) : null,
    }
    if (!payload.rfc || !payload.nombre || !payload.ap_paterno || !payload.correo){ setMsg('Completa RFC, nombre, apellido paterno y correo.'); return }
    try { await api.post('/docentes', payload); setMsg('✅ Docente creado'); setF({ rfc:'', nombre:'', ap_paterno:'', ap_materno:'', correo:'', id_genero:'' }); await load() }
    catch(e:any){ setMsg('❌ '+(e.message||'Error al crear docente')) }
  }

  function askDelete(d: Docente){
    setConfirmDel({ open: true, id: d.id_docente, nombre: `${d.nombre} ${d.ap_paterno ?? ''} ${d.ap_materno ?? ''}`.trim(), rfc: d.rfc })
  }
  function askEdit(d: Docente){
    setEdit({ open:true, id: d.id_docente, rfc: d.rfc, nombre: d.nombre, ap_paterno: d.ap_paterno, ap_materno: d.ap_materno ?? '', correo: d.correo, id_genero: d.id_genero ?? '' })
  }
  async function confirmDelete(){
    if (!confirmDel.id){ setConfirmDel({ open:false }); return }
    try{ await api.delete(`/docentes/${confirmDel.id}`); setConfirmDel({ open:false }); await load(); setMsg('✅ Docente eliminado') }
    catch(e:any){ setMsg('❌ '+(e.message||'Error eliminando docente')) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Docentes</h2>
          <p className="text-sm text-slate-600">Alta, listado, búsqueda e importación de docentes.</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-3 shadow-sm grid md:grid-cols-3 gap-3">
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="RFC" value={f.rfc} onChange={e=>setF({...f, rfc:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre(s)" value={f.nombre} onChange={e=>setF({...f, nombre:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido paterno" value={f.ap_paterno} onChange={e=>setF({...f, ap_paterno:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido materno (opcional)" value={f.ap_materno} onChange={e=>setF({...f, ap_materno:e.target.value})} />
        <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Correo" value={f.correo} onChange={e=>setF({...f, correo:e.target.value})} />
        <select className="h-10 rounded-xl border px-3 text-sm" value={f.id_genero} onChange={e=>setF({...f, id_genero:e.target.value})}>
          <option value="">Género (opcional)</option>
          {generos.map((g:any)=> <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
        </select>
        <div className="md:col-span-3 flex items-center gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar docente</button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar (RFC, nombre, correo)" className="h-10 flex-1 min-w-[220px] rounded-xl border px-3 text-sm"/>
          <button onClick={downloadTemplateXLSX} className="rounded-lg border px-3 py-2 text-sm">Descargar plantilla (XLSX)</button>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            Importar (.xlsx/.csv)
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=> e.target.files?.[0] && (async (file)=>{ const fd=new FormData(); fd.append('file', file, file.name); try{ const rep=await api.post('/docentes/bulk', fd as any); setMsg(`✅ Importados: ${rep.summary.inserted} / Errores: ${rep.summary.errors}`); await load() }catch(err:any){ setMsg('❌ '+(err.message||'Error importando docentes')) } })(e.target.files[0]) }/>
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
                <label className="text-xs text-slate-600">Correo</label>
                <input className="h-10 rounded-xl border px-3 text-sm" type="email" value={edit.correo ?? ''} onChange={e=> setEdit(s=>({...s, correo:e.target.value}))} />
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
              <button className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-ctr)' }} onClick={async ()=>{
                if (!edit.id) return setEdit({ open:false })
                try{
                  const payload:any = {}
                  if (edit.rfc!=null) payload.rfc = edit.rfc
                  if (edit.nombre!=null) payload.nombre = edit.nombre
                  if (edit.ap_paterno!=null) payload.ap_paterno = edit.ap_paterno
                  if (edit.ap_materno!=null) payload.ap_materno = edit.ap_materno
                  if (edit.correo!=null) payload.correo = edit.correo
                  if (edit.id_genero!==undefined) payload.id_genero = edit.id_genero === '' ? null : edit.id_genero
                  await api.put(`/docentes/${edit.id}`, payload)
                  setMsg('✅ Docente actualizado')
                  setEdit({ open:false })
                  await load()
                }catch(e:any){ setMsg('❌ '+(e.message||'Error actualizando docente')) }
              }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
