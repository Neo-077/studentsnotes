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
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useAccessibility } from '../store/useAccessibility'

type Props = { id_grupo: number }

type Baja = {
  id_baja?: number
  id_inscripcion?: number
  motivo_adicional?: string | null
  motivo?: string | null
}

export default function ParetoChart({ id_grupo }: Props) {
  const { t, i18n } = useTranslation()
  const { customColorsEnabled, customTextColor, customPrimaryColor, customBgColor } = useAccessibility()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Colores dinámicos del tema
  const chartTextColor = customColorsEnabled ? customTextColor : '#000000'
  const chartPrimaryColor = customColorsEnabled ? customPrimaryColor : '#63C1CA'
  const chartBgColor = customColorsEnabled ? customBgColor : '#FFFFFF'
  const chartGridColor = customColorsEnabled ? customTextColor : '#CCCCCC'

  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoading(true)
          setError(null)

          // 1) Trae las inscripciones del grupo (para obtener sus ids)
          let insPath = `/inscripciones?grupo_id=${id_grupo}`
          if (i18n?.language && String(i18n.language).startsWith('en')) insPath += '&lang=en'
          const insRes = await api.get(insPath)
          const insRows = (insRes?.rows ?? (insRes as any)?.data?.rows ?? insRes) as any[]
          const ids = new Set<number>((insRows || []).map(r => Number(r?.id_inscripcion)).filter(Boolean))

          if (ids.size === 0) {
            if (alive) {
              setData([])
            }
            return
          }

          // 2) Trae todas las bajas y filtra por los ids de inscripcion del grupo
          let bajasPath = `/baja-materia`
          if (i18n?.language && String(i18n.language).startsWith('en')) bajasPath += '?lang=en'
          const bajasRes = await api.get(bajasPath)
          const bajasRaw = (bajasRes ?? (bajasRes as any)?.data ?? (bajasRes as any)?.data?.data) as Baja[] | any
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
          if (alive) {
            setError(e?.response?.data?.message || e?.message || t('classGroupDetail.charts.paretoError'))
          }
        } finally {
          if (alive) setLoading(false)
        }
      })()
    return () => {
      alive = false
    }
  }, [id_grupo, t, i18n?.language])

  // ---------- helpers ----------
  function normalize(s: string) {
    try {
      return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    } catch {
      // Fallback por si el entorno no soporta \p{Diacritic}
      return (
        s
          .toLowerCase()
          .normalize?.('NFD')
          ?.replace(/[\u0300-\u036f]/g, '') || s.toLowerCase()
      )
    }
  }

  function prettyMotivo(norm: string) {
    const key = norm.trim()

    // Intentar mapear a razones ya definidas en el i18n (students.dropModal.reasons.*)
    const knownKeys = ['academico', 'conductual', 'salud', 'personal', 'economico', 'otro']
    if (knownKeys.includes(key)) {
      return t(`students.dropModal.reasons.${key}`)
    }

    // Si llega ya bonito o no hay traducción definida, capitalizar palabras
    return key.replace(/\b\w/g, c => c.toUpperCase())
  }

  // ---------- renders ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" />
          <p className="mt-2 text-gray-600">
            {t('classGroupDetail.charts.paretoLoading')}
          </p>
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
        <p className="text-sm text-yellow-700">
          {t('classGroupDetail.charts.paretoEmpty')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: chartTextColor }}>
        {t('classGroupDetail.charts.paretoMainTitle')}
      </h2>
      <div className="p-4 rounded-lg shadow" style={{ backgroundColor: chartBgColor }}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" stroke={chartTextColor} />
              <YAxis
                yAxisId="left"
                stroke={chartTextColor}
                label={{
                  value: t('classGroupDetail.charts.paretoYAxisLeft'),
                  angle: -90,
                  position: 'insideLeft',
                  fill: chartTextColor,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke={chartTextColor}
                label={{
                  value: t('classGroupDetail.charts.paretoYAxisRight'),
                  angle: 90,
                  position: 'insideRight',
                  fill: chartTextColor,
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: chartBgColor, borderColor: chartTextColor, color: chartTextColor }}
                formatter={(value: any, _name: any, payload: any) => {
                  const key = payload?.dataKey
                  if (key === 'cumPct') {
                    return [
                      `${value}%`,
                      t('classGroupDetail.charts.paretoTooltipAccumLabel'),
                    ]
                  }
                  return [value, t('classGroupDetail.charts.paretoTooltipValueLabel')]
                }}
              />
              <Legend wrapperStyle={{ color: chartTextColor }} />
              <Bar
                yAxisId="left"
                dataKey="value"
                name={t('classGroupDetail.charts.paretoBarName')}
                fill={chartPrimaryColor}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumPct"
                strokeWidth={2}
                dot={false}
                stroke={chartPrimaryColor}
                name={t('classGroupDetail.charts.paretoLineName')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}