
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ResponsiveContainer, PieChart, Pie, Tooltip } from 'recharts'

export default function PieChartPage(){
  const [data, setData] = useState<any[]>([])
  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('students').select('estado')
      const a = (data||[]).filter(x=> x.estado==='Aprobado').length
      const r = (data||[]).length - a
      setData([{ name:'Aprobados', value:a }, { name:'Reprobados', value:r }])
    })()
  },[])
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Pastel (Aprobados vs Reprobados)</h3>
      <div className="h-80 bg-white p-4 rounded-xl border shadow">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} label />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
