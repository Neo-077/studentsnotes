import React, { useMemo } from "react";
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
} from "recharts";
import { useTranslation } from "react-i18next";

type AlumnoRow = {
  id_inscripcion: number;
  estudiante?: {
    nombre?: string;
    ap_paterno?: string;
    ap_materno?: string;
  };
  unidades?: Array<{ unidad: number; calificacion?: number; asistencia?: number }>;
};

export default function ScatterChartPage({ alumnos }: { alumnos: AlumnoRow[] }) {
  const { t } = useTranslation();

  const maxAsistenciasPorUnidad = useMemo(() => {
    const maxPorUnidad: Record<number, number> = {};

    alumnos.forEach((alumno) => {
      alumno.unidades?.forEach((unidad) => {
        const asistencia = Number(unidad.asistencia) || 0;
        if (!maxPorUnidad[unidad.unidad] || asistencia > maxPorUnidad[unidad.unidad]) {
          maxPorUnidad[unidad.unidad] = asistencia;
        }
      });
    });

    return maxPorUnidad;
  }, [alumnos]);

  const data = useMemo(() => {
    return alumnos
      .map((alumno) => {
        const calificaciones = (alumno.unidades || [])
          .map((u) => u.calificacion)
          .filter((c) => c !== null && c !== undefined && !isNaN(c as number)) as number[];

        const promedio =
          calificaciones.length > 0
            ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
            : 0;

        const asistenciasPorcentaje = (alumno.unidades || [])
          .map((u) => {
            const asist = Number(u.asistencia) || 0;
            const maxAsist = maxAsistenciasPorUnidad[u.unidad] || 1;
            return (asist / maxAsist) * 100;
          })
          .filter((p) => !isNaN(p));

        const promedioAsistencia =
          asistenciasPorcentaje.length > 0
            ? asistenciasPorcentaje.reduce((a, b) => a + b, 0) /
              asistenciasPorcentaje.length
            : 0;

        return {
          nombre: `${alumno.estudiante?.nombre || ""} ${
            alumno.estudiante?.ap_paterno || ""
          }`.trim(),
          promedio: Math.round(promedio * 100) / 100,
          asistencia: Math.round(promedioAsistencia * 100) / 100,
        };
      })
      .filter((d) => d.promedio > 0 || d.asistencia > 0);
  }, [alumnos, maxAsistenciasPorUnidad]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("classGroupDetail.charts.scatterNoData")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">
        {t("classGroupDetail.charts.scatterTitle")}
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

          {/* EJE X */}
          <XAxis
            type="number"
            dataKey="asistencia"
            name={t("classGroupDetail.charts.scatterTooltipAttendance")}
            stroke="var(--muted)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            domain={[0, 100]}
          >
            <Label
              value={t("classGroupDetail.charts.scatterXAxisLabel")}
              position="bottom"
              offset={-10}
              style={{ fill: "var(--text)", fontSize: 14, fontWeight: 600 }}
            />
          </XAxis>

          {/* EJE Y */}
          <YAxis
            type="number"
            dataKey="promedio"
            name={t("classGroupDetail.charts.scatterTooltipAvg")}
            stroke="var(--muted)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            domain={[0, 100]}
          >
            <Label
              value={t("classGroupDetail.charts.scatterYAxisLabel")}
              angle={-90}
              position="insideLeft"
              style={{
                fill: "var(--text)",
                fontSize: 14,
                fontWeight: 600,
                textAnchor: "middle",
              }}
            />
          </YAxis>

          {/* TOOLTIP */}
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
                      {d.nombre}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t("classGroupDetail.charts.scatterTooltipAvg")}:{" "}
                      <span className="font-semibold">{d.promedio}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t("classGroupDetail.charts.scatterTooltipAttendance")}:{" "}
                      <span className="font-semibold">{d.asistencia}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* LEYENDA */}
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            iconType="circle"
            formatter={() => (
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
                {t("classGroupDetail.charts.scatterLegend")}
              </span>
            )}
          />

          {/* PUNTOS */}
          <Scatter
            name={t("classGroupDetail.charts.scatterLegend")}
            data={data}
            fill="#3b82f6"
            fillOpacity={0.6}
            stroke="#2563eb"
            strokeWidth={2}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center italic">
        * {t("classGroupDetail.charts.scatterXAxisLabel")} – max normalizado por unidad
      </p>
    </div>
  );
}