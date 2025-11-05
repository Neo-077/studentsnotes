import { useEffect, useState } from 'react'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { isDark } from '../lib/theme'

export default function ScatterChartPage({ alumnos }: { alumnos: any }) {
  const [points, setPoints] = useState<any[]>([])
  const darkMode = isDark()

  useEffect(() => {
    const data = (alumnos || []).map((alumno: any) => {
      const asistencia = Number(alumno.asistencia) || 0
      const promedio = Number(alumno.promedio) || 0
      const nombre = `${alumno?.estudiante?.nombre || ''} ${alumno?.estudiante?.ap_paterno || ''}`.trim()

      // Determinar color según rendimiento
      let color = '#3b82f6' // azul por defecto
      if (promedio >= 70 && asistencia >= 85) {
        color = '#10b981' // verde - aprobado
      } else if (promedio < 70 || asistencia < 85) {
        color = '#ef4444' // rojo - riesgo
      }

      return {
        x: asistencia,
        y: promedio,
        name: nombre,
        color
      }
    })
    setPoints(data)
  }, [alumnos])

  const gridColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#e2e8f0'
  const textColor = darkMode ? '#B7C7D9' : '#64748b'
  const axisLineColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#cbd5e1'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-[var(--card)] p-3 rounded-lg shadow-lg border border-slate-200 dark:border-[var(--border)]">
          <p className="font-semibold text-slate-900 dark:text-[var(--text)] mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-600 dark:text-[var(--muted)]">
              <span className="font-medium">Asistencia:</span> <span className="font-bold text-blue-600">{data.x.toFixed(1)}%</span>
            </p>
            <p className="text-slate-600 dark:text-[var(--muted)]">
              <span className="font-medium">Promedio:</span> <span className="font-bold text-blue-600">{data.y.toFixed(1)}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (!alumnos || alumnos.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Asistencia vs Promedio</h3>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Dispersión de estudiantes</p>
        </div>
        <div className="h-80 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 dark:text-[var(--muted)]">No hay datos disponibles</p>
            <p className="text-sm text-slate-400 dark:text-[var(--muted)] mt-1">No hay estudiantes activos en este grupo</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Asistencia vs Promedio</h3>
        <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Dispersión de estudiantes activos</p>
      </div>
      <div className="h-80 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="scatterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Asistencia"
              unit="%"
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              label={{ value: 'Asistencia (%)', position: 'insideBottom', offset: -5, style: { fill: textColor, fontSize: 12 } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Promedio"
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              label={{ value: 'Promedio', angle: -90, position: 'insideLeft', style: { fill: textColor, fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={points}
              fill="#3b82f6"
              shape="circle"
            >
              {points.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Aprobado (≥70 y ≥85%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Regular</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>En riesgo</span>
        </div>
      </div>
    </div>
  )
}
