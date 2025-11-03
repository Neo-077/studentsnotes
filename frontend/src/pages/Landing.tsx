import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../store/useAuth'

export default function Landing() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Si ya hay sesión activa, redirige automáticamente
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const ok = await login(email, password) // 👈 usa tu login del store
      if (ok) {
        navigate('/dashboard', { replace: true })
      } else {
        alert('Credenciales incorrectas')
      }
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 px-6">
        {/* Texto lateral */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">StudentsNotes</h1>
          <p className="text-gray-600">
            Sistema de seguimiento académico para docentes. <br />
            Inicia sesión para gestionar estudiantes y ver análisis.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="bg-white p-6 rounded-2xl shadow border space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-700 mb-1">Correo</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Contraseña</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 transition"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
