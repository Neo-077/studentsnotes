import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { toggleTheme } from '../lib/theme'
import { FiSave, FiPlus, FiSettings } from 'react-icons/fi'
import { useAccessibility } from '../store/useAccessibility'
import ReadingMask from '../components/ReadingMask'
import ReadingGuide from '../components/ReadingGuide'
import { AccessibilityMenu } from '../components/AccessibilityMenu'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

// misma lógica de contraste que en Shell
function getContrastCounterpart(hex: string) {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16)
    const g = parseInt(h[1] + h[1], 16)
    const b = parseInt(h[2] + h[2], 16)
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF'
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF'
  }
  return '#000000'
}

export default function Login() {
  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })
  const { login, refresh } = useAuth()
  const nav = useNavigate()

  const {
    readingMaskEnabled,
    readingMaskHeight,
    readingMaskOpacity,
    readingMaskColor,
    readingGuideEnabled,
    readingGuideThickness,
    readingGuideColor,
    readingGuideOpacity,
    contrastMode,
    customColorsEnabled,
    customBgColor,
    customTextColor,
    customPrimaryColor,
    customSidebarBgColor,
    customSidebarFgColor,
  } = useAccessibility()

  const [mode, setMode] = useState<'admin' | 'maestro'>('maestro')
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // aplicar contraste igual que en Shell, pero para login
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    root.classList.remove('high-contrast')

    if (contrastMode === 'high') {
      root.classList.add('high-contrast')
      root.style.removeProperty('--sidebar-bg')
      root.style.removeProperty('--sidebar-fg')
    } else if (contrastMode === 'dark') {
      if (!root.classList.contains('dark')) {
        toggleTheme()
      }
      root.style.removeProperty('--sidebar-bg')
      root.style.removeProperty('--sidebar-fg')
    } else if (contrastMode === 'default') {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark')
      }
      if (!customColorsEnabled) {
        root.style.setProperty('--sidebar-bg', '#FFFFFF')
        root.style.setProperty('--sidebar-fg', '#1E3452')
      }
    }
    // No inline overrides here: let the contrastMode behave like the Shell
  }, [contrastMode, customColorsEnabled])

  // aplicar colores personalizados igual que en Shell
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    if (customColorsEnabled) {
      root.style.setProperty('--bg', customBgColor)
      root.style.setProperty('--text', customTextColor)
      root.style.setProperty('--primary', customPrimaryColor)
      const ctr = getContrastCounterpart(customPrimaryColor)
      root.style.setProperty('--primary-ctr', ctr)
      root.style.setProperty('--sidebar-bg', customSidebarBgColor)
      root.style.setProperty('--sidebar-fg', customSidebarFgColor)
    } else {
      root.style.removeProperty('--bg')
      root.style.removeProperty('--text')
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-ctr')
      if (contrastMode !== 'default') {
        root.style.removeProperty('--sidebar-bg')
        root.style.removeProperty('--sidebar-fg')
      }
    }
  }, [
    customColorsEnabled,
    customBgColor,
    customTextColor,
    customPrimaryColor,
    customSidebarBgColor,
    customSidebarFgColor,
    contrastMode,
  ])

  const onSubmit = async (values: any) => {
    setMsg(null)
    setLoading(true)
    try {
      if (mode === 'maestro' && isRegister) {
        try {
          await api.post('/auth/register-docente', {
            email: values.email,
            password: values.password
          })
            ; (await import('../lib/notifyService')).default.notify({
              type: 'success',
              message: 'Cuenta creada. Iniciando sesión…'
            })
        } catch (err: any) {
          const status = err?.response?.status
          const errorMessage = err?.response?.data?.error?.message || err?.message

          if (status === 409) {
            setMsg('⚠️ Este correo ya tiene una cuenta registrada. Inicia sesión con tu contraseña.')
            setLoading(false)
            return
          }

          if (status === 403) {
            setMsg(`❌ ${errorMessage || 'Este correo no está autorizado para crear una cuenta. Contacta al administrador.'}`)
            setLoading(false)
            return
          }

          if (status === 400) {
            setMsg(`❌ ${errorMessage || 'Datos inválidos'}`)
            setLoading(false)
            return
          }

          setMsg(`❌ ${errorMessage || 'No se pudo crear la cuenta'}`)
          console.error('Error al crear cuenta:', err)
          setLoading(false)
          return
        }
      }

      const ok = await login(values.email, values.password)
      if (!ok) {
        setMsg('❌ Credenciales inválidas')
        setLoading(false)
        return
      }
      await refresh()
      nav('/grupos/aula', { replace: true })
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Capas de accesibilidad también en login */}
      <ReadingMask
        enabled={readingMaskEnabled}
        height={readingMaskHeight}
        opacity={readingMaskOpacity}
        color={readingMaskColor}
      />
      <ReadingGuide
        enabled={readingGuideEnabled}
        thickness={readingGuideThickness}
        color={readingGuideColor}
        opacity={readingGuideOpacity}
      />

      <div className="app-root min-h-screen-fix safe-areas flex flex-col">
        <header className="max-w-5xl w-full mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-[color:var(--primary-ctr)] grid place-items-center font-semibold shadow">
              SN
            </div>
            <div className="text-lg font-semibold tracking-wide">StudentsNotes</div>
          </div>
          {/* Botón de accesibilidad en lugar del botón de tema */}
          <div className="flex items-center gap-3">
            <AccessibilityMenu />
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('studentsnotes-accessibility')
                  localStorage.removeItem('sn_high_contrast')
                } catch { }
                location.reload()
              }}
              className="text-xs underline opacity-80 hover:opacity-100"
              title="Reestablecer accesibilidad"
            >
              Reestablecer accesibilidad
            </button>
          </div>
        </header>

        <main className="flex-1 px-6">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            {/* Texto izquierdo */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight">Bienvenido</h1>
              <p className="text-slate-700">
                Accede como Administrador o Docente para gestionar grupos y calificaciones.
              </p>
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
                    className={`flex-1 rounded-md px-3 py-2 text-sm border transition ${mode === 'admin'
                      ? 'bg-[color:var(--primary)] text-[color:var(--primary-ctr)]'
                      : 'bg-[color:var(--card)]'
                      }`}
                  >
                    Administrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('maestro')}
                    className={`flex-1 rounded-md px-3 py-2 text-sm border transition ${mode === 'maestro'
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
                  <div className="grid gap-1">
                    <label className="text-xs text-slate-500">
                      Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      placeholder="Email"
                      aria-required="true"
                      className="w-full rounded-xl px-3 py-2 border"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-red-600 text-sm">Email inválido</p>}
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs text-slate-500">
                      Password <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      aria-required="true"
                      className="w-full rounded-xl px-3 py-2 border"
                      {...register('password')}
                    />
                    {errors.password && (
                      <p className="text-red-600 text-sm">Mínimo 6 caracteres</p>
                    )}
                  </div>

                  {msg && <div className="text-sm">{msg}</div>}

                  <button
                    disabled={loading}
                    className="w-full rounded-xl py-2 bg-blue-600 hover:bg-blue-600/90 text-[color:var(--primary-ctr)] disabled:opacity-60 inline-flex items-center justify-center"
                  >
                    <FiSave className="mr-2" size={18} />
                    {loading
                      ? 'Procesando…'
                      : isRegister && mode === 'maestro'
                        ? 'Crear y entrar'
                        : 'Entrar'}
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
    </>
  )
}