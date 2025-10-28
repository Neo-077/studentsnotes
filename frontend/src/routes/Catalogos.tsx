// src/routes/Catalogos.tsx
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import api from "../lib/api"
import { Catalogos } from "../lib/catalogos"

type Docente = {
  id_docente: number
  rfc: string
  nombre: string
  ap_paterno: string
  ap_materno?: string | null
  correo: string
  id_genero?: number | null
  activo?: boolean
}
type Materia = {
  id_materia: number
  nombre: string
  unidades: number
  creditos: number
}

export default function CatalogosPage() {
  // datos
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [generos, setGeneros] = useState<any[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [loadingD, setLoadingD] = useState(false)
  const [loadingM, setLoadingM] = useState(false)
  const [msgD, setMsgD] = useState<string | null>(null)
  const [msgM, setMsgM] = useState<string | null>(null)

  // forms
  const [fDoc, setFDoc] = useState({
    rfc: "",
    nombre: "",
    ap_paterno: "",
    ap_materno: "",
    correo: "",
    id_genero: "" as string | number,
  })
  const [fMat, setFMat] = useState({ nombre: "", unidades: "5", creditos: "5" })
  const [fLink, setFLink] = useState({ id_materia: "", id_carrera: "", semestre: "" })
  const [msgLink, setMsgLink] = useState<string | null>(null)

  // cargar catálogos/base
  async function loadDocentes() {
    setLoadingD(true); setMsgD(null)
    try { setDocentes(await Catalogos.docentes() ?? []) }
    catch (e: any) { setMsgD(e.message || "Error cargando docentes") }
    finally { setLoadingD(false) }
  }

  // ====== vincular materia a carrera ======
  async function onLinkMateriaCarrera(e: React.FormEvent) {
    e.preventDefault()
    setMsgLink(null)
    const payload: any = {
      id_materia: Number(fLink.id_materia),
      id_carrera: Number(fLink.id_carrera),
      semestre: Number(fLink.semestre)
    }
    if (!payload.id_materia || !payload.id_carrera) {
      setMsgLink('Selecciona materia y carrera.')
      return
    }
    if (!Number.isFinite(payload.semestre) || payload.semestre < 1 || payload.semestre > 12) {
      setMsgLink('Ingresa semestre (1-12).')
      return
    }
    try {
      await api.post('/materia-carrera', payload)
      setMsgLink('✅ Vinculación guardada')
      setFLink({ id_materia: '', id_carrera: '', semestre: '' })
    } catch (e: any) {
      setMsgLink('❌ ' + (e.message || 'Error al vincular'))
    }
  }
  async function loadMaterias() {
    setLoadingM(true); setMsgM(null)
    try { setMaterias(await Catalogos.materias() ?? []) }
    catch (e: any) { setMsgM(e.message || "Error cargando materias") }
    finally { setLoadingM(false) }
  }

  useEffect(() => {
    loadDocentes(); loadMaterias()
    Catalogos.generos().then(setGeneros)
    Catalogos.carreras().then(setCarreras)
  }, [])

  // ====== crear docente ======
  async function onCreateDocente(e: React.FormEvent) {
    e.preventDefault()
    setMsgD(null)
    const payload = {
      rfc: fDoc.rfc.trim().toUpperCase(),
      nombre: fDoc.nombre.trim().toUpperCase(),
      ap_paterno: fDoc.ap_paterno.trim().toUpperCase(),
      ap_materno: fDoc.ap_materno.trim() ? fDoc.ap_materno.trim().toUpperCase() : null,
      correo: fDoc.correo.trim().toLowerCase(),
      id_genero: fDoc.id_genero ? Number(fDoc.id_genero) : null,
    }
    if (!payload.rfc || !payload.nombre || !payload.ap_paterno || !payload.correo) {
      setMsgD("Completa RFC, nombre, apellido paterno y correo.")
      return
    }
    try {
      await api.post("/docentes", payload)
      setMsgD("✅ Docente creado")
      setFDoc({ rfc: "", nombre: "", ap_paterno: "", ap_materno: "", correo: "", id_genero: "" })
      await loadDocentes()
    } catch (e: any) {
      setMsgD("❌ " + (e.message || "Error al crear docente"))
    }
  }

  // ====== crear materia ======
  async function onCreateMateria(e: React.FormEvent) {
    e.preventDefault()
    setMsgM(null)
    const payload = {
      nombre: fMat.nombre.trim().toUpperCase(),
      unidades: Number(fMat.unidades || 5),
      creditos: Number(fMat.creditos || 5),
    }
    if (!payload.nombre) {
      setMsgM("Completa el nombre de la materia.")
      return
    }
    try {
      await api.post("/materias", payload)
      setMsgM("✅ Materia creada")
      setFMat({ nombre: "", unidades: "5", creditos: "5" })
      await loadMaterias()
    } catch (e: any) {
      setMsgM("❌ " + (e.message || "Error al crear materia"))
    }
  }

  // ====== import helpers ======
  async function importDocentes(file: File) {
    setMsgD(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error("Archivo vacío")
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const fd = new FormData()
      fd.append("file", blob, file.name)
      const rep = await api.post("/docentes/bulk", fd as any)
      setMsgD(`✅ Importados: ${rep.summary.inserted} / Errores: ${rep.summary.errors}`)
      await loadDocentes()
    } catch (e: any) {
      setMsgD("❌ " + (e.message || "Error importando docentes"))
    }
  }
  async function importMaterias(file: File) {
    setMsgM(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error("Archivo vacío")
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const fd = new FormData()
      fd.append("file", blob, file.name)
      const rep = await api.post("/materias/bulk", fd as any)
      setMsgM(`✅ Importadas: ${rep.summary.inserted} / Errores: ${rep.summary.errors}`)
      await loadMaterias()
    } catch (e: any) {
      setMsgM("❌ " + (e.message || "Error importando materias"))
    }
  }

  function downloadTemplateDocentes() {
    const headers = ["rfc","nombre","ap_paterno","ap_materno","correo","genero"]
    const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = "plantilla_docentes.csv"; a.click(); URL.revokeObjectURL(a.href)
  }
  function downloadTemplateMaterias() {
    const headers = ["nombre","unidades","creditos"]
    const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = "plantilla_materias.csv"; a.click(); URL.revokeObjectURL(a.href)
  }

  // tablas
  const dlist = useMemo(() => docentes, [docentes])
  const mlist = useMemo(() => materias, [materias])

  return (
    <div className="space-y-8">
      {/* ====== DOCENTES ====== */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Docentes</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplateDocentes} className="rounded-lg border px-3 py-2 text-sm">
              Descargar plantilla (CSV)
            </button>
            <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
              Importar (.xlsx/.csv)
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e)=>e.target.files?.[0] && importDocentes(e.target.files[0])} />
            </label>
          </div>
        </div>

        <form onSubmit={onCreateDocente} className="mt-3 grid md:grid-cols-3 gap-3">
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="RFC"
            value={fDoc.rfc} onChange={e=>setFDoc({...fDoc,rfc:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre(s)"
            value={fDoc.nombre} onChange={e=>setFDoc({...fDoc,nombre:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido paterno"
            value={fDoc.ap_paterno} onChange={e=>setFDoc({...fDoc,ap_paterno:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido materno (opcional)"
            value={fDoc.ap_materno} onChange={e=>setFDoc({...fDoc,ap_materno:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Correo"
            value={fDoc.correo} onChange={e=>setFDoc({...fDoc,correo:e.target.value})}/>
          <select className="h-10 rounded-xl border px-3 text-sm"
            value={fDoc.id_genero} onChange={e=>setFDoc({...fDoc,id_genero:e.target.value})}>
            <option value="">Género (opcional)</option>
            {generos.map(g=> <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
          </select>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar docente</button>
            {msgD && <span className="ml-3 text-sm">{msgD}</span>}
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50"><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
              <th>RFC</th><th>Nombre</th><th>Correo</th><th>Género</th></tr></thead>
            <tbody className="divide-y">
              {loadingD ? <tr><td colSpan={4} className="px-3 py-6 text-center">Cargando…</td></tr> :
                dlist.length===0 ? <tr><td colSpan={4} className="px-3 py-6 text-center">Sin docentes.</td></tr> :
                dlist.map(d=>(
                  <tr key={d.id_docente} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono">{d.rfc}</td>
                    <td>{d.nombre} {d.ap_paterno} {d.ap_materno ?? ""}</td>
                    <td>{d.correo}</td>
                    <td>{(generos.find(g=>g.id_genero===d.id_genero)?.descripcion) ?? "—"}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* ====== MATERIAS ====== */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Materias</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplateMaterias} className="rounded-lg border px-3 py-2 text-sm">
              Descargar plantilla (CSV)
            </button>
            <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
              Importar (.xlsx/.csv)
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e)=>e.target.files?.[0] && importMaterias(e.target.files[0])} />
            </label>
          </div>
        </div>

        <form onSubmit={onCreateMateria} className="mt-3 grid md:grid-cols-3 gap-3">
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre"
            value={fMat.nombre} onChange={e=>setFMat({...fMat,nombre:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Unidades" type="number" min={1} max={10}
            value={fMat.unidades} onChange={e=>setFMat({...fMat,unidades:e.target.value})}/>
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Créditos" type="number" min={1} max={30}
            value={fMat.creditos} onChange={e=>setFMat({...fMat,creditos:e.target.value})}/>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar materia</button>
            {msgM && <span className="ml-3 text-sm">{msgM}</span>}
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50"><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
              <th>Nombre</th><th>Unid.</th><th>Créd.</th></tr></thead>
            <tbody className="divide-y">
              {loadingM ? <tr><td colSpan={3} className="px-3 py-6 text-center">Cargando…</td></tr> :
                mlist.length===0 ? <tr><td colSpan={3} className="px-3 py-6 text-center">Sin materias.</td></tr> :
                mlist.map(m=>(
                  <tr key={m.id_materia} className="[&>td]:px-3 [&>td]:py-2">
                    <td>{m.nombre}</td>
                    <td>{m.unidades}</td>
                    <td>{m.creditos}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Vincular materia a carrera */}
        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium">Vincular materia a carrera</h3>
          <form onSubmit={onLinkMateriaCarrera} className="mt-3 grid md:grid-cols-4 gap-3">
            <select className="h-10 rounded-xl border px-3 text-sm"
              value={fLink.id_materia}
              onChange={e=>setFLink({...fLink, id_materia: e.target.value})}>
              <option value="">Materia…</option>
              {mlist.map(m=> <option key={m.id_materia} value={m.id_materia}>{m.nombre}</option>)}
            </select>
            <select className="h-10 rounded-xl border px-3 text-sm"
              value={fLink.id_carrera}
              onChange={e=>setFLink({...fLink, id_carrera: e.target.value})}>
              <option value="">Carrera…</option>
              {carreras.map(c=> <option key={c.id_carrera} value={c.id_carrera}>{c.clave ? `${c.clave} — `: ''}{c.nombre}</option>)}
            </select>
            <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Semestre" type="number" min={1} max={12} required
              value={fLink.semestre} onChange={e=>setFLink({...fLink, semestre: e.target.value})} />
            <div>
              <button className="rounded-lg border px-3 py-2 text-sm">Guardar vinculación</button>
            </div>
          </form>
          {msgLink && <div className="mt-2 text-sm">{msgLink}</div>}
        </div>
      </section>
    </div>
  )
}
