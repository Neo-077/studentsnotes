import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Counts = {
  total: number
  aprobados: number
  reprobados: number
  desertores: number
}

export default function KPIGrid() {
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    aprobados: 0,
    reprobados: 0,
    desertores: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Cargar conteos desde Supabase
  async function loadCounts() {
    setLoading(true)
    setError(null)
    try {
      // total de estudiantes
      const totalQuery = supabase.from('estudiante').select('id_estudiante', { count: 'exact', head: true })

      // aprobados, reprobados, desertores: desde inscripcion (relación 1:N)
      const aprobadosQuery = supabase
        .from('inscripcion')
        .select('id_inscripcion', { count: 'exact', head: true })
        .eq('estado', 'Aprobado')

      const reprobadosQuery = supabase
        .from('inscripcion')
        .select('id_inscripcion', { count: 'exact', head: true })
        .eq('estado', 'Reprobado')

      const desertoresQuery = supabase
        .from('inscripcion')
        .select('id_inscripcion', { count: 'exact', head: true })
        .or('estado.eq.Desertor,desertor.eq.true')

      const [total, aprobados, reprobados, desertores] = await Promise.all([
        totalQuery,
        aprobadosQuery,
        reprobadosQuery,
        desertoresQuery,
      ])

      setCounts({
        total: total.count ?? 0,
        aprobados: aprobados.count ?? 0,
        reprobados: reprobados.count ?? 0,
        desertores: desertores.count ?? 0,
      })
    } catch (err: any) {
      setError(err.message || 'Error al cargar KPIs')
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial
  useEffect(() => {
    loadCounts()
  }, [])

  // 🔁 Suscripción en tiempo real a cambios de inscripcion
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_inscripciones')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inscripcion' },
        () => loadCounts()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // KPIs calculados
  const reprobacionPromedio = useMemo(() => {
    if (counts.total === 0) return 0
    return Math.round((counts.reprobados / counts.total) * 100)
  }, [counts])

  const desercionEstimada = useMemo(() => {
    if (counts.total === 0) return 0
    return Math.round((counts.desertores / counts.total) * 100)
  }, [counts])

  return (
    <section className="bg-white border rounded-xl shadow p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Resumen general</h3>
          <p className="text-xs text-gray-500">KPIs del periodo</p>
        </div>
        {loading && <span className="text-xs text-gray-400">Cargando…</span>}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi label="Total estudiantes" value={counts.total} loading={loading} />
        <Kpi label="Reprobación promedio" value={`${reprobacionPromedio}%`} loading={loading} />
        <Kpi label="Deserción estimada" value={`${desercionEstimada}%`} loading={loading} />
      </div>
    </section>
  )
}

/* ——— Subcomponentes UI ——— */
function Kpi({
  label,
  value,
  loading,
}: {
  label: string
  value: number | string
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">
        {loading ? <Skeleton w="5rem" /> : value}
      </div>
    </div>
  )
}

function Skeleton({ w = '100%', h = '1rem' }: { w?: string; h?: string }) {
  return (
    <span className="inline-block animate-pulse rounded bg-gray-200" style={{ width: w, height: h }} />
  )
}
