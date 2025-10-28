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
  clave?: string
  nombre: string
  unidades: number
  creditos: number
}

export default function CatalogosPage() {
  // datos
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [relaciones, setRelaciones] = useState<
    Array<{ id_materia: number; id_carrera: number; semestre: number | null; carrera?: { nombre: string; clave?: string } }>
  >([])
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
    try { setDocentes((await Catalogos.docentes()) ?? []) }
    catch (e: any) { setMsgD(e.message || "Error cargando docentes") }
    finally { setLoadingD(false) }
  }

  async function loadMaterias() {
    setLoadingM(true); setMsgM(null)
    try {
      const [mats, rels] = await Promise.all([Catalogos.materias(), api.get("/materia-carrera")])
      setMaterias(mats ?? [])
      setRelaciones(Array.isArray(rels) ? rels : [])
    } catch (e: any) {
      setMsgM(e.message || "Error cargando materias")
    } finally {
      setLoadingM(false)
    }
  }

  useEffect(() => {
    loadDocentes(); loadMaterias()
    Catalogos.generos().then(setGeneros)
    Catalogos.carreras().then(setCarreras)
  }, [])

  // crear docente
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

  // crear materia
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

  // vincular materia-carrera
  async function onLinkMateriaCarrera(e: React.FormEvent) {
    e.preventDefault()
    setMsgLink(null)
    const payload: any = {
      id_materia: Number(fLink.id_materia),
      id_carrera: Number(fLink.id_carrera),
      semestre: Number(fLink.semestre)
    }
    if (!payload.id_materia || !payload.id_carrera) {
      setMsgLink("Selecciona materia y carrera.")
      return
    }
    if (!Number.isFinite(payload.semestre) || payload.semestre < 1 || payload.semestre > 12) {
      setMsgLink("Ingresa semestre (1-12).")
      return
    }
    try {
      await api.post("/materia-carrera", payload)
      setMsgLink("✅ Vinculación guardada")
      setFLink({ id_materia: "", id_carrera: "", semestre: "" })
      await loadMaterias()
    } catch (e: any) {
      setMsgLink("❌ " + (e.message || "Error al vincular"))
    }
  }

  // import helpers
  async function importDocentes(file: File) {
    setMsgD(null)
    try {
      const fd = new FormData()
      fd.append("file", file, file.name)
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
      const fd = new FormData()
      fd.append("file", file, file.name)
      const rep = await api.post("/materias/bulk", fd as any)
      setMsgM(`✅ Importadas: ${rep.summary.inserted} / Errores: ${rep.summary.errors}`)
      await loadMaterias()
    } catch (e: any) {
      setMsgM("❌ " + (e.message || "Error importando materias"))
    }
  }

  // plantillas
  function downloadTemplateDocentes() {
    const headers = ["rfc", "nombre", "ap_paterno", "ap_materno", "correo", "genero"]
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const listaGeneros = (generos ?? []).map((g: any) => [g.descripcion, g.id_genero])
    const wsHelp = XLSX.utils.aoa_to_sheet([
      ["LISTAS"],
      [],
      ["Géneros: descripcion", "id"],
      ...listaGeneros,
      [],
      ["Instrucciones"],
      ["Usa las descripciones tal cual aparecen en LISTAS. El backend mapea genero por descripcion."]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, "DOCENTES")
    XLSX.utils.book_append_sheet(wb, wsHelp, "LISTAS")
    XLSX.writeFile(wb, "plantilla_docentes.xlsx")
  }

  function downloadTemplateMaterias() {
    const headers = ["nombre", "unidades", "creditos", "carrera", "semestre"]
    const wsMain = XLSX.utils.aoa_to_sheet([headers])
    const listaCarreras = (carreras ?? []).map((c: any) => [c.nombre, c.clave ?? "", c.id_carrera])
    const listaMaterias = (materias ?? []).map((m: any) => [m.nombre, m.clave ?? "", m.id_materia])
    const wsHelp = XLSX.utils.aoa_to_sheet([
      ["LISTAS"],
      [],
      ["Carreras: nombre", "clave", "id"],
      ...listaCarreras,
      [],
      ["Materias: nombre", "clave", "id"],
      ...listaMaterias,
      [],
      ["Instrucciones"],
      ["Las columnas obligatorias son: nombre, unidades, creditos."],
      ["'carrera' es opcional y puede ser: id numérico, clave (ej. ISC, ARQ) o nombre exacto."],
      ["'semestre' es opcional (1-12). Si envías 'carrera' y 'semestre', se crea el vínculo materia_carrera automáticamente."],
      ["La 'clave' de la materia se autogenera; no incluyas esta columna en el archivo."]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsMain, "MATERIAS")
    XLSX.utils.book_append_sheet(wb, wsHelp, "LISTAS")
    XLSX.writeFile(wb, "plantilla_materias.xlsx")
  }

  // tablas y vistas derivadas
  const dlist = useMemo(() => {
    const list = [...docentes]
    const key = (d: any) => `${d.nombre || ""} ${d.ap_paterno || ""} ${d.ap_materno || ""}`.trim()
    list.sort((a, b) => key(a).localeCompare(key(b), "es", { sensitivity: "base" }))
    return list
  }, [docentes])

  const mlist = useMemo(() => materias, [materias])

  // Opciones únicas por nombre de materia (evita mostrar duplicadas al haber clones por carrera)
  const opcionesMateriaUnicas = useMemo(() => {
    const map = new Map<string, Materia>()
    for (const m of materias) {
      const key = m.nombre.trim().toUpperCase()
      if (!map.has(key)) map.set(key, m)
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }, [materias])

  const carrerasPorMateria = useMemo(() => {
    const map = new Map<number, Array<{ nombre: string; clave?: string; semestre: number | null }>>()
    for (const r of relaciones) {
      const arr = map.get(r.id_materia) || []
      arr.push({ nombre: r.carrera?.nombre || "", clave: r.carrera?.clave, semestre: r.semestre ?? null })
      map.set(r.id_materia, arr)
    }
    return map
  }, [relaciones])

  // fila por vínculo materia-carrera
  const filasMateriaCarrera = useMemo(() => {
    const rows: Array<{ clave?: string; nombre: string; unidades: number; creditos: number; carreraTexto: string; id_materia: number }> = []
    for (const m of mlist) {
      const rels = carrerasPorMateria.get(m.id_materia) || []
      if (rels.length === 0) {
        rows.push({ id_materia: m.id_materia, clave: (m as any).clave, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos, carreraTexto: "—" })
      } else {
        for (const c of rels) {
          const label = `${c.clave ? `${c.clave} — ` : ""}${c.nombre}${c.semestre ? ` · S${c.semestre}` : ""}`
          rows.push({ id_materia: m.id_materia, clave: (m as any).clave, nombre: m.nombre, unidades: m.unidades, creditos: m.creditos, carreraTexto: label })
        }
      }
    }
    rows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }) || a.carreraTexto.localeCompare(b.carreraTexto, "es", { sensitivity: "base" }))
    return rows
  }, [mlist, carrerasPorMateria])

  return (
    <div className="space-y-8">
      {/* ====== DOCENTES ====== */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold">Docentes</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplateDocentes} className="rounded-lg border px-3 py-2 text-sm">Descargar plantilla (XLSX)</button>
            <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
              Importar (.xlsx/.csv)
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && importDocentes(e.target.files[0])} />
            </label>
          </div>
        </div>

        <form onSubmit={onCreateDocente} className="mt-3 grid md:grid-cols-3 gap-3">
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="RFC" value={fDoc.rfc} onChange={(e) => setFDoc({ ...fDoc, rfc: e.target.value })} />
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre(s)" value={fDoc.nombre} onChange={(e) => setFDoc({ ...fDoc, nombre: e.target.value })} />
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido paterno" value={fDoc.ap_paterno} onChange={(e) => setFDoc({ ...fDoc, ap_paterno: e.target.value })} />
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Apellido materno (opcional)" value={fDoc.ap_materno} onChange={(e) => setFDoc({ ...fDoc, ap_materno: e.target.value })} />
          <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Correo" value={fDoc.correo} onChange={(e) => setFDoc({ ...fDoc, correo: e.target.value })} />
          <select className="h-10 rounded-xl border px-3 text-sm" value={fDoc.id_genero} onChange={(e) => setFDoc({ ...fDoc, id_genero: e.target.value })}>
            <option value="">Género (opcional)</option>
            {generos.map((g) => <option key={g.id_genero} value={g.id_genero}>{g.descripcion}</option>)}
          </select>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar docente</button>
            {msgD && <span className="ml-3 text-sm">{msgD}</span>}
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>RFC</th><th>Nombre</th><th>Correo</th><th>Género</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingD ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center">Cargando…</td></tr>
              ) : dlist.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center">Sin docentes.</td></tr>
              ) : (
                dlist.map((d) => (
                  <tr key={d.id_docente} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono">{d.rfc}</td>
                    <td>{d.nombre} {d.ap_paterno} {d.ap_materno ?? ""}</td>
                    <td>{d.correo}</td>
                    <td>{(generos.find((g) => g.id_genero === d.id_genero)?.descripcion) ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====== MATERIAS ====== */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold">Materias</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplateMaterias} className="rounded-lg border px-3 py-2 text-sm">Descargar plantilla (XLSX)</button>
            <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
              Importar (.xlsx/.csv)
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && importMaterias(e.target.files[0])} />
            </label>
          </div>
        </div>

        <form onSubmit={onCreateMateria} className="mt-3 grid md:grid-cols-3 gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-slate-500">Nombre de la materia</label>
            <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Nombre" value={fMat.nombre} onChange={(e) => setFMat({ ...fMat, nombre: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-slate-500">Unidades (1–10)</label>
            <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Unidades" type="number" min={1} max={10} value={fMat.unidades} onChange={(e) => setFMat({ ...fMat, unidades: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-slate-500">Créditos (1–30)</label>
            <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Créditos" type="number" min={1} max={30} value={fMat.creditos} onChange={(e) => setFMat({ ...fMat, creditos: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm">Guardar materia</button>
            {msgM && <span className="ml-3 text-sm">{msgM}</span>}
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left text-slate-600">
                <th>Clave</th><th>Nombre</th><th>Carrera</th><th>Unid.</th><th>Créd.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingM ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center">Cargando…</td></tr>
              ) : filasMateriaCarrera.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center">Sin materias.</td></tr>
              ) : (
                filasMateriaCarrera.map((r, idx) => (
                  <tr key={`${r.id_materia}-${idx}`} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono text-xs">{r.clave ?? "—"}</td>
                    <td>{r.nombre}</td>
                    <td className="text-slate-600">{r.carreraTexto}</td>
                    <td>{r.unidades}</td>
                    <td>{r.creditos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium">Vincular materia a carrera</h3>
          <form onSubmit={onLinkMateriaCarrera} className="mt-3 grid md:grid-cols-4 gap-3">
            <select className="h-10 rounded-xl border px-3 text-sm" value={fLink.id_materia} onChange={(e) => setFLink({ ...fLink, id_materia: e.target.value })}>
              <option value="">Materia…</option>
              {opcionesMateriaUnicas.map((m) => (
                <option key={m.id_materia} value={m.id_materia}>{m.nombre}</option>
              ))}
            </select>
            <select className="h-10 rounded-xl border px-3 text-sm" required value={fLink.id_carrera} onChange={(e) => setFLink({ ...fLink, id_carrera: e.target.value })}>
              <option value="">Carrera…</option>
              {carreras.map((c) => <option key={c.id_carrera} value={c.id_carrera}>{c.clave ? `${c.clave} — ` : ""}{c.nombre}</option>)}
            </select>
            <input className="h-10 rounded-xl border px-3 text-sm" placeholder="Semestre" type="number" min={1} max={12} required value={fLink.semestre} onChange={(e) => setFLink({ ...fLink, semestre: e.target.value })} />
            <div>
              <button className="rounded-lg border px-3 py-2 text-sm" disabled={!fLink.id_materia || !fLink.id_carrera || !fLink.semestre}>Guardar vinculación</button>
            </div>
          </form>
          {msgLink && <div className="mt-2 text-sm">{msgLink}</div>}
        </div>
      </section>
    </div>
  )
}