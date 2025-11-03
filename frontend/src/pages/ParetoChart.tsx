
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts'

export default function ParetoChart(){
  const [data, setData] = useState<any[]>([])
  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('students').select('factores_riesgo')
      const counts = new Map<string, number>()
      data?.forEach(row=> (row.factores_riesgo||[]).forEach((f:string)=> counts.set(f, (counts.get(f)||0)+1)))
      const arr = Array.from(counts.entries()).map(([name, value])=>({name, value})).sort((a,b)=> b.value-a.value)
      const total = arr.reduce((a,x)=> a+x.value, 0) || 1
      let cum = 0
      const final = arr.map(x=> { cum+=x.value; return {...x, cumPct: +(cum/total*100).toFixed(2)} })
      setData(final)
    })()
  },[])

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Análisis de Pareto (Factores de Riesgo)</h3>
      <div className="h-80 bg-white p-4 rounded-xl border shadow">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="value" />
            <Line yAxisId="right" type="monotone" dataKey="cumPct" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
