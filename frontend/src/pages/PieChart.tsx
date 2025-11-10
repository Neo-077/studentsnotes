import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type GrupoResumen = {
  total?: number;
  aprobados?: number;
  reprobados?: number;
  [k: string]: any;
};

type AlumnoRow = {
  id_inscripcion: number;
  status?: string;
  unidades?: Array<{ unidad: number; calificacion?: number; asistencia?: number }>;
};

export default function PieChartPage({
  grupo,
  alumnos
}: {
  grupo: GrupoResumen
  alumnos?: AlumnoRow[]
}) {
  // Calcular aprobados y reprobados dinámicamente desde los datos de alumnos
  const { aprobados, reprobados, total } = useMemo(() => {
    if (!alumnos || alumnos.length === 0) {
      return {
        aprobados: grupo?.aprobados ?? 0,
        reprobados: grupo?.reprobados ?? 0,
        total: grupo?.total ?? 0
      }
    }

    // Filtrar solo alumnos activos (no BAJA)
    const alumnosActivos = alumnos.filter((alumno) => {
      const status = String(alumno?.status ?? "ACTIVA").toUpperCase()
      return status !== "BAJA"
    })

    let aprobadosCount = 0
    let reprobadosCount = 0

    alumnosActivos.forEach((alumno) => {
      // Obtener todas las calificaciones del alumno
      const calificaciones = (alumno.unidades || [])
        .map((u) => u.calificacion)
        .filter((c) => c !== null && c !== undefined && !isNaN(c as number)) as number[]

      // Solo considerar si tiene al menos una calificación registrada
      if (calificaciones.length === 0) {
        return
      }

      // Calcular promedio
      const promedio = calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length

      // Verificar si todas las calificaciones son >= 70
      const todasAprobadas = calificaciones.every((cal) => cal >= 70)

      if (todasAprobadas && promedio >= 70) {
        aprobadosCount++
      } else {
        reprobadosCount++
      }
    })

    return {
      aprobados: aprobadosCount,
      reprobados: reprobadosCount,
      total: alumnosActivos.length
    }
  }, [alumnos, grupo])

  const data = [
    { name: "Aprobados", value: aprobados, color: "#10b981" },
    { name: "Reprobados", value: reprobados, color: "#ef4444" },
  ]

  if (total === 0 || (aprobados === 0 && reprobados === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No hay datos suficientes para mostrar
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">
        Aprobados vs Reprobados
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0]
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {data.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Total: <span className="font-semibold">{data.value}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Porcentaje:{" "}
                      <span className="font-semibold">
                        {((Number(data.value) / total) * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          Total de alumnos activos: <span className="font-semibold">{total}</span>
        </p>
        <p className="italic mt-1">
          * Se consideran aprobados los alumnos con todas las calificaciones ≥ 70
        </p>
      </div>
    </div>
  )
}
