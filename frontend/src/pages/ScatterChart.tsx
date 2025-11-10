import React, { useMemo } from "react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts"

type AlumnoRow = {
  id_inscripcion: number
  estudiante?: {
    nombre?: string
    ap_paterno?: string
    ap_materno?: string
  }
  unidades?: Array<{ unidad: number; calificacion?: number; asistencia?: number }>
}

export default function ScatterChartPage({ alumnos }: { alumnos: AlumnoRow[] }) {
  // Calcular el máximo de asistencias por unidad para convertir a porcentaje
  const maxAsistenciasPorUnidad = useMemo(() => {
    const maxPorUnidad: { [key: number]: number } = {}

    alumnos.forEach((alumno) => {
      alumno.unidades?.forEach((unidad) => {
        const asistencia = Number(unidad.asistencia) || 0
        if (!maxPorUnidad[unidad.unidad] || asistencia > maxPorUnidad[unidad.unidad]) {
          maxPorUnidad[unidad.unidad] = asistencia
        }
      })
    })

    return maxPorUnidad
  }, [alumnos])

  // Preparar datos con porcentajes de asistencia calculados
  const data = useMemo(() => {
    return alumnos
      .map((alumno) => {
        // Calcular promedio de calificaciones
        const calificaciones = (alumno.unidades || [])
          .map((u) => u.calificacion)
          .filter((c) => c !== null && c !== undefined && !isNaN(c as number)) as number[]

        const promedio =
          calificaciones.length > 0
            ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
            : 0

        // Calcular porcentaje promedio de asistencias
        const asistenciasPorcentaje = (alumno.unidades || [])
          .map((u) => {
            const asist = Number(u.asistencia) || 0
            const maxAsist = maxAsistenciasPorUnidad[u.unidad] || 1
            return (asist / maxAsist) * 100
          })
          .filter((p) => !isNaN(p))

        const promedioAsistencia =
          asistenciasPorcentaje.length > 0
            ? asistenciasPorcentaje.reduce((a, b) => a + b, 0) / asistenciasPorcentaje.length
            : 0

        return {
          nombre: `${alumno.estudiante?.nombre || ""} ${alumno.estudiante?.ap_paterno || ""}`.trim(),
          promedio: Math.round(promedio * 100) / 100,
          asistencia: Math.round(promedioAsistencia * 100) / 100,
        }
      })
      .filter((d) => d.promedio > 0 || d.asistencia > 0)
  }, [alumnos, maxAsistenciasPorUnidad])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No hay datos para mostrar</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">
        Dispersión: Asistencia vs Promedio
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="asistencia"
            name="Asistencia"
            stroke="var(--muted)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            domain={[0, 100]}
          >
            <Label
              value="Asistencia (%)"
              position="bottom"
              offset={-10}
              style={{ fill: "var(--text)", fontSize: 14, fontWeight: 600 }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="promedio"
            name="Promedio"
            stroke="var(--muted)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            domain={[0, 100]}
          >
            <Label
              value="Promedio"
              angle={-90}
              position="insideLeft"
              style={{ fill: "var(--text)", fontSize: 14, fontWeight: 600, textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
                      {data.nombre}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Promedio: <span className="font-semibold">{data.promedio}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Asistencia: <span className="font-semibold">{data.asistencia}%</span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
                {value}
              </span>
            )}
          />
          <Scatter
            name="Alumnos"
            data={data}
            fill="#3b82f6"
            fillOpacity={0.6}
            stroke="#2563eb"
            strokeWidth={2}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center italic">
        * El porcentaje de asistencia se calcula basándose en el máximo de asistencias por unidad
      </p>
    </div>
  )
}
