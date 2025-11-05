import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { toggleTheme, isDark } from '../lib/theme'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { login, refresh } = useAuth()
  const nav = useNavigate()

  const [mode, setMode] = useState<'admin' | 'maestro'>('maestro')
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    setDarkMode(isDark())
  }, [])

  const onSubmit = async (values: any) => {
    setMsg(null)
    setLoading(true)
    try {
      if (mode === 'maestro' && isRegister) {
        await api.post('/auth/register-docente', { email: values.email, password: values.password })
        setMsg('✅ Cuenta creada. Iniciando sesión…')
      }
      const ok = await login(values.email, values.password)
      if (!ok) { setMsg('❌ Credenciales inválidas'); return }
      await refresh()
      nav('/grupos/aula', { replace: true })
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setDarkMode(next === 'dark')
  }

  return (
    <div className="app-root min-h-screen-fix safe-areas flex flex-col">
      <header className="max-w-5xl w-full mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-blue-600 text-[color:var(--primary-ctr)] grid place-items-center font-semibold shadow">SN</div>
          <div className="text-lg font-semibold tracking-wide">StudentsNotes</div>
        </div>
        <button
          onClick={handleToggleTheme}
          className="theme-toggle inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm"
        >
          <span>{darkMode ? 'Oscuro' : 'Claro'}</span>
          <span aria-hidden>{darkMode ? '🌙' : '☀️'}</span>
        </button>
      </header>

      <main className="flex-1 px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          {/* Texto izquierdo */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight">Bienvenido</h1>
            <p className="text-slate-700">Accede como Administrador o Docente para gestionar grupos y calificaciones.</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Administrador: catálogos, inscripciones, reportes.</li>
              <li>• Docente: solo sus Grupos (Aula).</li>
            </ul>
          </div>

          {/* Formulario */}
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-2xl border bg-white shadow p-6">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm border transition ${
                    mode === 'admin'
                      ? 'bg-[color:var(--primary)] text-[color:var(--primary-ctr)]'
                      : 'bg-[color:var(--card)]'
                  }`}
                >
                  Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setMode('maestro')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm border transition ${
                    mode === 'maestro'
                      ? 'bg-[color:var(--primary)] text-[color:var(--primary-ctr)]'
                      : 'bg-[color:var(--card)]'
                  }`}
                >
                  Docente
                </button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">
                  {isRegister && mode === 'maestro'
                    ? 'Crear cuenta (Docente)'
                    : `Iniciar sesión (${mode === 'admin' ? 'Administrador' : 'Docente'})`}
                </h2>
                {mode === 'maestro' && (
                  <button
                    type="button"
                    onClick={() => setIsRegister(v => !v)}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <input
                  placeholder="Email"
                  className="w-full rounded-xl px-3 py-2 border"
                  {...register('email')}
                />
                {errors.email && <p className="text-red-600 text-sm">Email inválido</p>}

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-xl px-3 py-2 border"
                  {...register('password')}
                />
                {errors.password && <p className="text-red-600 text-sm">Mínimo 6 caracteres</p>}

                {msg && <div className="text-sm">{msg}</div>}

                <button
                  disabled={loading}
                  className="w-full rounded-xl py-2 bg-blue-600 hover:bg-blue-600/90 text-[color:var(--primary-ctr)] disabled:opacity-60"
                >
                  {loading ? 'Procesando…' : (isRegister && mode === 'maestro' ? 'Crear y entrar' : 'Entrar')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500">
        © {new Date().getFullYear()} StudentsNotes
      </footer>
    </div>
  )
}
