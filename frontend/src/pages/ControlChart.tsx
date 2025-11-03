import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';

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

  useEffect(() => {
    if (!promedio || !promedio.length) return;

    const datosTransformados = promedio
      .sort((a, b) => a.semestre - b.semestre)
      .map(item => ({
        sem: `S${item.semestre}`,
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

  return (
    <>
      {promedio && promedio.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Control de Promedios por Semestre</h3>
          <div className="h-96 bg-white p-4 rounded-xl border shadow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="sem"
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'avg') return [`${value.toFixed(2)}`, 'Promedio'];
                    if (name === 'center') return [`${value.toFixed(2)}`, 'Media'];
                    return [`${value.toFixed(2)}`, name];
                  }}
                />
                <ReferenceLine y={series[0]?.center} label="Media" stroke="#3b82f6" strokeDasharray="3 3" />
                <ReferenceLine y={series[0]?.UCL} label="UCL" stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={series[0]?.LCL} label="LCL" stroke="#ef4444" strokeDasharray="3 3" />

                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Promedio"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>)}
    </>
  );
}