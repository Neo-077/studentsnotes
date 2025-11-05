import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip, Legend } from 'recharts';
import { isDark } from '../lib/theme';

// Definición de tipos
type PuntoDatos = {
  semestre: number;
  calificacion: string;
  asistencia: string;
};

type SerieDatos = {
  sem: string;
  avg: number;
  center: number;
  UCL: number;
  LCL: number;
};

export default function ControlChart({ promedio }: { promedio: PuntoDatos[] }) {
  const [series, setSeries] = useState<SerieDatos[]>([]);
  const darkMode = isDark();

  useEffect(() => {
    if (!promedio || !promedio.length) {
      setSeries([]);
      return;
    }

    const datosTransformados = promedio
      .sort((a, b) => a.semestre - b.semestre)
      .map(item => ({
        sem: `U${item.semestre}`,
        avg: parseFloat(item.calificacion) || 0,
        asistencia: parseFloat(item.asistencia) || 0
      }));

    const total = datosTransformados.reduce((sum, item) => sum + item.avg, 0);
    const center = total / Math.max(datosTransformados.length, 1);
    const UCL = center + 10;
    const LCL = Math.max(center - 10, 0);

    const seriesActualizadas = datosTransformados.map(item => ({
      ...item,
      center: +center.toFixed(2),
      UCL: +UCL.toFixed(2),
      LCL: +LCL.toFixed(2)
    }));

    setSeries(seriesActualizadas);
  }, [promedio]);

  const gridColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#e2e8f0';
  const textColor = darkMode ? '#B7C7D9' : '#64748b';
  const axisLineColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#cbd5e1';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[var(--card)] p-3 rounded-lg shadow-lg border border-slate-200 dark:border-[var(--border)]">
          {payload.map((item: any, index: number) => (
            <div key={index} className="mb-1">
              <p className="font-semibold text-slate-900 dark:text-[var(--text)]">
                {item.dataKey === 'avg' && 'Promedio'}
                {item.dataKey === 'center' && 'Media'}
                {item.dataKey === 'UCL' && 'Límite Superior (UCL)'}
                {item.dataKey === 'LCL' && 'Límite Inferior (LCL)'}
              </p>
              <p className="text-sm" style={{ color: item.color }}>
                <span className="font-bold">{Number(item.value).toFixed(2)}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!promedio || promedio.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Carta de Control</h3>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Promedios por unidad</p>
        </div>
        <div className="h-96 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 dark:text-[var(--muted)]">No hay datos disponibles</p>
            <p className="text-sm text-slate-400 dark:text-[var(--muted)] mt-1">Aún no hay calificaciones registradas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Carta de Control</h3>
        <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Promedios por unidad con límites de control</p>
      </div>
      <div className="h-96 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
            />
            <XAxis
              dataKey="sem"
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              label={{ value: 'Unidad', position: 'insideBottom', offset: -5, style: { fill: textColor, fontSize: 12 } }}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              domain={[0, 100]}
              label={{ value: 'Calificación', angle: -90, position: 'insideLeft', style: { fill: textColor, fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={series[0]?.center}
              label={{ value: 'Media', position: 'top', style: { fill: textColor, fontSize: 11 } }}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              strokeWidth={2}
            />
            <ReferenceLine
              y={series[0]?.UCL}
              label={{ value: 'UCL', position: 'top', style: { fill: textColor, fontSize: 11 } }}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={series[0]?.LCL}
              label={{ value: 'LCL', position: 'bottom', style: { fill: textColor, fontSize: 11 } }}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="Promedio"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
