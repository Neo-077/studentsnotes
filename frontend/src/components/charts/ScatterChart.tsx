import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const data = Array.from({length: 30}).map((_,i)=>({ x: 60 + Math.random()*40, y: 50 + Math.random()*50 }))

export default function ScatterChartComp(){
  return (
    <div className="bg-white border rounded-2xl p-4 shadow">
      <ScatterChart width={640} height={320}>
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name="Asistencia %" />
        <YAxis type="number" dataKey="y" name="Calificación" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} />
      </ScatterChart>
    </div>
  )
}
