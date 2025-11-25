import { useEffect, useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import useAuth from '../store/useAuth'

export default function Landing() {
  const { session, login, signup } = useAuth()
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya hay sesión activa, redirige automáticamente
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignup) {
        if (!fullName.trim()) {
          setError('Por favor ingresa tu nombre completo')
          setLoading(false)
          return
        }

        await signup(email.trim().toLowerCase(), password, fullName.trim())
        navigate('/dashboard', { replace: true })
      } else {
        const ok = await login(email.trim().toLowerCase(), password)
        if (ok) {
          navigate('/dashboard', { replace: true })
        } else {
          setError('Credenciales incorrectas')
        }
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || `Error al ${isSignup ? 'crear cuenta' : 'iniciar sesión'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 px-6">
        {/* Texto lateral */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            StudentsNotes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de seguimiento académico para docentes. <br />
            {isSignup ? 'Crea tu cuenta para comenzar.' : 'Inicia sesión para gestionar estudiantes y ver análisis.'}
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700 space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isSignup ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez García"
                required
                disabled={loading}
                minLength={3}
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Correo <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@correo.com"
              required
              aria-required="true"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              aria-required="true"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
          >
            <FiSave className="mr-2" size={16} />
            {loading ? (isSignup ? 'Creando cuenta…' : 'Entrando…') : (isSignup ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setError(null)
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              disabled={loading}
            >
              {isSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}