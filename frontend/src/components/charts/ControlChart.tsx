import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { xbarR } from '../../lib/analytics/controlCharts'

const samples:number[][] = [
  [72, 75, 78, 70, 74],
  [80, 77, 82, 79, 81],
  [65, 68, 70, 67, 69],
  [90, 88, 92, 91, 89]
]

export default function ControlChart(){
  const res = xbarR(samples)
  return (
    <div className="bg-white border rounded-2xl p-4 shadow">
      <LineChart width={720} height={320} data={res.points}>
        <CartesianGrid />
        <XAxis dataKey="i" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <ReferenceLine y={res.center} label="CL" />
        <ReferenceLine y={res.ucl} label="UCL" />
        <ReferenceLine y={res.lcl} label="LCL" />
        <Line dataKey="xbar" />
      </LineChart>
    </div>
  )
}
