
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function ScatterChartPage(){
  const [points, setPoints] = useState<any[]>([])
  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.from('students').select('asistencia, promedio, nombre')
      setPoints((data||[]).map(d=> ({ x: d.asistencia, y: d.promedio, name: d.nombre })))
    })()
  },[])

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Dispersión (Asistencia vs Promedio)</h3>
      <div className="h-80 bg-white p-4 rounded-xl border shadow">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="number" dataKey="x" name="Asistencia" unit="%" />
            <YAxis type="number" dataKey="y" name="Promedio" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={points} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
