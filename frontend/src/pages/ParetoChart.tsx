// ParetoChart.tsx
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  Legend,
} from 'recharts'
import api from '../lib/api'

type Props = { id_grupo: number }

type Baja = {
  id_baja?: number
  id_inscripcion?: number
  motivo_adicional?: string | null
  motivo?: string | null
}

export default function ParetoChart({ id_grupo }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Trae las inscripciones del grupo (para obtener sus ids)
        const insRes = await api.get(`/inscripciones?grupo_id=${id_grupo}`)
        const insRows = (insRes?.rows ?? insRes?.data?.rows ?? insRes) as any[]
        const ids = new Set<number>((insRows || []).map(r => Number(r?.id_inscripcion)).filter(Boolean))

        if (ids.size === 0) {
          if (alive) {
            setData([])
          }
          return
        }

        // 2) Trae todas las bajas y filtra por los ids de inscripcion del grupo
        const bajasRes = await api.get(`/baja-materia`)
        const bajasRaw = (bajasRes ?? bajasRes?.data ?? bajasRes?.data?.data) as Baja[] | any
        const bajas: Baja[] = Array.isArray(bajasRaw) ? bajasRaw : []

        const rows = bajas.filter(b => ids.has(Number((b as any)?.id_inscripcion)))

        // 3) Agrupar por motivo (normalizado) y contar
        const counts = new Map<string, number>()
        for (const b of rows) {
          const raw = (b.motivo_adicional ?? b.motivo ?? '').toString().trim()
          if (!raw) continue
          const key = normalize(raw)
          counts.set(key, (counts.get(key) || 0) + 1)
        }

        // 4) Orden descendente + % acumulado
        const arr = Array.from(counts.entries())
          .map(([normKey, value]) => ({
            name: prettyMotivo(normKey),
            value,
          }))
          .sort((a, b) => b.value - a.value)

        const total = arr.reduce((s, x) => s + x.value, 0) || 1
        let cum = 0
        const final = arr.map(x => {
          cum += x.value
          return { ...x, cumPct: +(cum / total * 100).toFixed(2) }
        })

        if (alive) setData(final)
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.message || e?.message || 'No se pudo cargar el Pareto')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id_grupo])

  // ---------- helpers ----------
  function normalize(s: string) {
    try {
      return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    } catch {
      // Fallback por si el entorno no soporta \p{Diacritic}
      return s
        .toLowerCase()
        .normalize?.('NFD')
        ?.replace(/[\u0300-\u036f]/g, '') || s.toLowerCase()
    }
  }

  function prettyMotivo(norm: string) {
    const map: Record<string, string> = {
      academico: 'Académico',
      conductual: 'Conductual',
      salud: 'Problemas de salud',
      personal: 'Situación personal/familiar',
      economico: 'Problemas económicos',
      otro: 'Otro',
    }
    // si llega ya bonito, respétalo
    if (map[norm]) return map[norm]
    return norm.replace(/\b\w/g, c => c.toUpperCase())
  }

  // ---------- renders ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" />
          <p className="mt-2 text-gray-600">Cargando datos…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-700">No hay bajas registradas para este grupo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Distribución de Bajas por Motivo</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{ value: 'Porcentaje %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip
                formatter={(value: any, _name: any, payload: any) => {
                  // name mostrado en la leyenda
                  const key = payload?.dataKey
                  if (key === 'cumPct') return [`${value}%`, 'Porcentaje acumulado']
                  return [value, 'Cantidad']
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="value" name="Cantidad" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumPct"
                strokeWidth={2}
                dot={false}
                name="Porcentaje acumulado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
