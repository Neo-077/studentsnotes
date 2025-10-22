import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Line, LineChart } from 'recharts'
import { buildPareto } from '../../lib/analytics/pareto'

const sample = [
  { item: 'MAT1', count: 30 },
  { item: 'MAT2', count: 22 },
  { item: 'MAT3', count: 10 },
  { item: 'MAT4', count: 8 },
  { item: 'MAT5', count: 5 }
]

export default function ParetoChart(){
  const data = buildPareto(sample, x=>x.count, x=>x.item)
  return (
    <div className="bg-white border rounded-2xl p-4 shadow">
      <div className="grid md:grid-cols-2 gap-4">
        <BarChart width={420} height={260} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
        <LineChart width={420} height={260} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis domain={[0,100]} />
          <Tooltip />
          <Line dataKey="acumPct" />
        </LineChart>
      </div>
      <p className="text-sm text-gray-600 mt-2">Punto 80% resaltado en la línea acumulada.</p>
    </div>
  )
}
