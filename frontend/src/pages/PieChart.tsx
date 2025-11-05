import { useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, Legend, Cell } from 'recharts';
import { isDark } from '../lib/theme';

type PieSectorData = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: {
    name: string;
    value: number;
    fill: string;
  };
  percent: number;
  value: number;
};

const renderActiveShape = (props: PieSectorData) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent
  } = props;

  const darkMode = isDark();
  const textColor = darkMode ? '#EAF2FB' : '#1e293b';
  const secondaryColor = darkMode ? '#B7C7D9' : '#64748b';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill={textColor}
        style={{
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fill={secondaryColor}
        style={{ fontSize: '0.9rem' }}
      >
        {`${payload.value} estudiantes`}
      </text>
      <text
        x={cx}
        y={cy + 40}
        textAnchor="middle"
        fill={secondaryColor}
        style={{ fontSize: '0.85rem' }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export default function PieChartPage({ grupo }: { grupo: any }) {
  const [activeIndex, setActiveIndex] = useState<number>();
  const darkMode = isDark();

  const aprobados = grupo?.aprobados ?? 0;
  const reprobados = grupo?.reprobados ?? 0;
  const total = aprobados + reprobados;

  const data = [
    {
      name: 'Aprobados',
      value: aprobados,
      fill: '#10b981'
    },
    {
      name: 'Reprobados',
      value: reprobados,
      fill: '#ef4444'
    }
  ];

  const onPieEnter = (_: React.MouseEvent<SVGElement>, index: number) => {
    setActiveIndex(index);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[var(--card)] p-3 rounded-lg shadow-lg border border-slate-200 dark:border-[var(--border)]">
          <p className="font-semibold text-slate-900 dark:text-[var(--text)] mb-1">{data.name}</p>
          <p className="text-sm" style={{ color: data.fill }}>
            <span className="font-bold">{data.value}</span> estudiantes
          </p>
          <p className="text-xs text-slate-500 dark:text-[var(--muted)] mt-1">
            {total > 0 ? `${((data.value / total) * 100).toFixed(1)}% del total` : '0%'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (total === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)]">Aprobados vs Reprobados</h3>
        <div className="h-80 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 dark:text-[var(--muted)]">No hay datos disponibles</p>
            <p className="text-sm text-slate-400 dark:text-[var(--muted)] mt-1">Aún no hay estudiantes con calificaciones completas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Aprobados vs Reprobados</h3>
        <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Distribución de estudiantes por resultado</p>
      </div>
      <div className="h-80 bg-white dark:bg-[var(--card)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="gradientAprobados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="gradientReprobados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              dataKey="value"
              onMouseEnter={onPieEnter}
              labelLine={false}
              label={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#gradientAprobados)' : 'url(#gradientReprobados)'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => {
                const item = data.find(d => d.name === value);
                return `${value}: ${item?.value ?? 0}`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
