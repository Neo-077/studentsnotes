
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Student = {
  id?: string
  nombre: string
  matricula: string
  carrera: string
  semestre: number
  materia1?: string
  materia2?: string
  materia3?: string
  cal_materia1?: number
  cal_materia2?: number
  cal_materia3?: number
  asistencia?: number
  conducta?: string
  factores_riesgo?: string[]
  promedio?: number
  estado?: string
}

export default function Students(){
  const empty: Student = { nombre:'', matricula:'', carrera:'', semestre:1 }
  const [materias, setMaterias] = useState<string[]>([])
  const [form, setForm] = useState<Student>(empty)
  const [list, setList] = useState<Student[]>([])

  async function loadAll(){
    const m = await supabase.from('materias_preset').select('nombre').order('nombre')
    if(!m.error && m.data) setMaterias(m.data.map(x=> x.nombre))
    const s = await supabase.from('students').select('*').order('created_at',{ascending:false})
    if(!s.error && s.data) setList(s.data as any)
  }

  useEffect(()=>{ loadAll() }, [])

  function onChange(e:any){
    const { name, value } = e.target
    setForm(prev=> ({...prev, [name]: name.startsWith('cal_')||name==='semestre'||name==='asistencia' ? Number(value) : value }))
  }

  async function onSubmit(e:React.FormEvent){
    e.preventDefault()
    const { error } = await supabase.from('students').insert([form])
    if(error){ alert(error.message); return }
    setForm(empty); loadAll()
  }

  async function onDelete(id?:string){
    if(!id) return
    const { error } = await supabase.from('students').delete().eq('id', id)
    if(error){ alert(error.message); return }
    loadAll()
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl border shadow space-y-3">
        <h3 className="text-lg font-semibold">Agregar estudiante</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input name="nombre" placeholder="Nombre" className="border rounded px-3 py-2" value={form.nombre} onChange={onChange} required />
          <input name="matricula" placeholder="Matrícula" className="border rounded px-3 py-2" value={form.matricula} onChange={onChange} required />
          <input name="carrera" placeholder="Carrera" className="border rounded px-3 py-2" value={form.carrera} onChange={onChange} />
          <input name="semestre" type="number" min={1} max={12} placeholder="Semestre" className="border rounded px-3 py-2" value={form.semestre} onChange={onChange} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[1,2,3].map(i=>(
            <select key={i} name={`materia${i}`} className="border rounded px-3 py-2" value={(form as any)[`materia${i}`]||''} onChange={onChange}>
              <option value="">{`Materia ${i}`}</option>
              {materias.map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[1,2,3].map(i=>(
            <input key={i} name={`cal_materia${i}`} type="number" min={0} max={100} placeholder={`Calif. ${i}`} className="border rounded px-3 py-2" value={(form as any)[`cal_materia${i}`]||''} onChange={onChange} />
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input name="asistencia" type="number" min={0} max={100} placeholder="Asistencia %" className="border rounded px-3 py-2" value={form.asistencia||''} onChange={onChange} />
          <select name="conducta" className="border rounded px-3 py-2" value={form.conducta||'Buena'} onChange={onChange}>
            {['Excelente','Buena','Regular','Deficiente'].map(x=> <option key={x} value={x}>{x}</option>)}
          </select>
          <input name="factores_riesgo" placeholder="Factores (separa por coma)" className="border rounded px-3 py-2" onChange={(e)=> setForm(prev=> ({...prev, factores_riesgo: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">Guardar</button>
      </form>

      <div className="bg-white p-6 rounded-xl border shadow">
        <h3 className="text-lg font-semibold mb-3">Listado</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-1 pr-3">Nombre</th>
              <th className="py-1 pr-3">Matrícula</th>
              <th className="py-1 pr-3">Promedio</th>
              <th className="py-1 pr-3">Estado</th>
              <th className="py-1 pr-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map(s=> (
              <tr key={s.id} className="border-b">
                <td className="py-1 pr-3">{s.nombre}</td>
                <td className="py-1 pr-3">{s.matricula}</td>
                <td className="py-1 pr-3">{s.promedio}</td>
                <td className="py-1 pr-3">{s.estado}</td>
                <td className="py-1 pr-3">
                  <button onClick={()=> onDelete(s.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
