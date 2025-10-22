import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function KPIGrid(){
  const [kpis, setKpis] = useState<any>(null)
  useEffect(()=>{ api.get('/analitica/kpis').then(setKpis) },[])
  const Card = ({label, value}:{label:string,value:any})=>(
    <div className="bg-white border rounded-2xl p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value ?? '-'}</p>
    </div>
  )
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Estudiantes totales" value={kpis?.estudiantes_totales}/>
      <Card label="Inscripciones activas" value={kpis?.inscripciones_activas}/>
      <Card label="Tasa aprobación (%)" value={kpis?.tasa_aprobacion_global}/>
      <Card label="Asistencia promedio (%)" value={kpis?.asistencia_promedio}/>
    </div>
  )
}
