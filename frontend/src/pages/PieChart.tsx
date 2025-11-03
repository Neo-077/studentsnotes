import { useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';

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

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill="#333"
        style={{
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 25}
        textAnchor="middle"
        fill="#666"
      >
        {`${payload.value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

export default function PieChartPage({ grupo }: { grupo: any }) {
  const [activeIndex, setActiveIndex] = useState<number>();

  const data = [
    {
      name: 'Aprobados',
      value: grupo?.aprobados || 0,
      fill: '#4CAF50'
    },
    {
      name: 'Reprobados',
      value: grupo?.reprobados || 0,
      fill: '#F44336'
    }
  ];

  const onPieEnter = (_: React.MouseEvent<SVGElement>, index: number) => {
    setActiveIndex(index);
  };

  return (
    <>
      {grupo && grupo.aprobados > 0 && grupo.reprobados > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Pastel (Aprobados vs Reprobados)</h3>
          <div className="h-80 bg-white p-4 rounded-xl border shadow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex ?? 0}
                  activeShape={renderActiveShape}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  labelLine={false}
                  label={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} ${name}`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}