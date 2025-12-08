import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useAccessibility } from '../store/useAccessibility'

// Definición de tipos
type PuntoDatos = {
  semestre: number
  calificacion: string
  asistencia: string
}

type SerieDatos = {
  sem: string
  avg: number
  center: number
  UCL: number
  LCL: number
}

function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name)
    const trimmed = value.trim()
    return trimmed || fallback
  } catch {
    return fallback
  }
}

export default function ControlChart({ promedio }: { promedio: PuntoDatos[] }) {
  const { t, i18n } = useTranslation()
  const { customColorsEnabled, customTextColor, customPrimaryColor, customBgColor } = useAccessibility()
  const [series, setSeries] = useState<SerieDatos[]>([])

  // Colores dinámicos del tema - usa variables CSS o colores personalizados
  const chartTextColor = customColorsEnabled ? customTextColor : getCssVar('--text', '#1e293b')
  const chartPrimaryColor = customColorsEnabled ? customPrimaryColor : getCssVar('--primary', '#3b82f6')
  const chartBgColor = customColorsEnabled ? customBgColor : getCssVar('--card', '#ffffff')
  const chartGridColor = getCssVar('--border', '#e2e8f0')
  const chartMutedColor = getCssVar('--muted', '#64748b')

  useEffect(() => {
    if (!promedio || !promedio.length) {
      setSeries([])
      return
    }

    const datosTransformados = promedio
      .sort((a, b) => a.semestre - b.semestre)
      .map((item) => ({
        sem: `U${item.semestre}`,
        avg: parseFloat(item.calificacion) || 0,
        asistencia: parseFloat(item.asistencia) || 0,
      }))

    const total = datosTransformados.reduce((sum, item) => sum + item.avg, 0)
    const center = total / Math.max(datosTransformados.length, 1)
    const UCL = center + 10
    const LCL = Math.max(center - 10, 0)

    const seriesActualizadas = datosTransformados.map((item) => ({
      ...item,
      center: +center.toFixed(2),
      UCL: +UCL.toFixed(2),
      LCL: +LCL.toFixed(2),
    }))

    setSeries(seriesActualizadas)
  }, [promedio])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-3 rounded-lg shadow-lg border"
          style={{
            backgroundColor: chartBgColor,
            borderColor: chartGridColor,
            color: chartTextColor
          }}
        >
          {payload.map((item: any, index: number) => (
            <div key={index} className="mb-1">
              <p className="font-semibold" style={{ color: chartTextColor }}>
                {item.dataKey === 'avg' && t('classGroupDetail.charts.controlTooltipAvg')}
                {item.dataKey === 'center' && t('classGroupDetail.charts.controlTooltipCenter')}
                {item.dataKey === 'UCL' && t('classGroupDetail.charts.controlTooltipUCL')}
                {item.dataKey === 'LCL' && t('classGroupDetail.charts.controlTooltipLCL')}
              </p>
              <p className="text-sm" style={{ color: item.color }}>
                <span className="font-bold">{Number(item.value).toFixed(2)}</span>
              </p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (!promedio || promedio.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-1" style={{ color: chartTextColor }}>
            {t('classGroupDetail.charts.controlTitle')}
          </h3>
          <p className="text-sm" style={{ color: chartMutedColor }}>
            {t('classGroupDetail.charts.controlSubtitle')}
          </p>
        </div>
        <div
          className="h-96 p-4 rounded-xl border shadow-sm flex items-center justify-center"
          style={{
            backgroundColor: chartBgColor,
            borderColor: chartGridColor
          }}
        >
          <div className="text-center">
            <p style={{ color: chartMutedColor }}>
              {t('classGroupDetail.charts.controlNoDataTitle')}
            </p>
            <p className="text-sm mt-1" style={{ color: chartMutedColor, opacity: 0.7 }}>
              {t('classGroupDetail.charts.controlNoDataSubtitle')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: chartBgColor, borderColor: chartGridColor }}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={series} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={chartPrimaryColor} stopOpacity={1} />
              <stop offset="100%" stopColor={chartPrimaryColor} stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            dataKey="sem"
            tick={{ fill: chartTextColor, fontSize: 12 }}
            axisLine={{ stroke: chartTextColor }}
            tickLine={{ stroke: chartTextColor }}
            label={{
              value: t('classGroupDetail.charts.controlXAxisLabel'),
              position: 'insideBottom',
              offset: -5,
              style: { fill: chartTextColor, fontSize: 12 },
            }}
          />
          <YAxis
            tick={{ fill: chartTextColor, fontSize: 12 }}
            axisLine={{ stroke: chartTextColor }}
            tickLine={{ stroke: chartTextColor }}
            domain={[0, 100]}
            label={{
              value: t('classGroupDetail.charts.controlYAxisLabel'),
              angle: -90,
              position: 'insideLeft',
              style: { fill: chartTextColor, fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={series[0]?.center}
            label={{
              value: t('classGroupDetail.charts.controlRefCenterLabel'),
              position: 'top',
              style: { fill: chartTextColor, fontSize: 11 },
            }}
            stroke={chartPrimaryColor}
            strokeDasharray="3 3"
            strokeWidth={2}
          />
          <ReferenceLine
            y={series[0]?.UCL}
            label={{
              value: t('classGroupDetail.charts.controlRefUCLLabel'),
              position: 'top',
              style: { fill: chartTextColor, fontSize: 11 },
            }}
            stroke={chartPrimaryColor}
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
          <ReferenceLine
            y={series[0]?.LCL}
            label={{
              value: t('classGroupDetail.charts.controlRefLCLLabel'),
              position: 'bottom',
              style: { fill: chartTextColor, fontSize: 11 },
            }}
            stroke={chartPrimaryColor}
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name={t('classGroupDetail.charts.controlLegendAvg')}
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={{ r: 5, fill: chartPrimaryColor, strokeWidth: 2, stroke: chartBgColor }}
            activeDot={{ r: 7, fill: chartPrimaryColor, strokeWidth: 2, stroke: chartBgColor }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="line" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}