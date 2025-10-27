
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts'

export default function ControlChart(){
  const [series, setSeries] = useState<any[]>([])
  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('students').select('semestre, promedio')
      const map = new Map<number, number[]>()
      data?.forEach(r=> {
        const arr = map.get(r.semestre) || []
        arr.push(r.promedio||0)
        map.set(r.semestre, arr)
      })
      const rows = Array.from(map.entries()).sort((a,b)=> a[0]-b[0]).map(([sem, arr])=> ({
        sem: `S${sem}`, avg: +(arr.reduce((a,b)=>a+b,0)/Math.max(arr.length,1)).toFixed(2)
      }))
      const center = rows.reduce((a,x)=> a+x.avg,0) / Math.max(rows.length,1) || 0
      const UCL = center + 10
      const LCL = Math.max(center - 10, 0)
      setSeries(rows.map(r=> ({...r, center, UCL, LCL})))
    })()
  },[])

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Gráfico de Control (promedio por semestre)</h3>
      <div className="h-80 bg-white p-4 rounded-xl border shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sem" />
            <YAxis domain={[0,100]} />
            <Tooltip />
            <Line type="monotone" dataKey="avg" />
            <ReferenceLine y={(series[0]?.center)||0} label="CL" />
            <ReferenceLine y={(series[0]?.UCL)||0} label="UCL" />
            <ReferenceLine y={(series[0]?.LCL)||0} label="LCL" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
