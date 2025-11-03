import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabaseClient"

type Props = { groupId: number | null }

type Estudiante = {
  id_estudiante: number
  no_control: string
  nombre: string
  ap_paterno: string | null
  ap_materno: string | null
}

type Inscrito = {
  id_inscripcion: number
  estudiante: Estudiante
}

export default function QuickEnroll({ groupId }: Props) {
  const [noControl, setNoControl] = useState("")
  const [match, setMatch] = useState<Estudiante | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [inscritos, setInscritos] = useState<Inscrito[]>([])
  const [err, setErr] = useState<string | null>(null)

  const groupReady = useMemo(() => !!groupId, [groupId])

  // Buscar estudiante por número de control (al soltar tecla con pequeño delay)
  useEffect(() => {
    const h = setTimeout(async () => {
      setErr(null)
      if (!noControl) return setMatch(null)
      const { data, error } = await supabase
        .from("estudiante")
        .select("id_estudiante,no_control,nombre,ap_paterno,ap_materno")
        .ilike("no_control", `${noControl}%`)
        .limit(1)
        .maybeSingle()
      if (error) { setErr(error.message); setMatch(null); return }
      setMatch(data ?? null)
    }, 220)
    return () => clearTimeout(h)
  }, [noControl])

  // Cargar lista de inscritos del grupo
  async function loadInscritos() {
    if (!groupId) { setInscritos([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from("inscripcion")
      .select(`
        id_inscripcion,
        estudiante:estudiante ( id_estudiante,no_control,nombre,ap_paterno,ap_materno )
      `)
      .eq("id_grupo", groupId)
      .order("id_inscripcion", { ascending: false })
    setLoading(false)
    if (error) { setErr(error.message); setInscritos([]); return }
    setInscritos((data as any) ?? [])
  }

  useEffect(() => { loadInscritos() }, [groupId])

  async function inscribir() {
    if (!groupId || !match) return
    setBusy(true); setErr(null)
    const { error } = await supabase
      .from("inscripcion")
      .insert({ id_grupo: groupId, id_estudiante: match.id_estudiante })
    setBusy(false)
    if (error) {
      // conficto por duplicado u otra RLS
      setErr(error.message)
      return
    }
    setNoControl("")
    setMatch(null)
    await loadInscritos()
  }

  async function desinscribir(id_inscripcion: number) {
    setBusy(true); setErr(null)
    const { error } = await supabase.from("inscripcion").delete().eq("id_inscripcion", id_inscripcion)
    setBusy(false)
    if (error) { setErr(error.message); return }
    await loadInscritos()
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Inscribir en grupo</h3>
        {!groupReady && <p className="text-xs text-slate-500">Selecciona un grupo a la izquierda.</p>}
      </div>

      {/* Campo de número de control */}
      <div className="grid gap-2">
        <label className="text-xs text-slate-500">Número de control</label>
        <div className="flex gap-2">
          <input
            value={noControl}
            onChange={(e) => setNoControl(e.target.value.trim())}
            onKeyDown={(e) => { if (e.key === "Enter") inscribir() }}
            className="h-10 flex-1 rounded-xl border px-3 text-sm"
            placeholder="Ej. 20190001"
            disabled={!groupReady || busy}
          />
          <button
            onClick={inscribir}
            disabled={!groupReady || !match || busy}
            className="h-10 rounded-lg bg-blue-600 px-4 text-white text-sm disabled:opacity-50"
            title={match ? "Inscribir" : "Escribe un número de control válido"}
          >
            {busy ? "Inscribiendo…" : "Inscribir"}
          </button>
        </div>

        {/* Resultado del lookup */}
        <div className="min-h-[20px] text-xs">
          {err && <span className="text-red-600">{err}</span>}
          {!err && match && (
            <span className="text-slate-600">
              {match.no_control} — {match.nombre} {match.ap_paterno ?? ""} {match.ap_materno ?? ""}
            </span>
          )}
          {!err && !match && noControl && (
            <span className="text-slate-400">No se encontró estudiante.</span>
          )}
        </div>
      </div>

      {/* Lista de inscritos */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Inscritos</h4>
          {loading && <span className="text-xs text-slate-400">Cargando…</span>}
        </div>
        <div className="mt-2 space-y-2 max-h-72 overflow-auto pr-1">
          {inscritos.map((i) => (
            <div key={i.id_inscripcion} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">{i.estudiante.nombre} {i.estudiante.ap_paterno ?? ""} {i.estudiante.ap_materno ?? ""}</div>
                <div className="text-xs text-slate-500">{i.estudiante.no_control}</div>
              </div>
              <button
                onClick={() => desinscribir(i.id_inscripcion)}
                className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50"
              >
                Quitar
              </button>
            </div>
          ))}
          {inscritos.length === 0 && !loading && (
            <div className="text-xs text-slate-500">Aún no hay inscritos en este grupo.</div>
          )}
        </div>
      </div>
    </div>
  )
}
