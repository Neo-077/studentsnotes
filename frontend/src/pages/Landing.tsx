
import { useState } from 'react'
import { supabase, useSession } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
export default function Landing(){
  const { session } = useSession()
  const navigate = useNavigate()
  if(session){ navigate('/app'); }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  async function onSubmit(e: React.FormEvent){
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false); if(error){ alert(error.message) } else { navigate('/app') }
  }
  return (<div className="min-h-screen grid place-items-center bg-gray-50">
    <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">StudentsNotes</h1>
        <p className="text-gray-600">Sistema de seguimiento académico para docentes. Inicia sesión para gestionar estudiantes y ver análisis.</p>
      </div>
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-2xl shadow border space-y-3">
        <div><label className="block text-sm text-gray-700 mb-1">Correo</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="docente@correo.com" required /></div>
        <div><label className="block text-sm text-gray-700 mb-1">Contraseña</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required /></div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2">{loading? 'Entrando…':'Iniciar sesión'}</button>
      </form>
    </div></div>)
}
