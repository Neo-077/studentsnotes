import { PieChart, Pie, Tooltip, Cell } from 'recharts'

const data = [
  { name: 'ACTIVA', value: 40 },
  { name: 'APROBADA', value: 25 },
  { name: 'REPROBADA', value: 15 },
  { name: 'BAJA', value: 20 }
]

export default function PieChartComp(){
  return (
    <div className="bg-white border rounded-2xl p-4 shadow">
      <PieChart width={500} height={280}>
        <Pie dataKey="value" data={data} outerRadius={120} label />
        <Tooltip />
      </PieChart>
    </div>
  )
}
