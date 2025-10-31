import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../lib/api'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })

export default function Login(){
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) })
  const { login, role, refresh } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<'admin'|'maestro'>('maestro')
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (values:any)=>{
    setMsg(null); setLoading(true)
    try{
      if (mode === 'maestro' && isRegister) {
        await api.post('/auth/register-docente', { email: values.email, password: values.password })
        setMsg('✅ Cuenta creada. Iniciando sesión…')
      }
      const ok = await login(values.email, values.password)
      if(!ok) { setMsg('❌ Credenciales inválidas'); return }
      // Asegurar que role/id_docente estén listos antes de navegar
      await refresh()
      const r = useAuth.getState().role || (mode === 'admin' ? 'admin' : 'maestro')
      nav(r === 'admin' ? '/dashboard' : '/grupos/aula', { replace: true })
    }catch(e:any){ setMsg('❌ '+(e?.message||'Error')) }
    finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <header className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-sky-600 text-white grid place-items-center font-semibold shadow">SN</div>
          <div className="text-lg font-semibold tracking-wide">StudentsNotes</div>
        </div>
      </header>

      <main className="px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight">Bienvenido</h1>
            <p className="text-slate-600 dark:text-slate-300">Accede como Administrador o Docente para gestionar grupos y calificaciones.</p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Administrador: catálogos, inscripciones, reportes.</li>
              <li>• Docente: solo sus Grupos (Aula).</li>
            </ul>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xl p-5">
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={()=> setMode('admin')} className={`flex-1 rounded-md px-3 py-2 text-sm border ${mode==='admin'?'bg-slate-800 text-white dark:bg-slate-700':'bg-white dark:bg-slate-900'}`}>Administrador</button>
                <button type="button" onClick={()=> setMode('maestro')} className={`flex-1 rounded-md px-3 py-2 text-sm border ${mode==='maestro'?'bg-slate-800 text-white dark:bg-slate-700':'bg-white dark:bg-slate-900'}`}>Docente</button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">{isRegister && mode==='maestro' ? 'Crear cuenta (Docente)' : `Iniciar sesión (${mode==='admin'?'Administrador':'Docente'})`}</h2>
                {mode==='maestro' && (
                  <button type="button" onClick={()=> setIsRegister(v=>!v)} className="text-xs underline opacity-80">
                    {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <input placeholder="Email" className="w-full border rounded-xl px-3 py-2" {...register('email')}/>
                {errors.email && <p className="text-red-600 text-sm">Email inválido</p>}
                <input type="password" placeholder="Password" className="w-full border rounded-xl px-3 py-2" {...register('password')}/>
                {errors.password && <p className="text-red-600 text-sm">Mínimo 6 caracteres</p>}
                {msg && <div className="text-sm">{msg}</div>}
                <button disabled={loading} className="w-full rounded-xl py-2 bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60">{loading ? 'Procesando…' : (isRegister && mode==='maestro' ? 'Crear y entrar' : 'Entrar')}</button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-slate-500">© {new Date().getFullYear()} StudentsNotes</footer>
    </div>
  )
}
