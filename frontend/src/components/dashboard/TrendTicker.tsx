import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Counts = {
  total: number
  aprobados: number
  reprobados: number
  desertores: number
}

export default function TrendTicker() {
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    aprobados: 0,
    reprobados: 0,
    desertores: 0,
  })
  const [loading, setLoading] = useState(true)

  async function recompute() {
    // Total viene de 'estudiante'
    const totalQ = supabase
      .from('estudiante')
      .select('id_estudiante', { count: 'exact', head: true })

    // Estados vienen de 'inscripcion'
    const aprobadosQ = supabase
      .from('inscripcion')
      .select('id_inscripcion', { count: 'exact', head: true })
      .eq('estado', 'Aprobado')

    const reprobadosQ = supabase
      .from('inscripcion')
      .select('id_inscripcion', { count: 'exact', head: true })
      .eq('estado', 'Reprobado')

    const desertoresQ = supabase
      .from('inscripcion')
      .select('id_inscripcion', { count: 'exact', head: true })
      .or('estado.eq.Desertor,desertor.eq.true')

    const [t, a, r, d] = await Promise.all([totalQ, aprobadosQ, reprobadosQ, desertoresQ])

    setCounts({
      total: t.count ?? 0,
      aprobados: a.count ?? 0,
      reprobados: r.count ?? 0,
      desertores: d.count ?? 0,
    })
  }

  // Carga inicial
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await recompute()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Realtime: cualquier cambio en 'inscripcion' dispara recompute()
  useEffect(() => {
    const channel = supabase
      .channel('trend-inscripcion-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inscripcion' },
        () => recompute()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const pct = (n: number) => (counts.total > 0 ? Math.round((n / counts.total) * 100) : 0)

  const items = useMemo(
    () => [
      { label: 'Aprobados', value: counts.aprobados, pct: pct(counts.aprobados) },
      { label: 'Reprobados', value: counts.reprobados, pct: pct(counts.reprobados) },
      { label: 'Deserción', value: counts.desertores, pct: pct(counts.desertores) },
    ],
    [counts]
  )

  return (
    <div className="rounded-xl border bg-white p-3 overflow-hidden">
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span className="font-medium">Tendencias</span>
        <span className="text-gray-400">•</span>
        {loading ? (
          <span className="text-gray-400">Cargando…</span>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {items.map((it) => (
              <span key={it.label} className="inline-flex items-center gap-1">
                <span className="font-medium">{it.label}:</span>
                <span className="tabular-nums">{it.value}</span>
                <span className="text-gray-400">({it.pct}%)</span>
              </span>
            ))}
            <span className="text-gray-400">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="font-medium">Total:</span>
              <span className="tabular-nums">{counts.total}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
