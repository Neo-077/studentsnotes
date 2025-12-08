import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../lib/api'
import { FiSave, FiPlus, FiSettings } from 'react-icons/fi'
import { useAccessibility } from '../store/useAccessibility'
import ReadingMask from '../components/ReadingMask'
import ReadingGuide from '../components/ReadingGuide'
import { AccessibilityMenu } from '../components/AccessibilityMenu'
import { TTS } from '../lib/tts'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export default function Login() {
  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) })
  const { login, refresh } = useAuth()
  const nav = useNavigate()

  const accessibility = useAccessibility()
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
  } = accessibility
  const { voiceEnabled, voiceRate } = accessibility

  const [mode, setMode] = useState<'admin' | 'maestro'>('maestro')
  const [isRegister, setIsRegister] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // helper de voz
  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    TTS.speak(text, { rate: voiceRate })
  }

  // Textos de ayuda por voz
  const screenIntro = "Bienvenido a StudentsNotes. En esta pantalla puedes iniciar sesión como administrador o como docente. Primero elige el tipo de acceso, después escribe tu correo electrónico y tu contraseña, y por último pulsa el botón Entrar."

  const rolesExplanation = "El modo Administrador está pensado para gestionar catálogos, inscripciones y reportes de toda la escuela. El modo Docente está pensado solo para ver y administrar los grupos de aula asignados a ese maestro. Asegúrate de elegir el modo correcto antes de entrar."

  const emailHelp = "Campo de correo electrónico. Escribe tu correo institucional o el correo con el que fue registrada tu cuenta. El formato debe ser por ejemplo usuario arroba dominio punto com."

  const passwordHelp = "Campo de contraseña. Escribe la contraseña asociada a tu cuenta. Debe tener al menos seis caracteres. Por seguridad, los caracteres no se muestran en pantalla."

  const resetAccessibilityHelp = "El enlace restablecer accesibilidad borra tus ajustes de accesibilidad, como colores personalizados, contraste y lectura de máscara. Después de usarlo, la página se recarga y vuelve a los valores por defecto."

  const submitHelp = "Botón para enviar el formulario. Si estás en modo docente y elegiste crear cuenta, se intentará registrar un nuevo usuario y luego iniciar sesión. En los demás casos, solo se intenta iniciar sesión con el correo y la contraseña que escribiste."

  // El tema se maneja centralmente en useAccessibility, no necesitamos lógica duplicada aquí

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
              aria-label="Restablecer accesibilidad a valores predeterminados"
            >
              Reestablecer accesibilidad
            </button>

            {/* Botón de voz para explicar qué hace restablecer accesibilidad */}
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(resetAccessibilityHelp)}
                className="text-xs rounded-md border border-slate-200 px-2 py-1 opacity-80 hover:opacity-100 inline-flex items-center gap-1"
                aria-label="Escuchar explicación del botón Restablecer accesibilidad"
              >
                <span aria-hidden="true">🔊</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-6">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            {/* Texto izquierdo */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight">Bienvenido</h1>
              <p style={{ color: "var(--text)" }}>
                Accede como Administrador o Docente para gestionar grupos y calificaciones.
              </p>
              <ul className="text-sm space-y-1" style={{ color: "var(--muted)" }}>
                <li>• Administrador: catálogos, inscripciones, reportes.</li>
                <li>• Docente: solo sus Grupos (Aula).</li>
              </ul>

              {/* Botón de voz para explicar la pantalla completa */}
              {voiceEnabled && (
                <button
                  type="button"
                  onClick={() => speak(screenIntro)}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--surface), white 4%)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--surface)"
                  }}
                  aria-label="Escuchar explicación general de la pantalla de inicio de sesión"
                >
                  <span aria-hidden="true">🔊</span>
                  <span>Explicar esta pantalla</span>
                </button>
              )}
            </div>

            {/* Formulario */}
            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-2xl border shadow p-6" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex gap-2 mb-2 items-center justify-between">
                  <div className="flex gap-2 flex-1">
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

                  {/* Botón de voz para explicar los roles */}
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={() => speak(rolesExplanation)}
                      className="ml-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface)",
                        color: "var(--text)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--surface), white 4%)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--surface)"
                      }}
                      aria-label="Escuchar explicación de las opciones Administrador y Docente"
                    >
                      <span aria-hidden="true">🔊</span>
                    </button>
                  )}
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
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs" style={{ color: "var(--muted)" }}>
                        Email <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      {/* Botón de voz para explicar el campo Email */}
                      {voiceEnabled && (
                        <button
                          type="button"
                          onClick={() => speak(emailHelp)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--text)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--surface), white 4%)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--surface)"
                          }}
                          aria-label="Escuchar explicación de cómo llenar el campo de correo electrónico"
                        >
                          <span aria-hidden="true">🔊</span>
                        </button>
                      )}
                    </div>
                    <input
                      placeholder="Email"
                      aria-required="true"
                      className="w-full rounded-xl px-3 py-2 border"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-red-600 text-sm">Email inválido</p>}
                  </div>

                  <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs" style={{ color: "var(--muted)" }}>
                        Password <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      {/* Botón de voz para explicar el campo Password */}
                      {voiceEnabled && (
                        <button
                          type="button"
                          onClick={() => speak(passwordHelp)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--text)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--surface), white 4%)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--surface)"
                          }}
                          aria-label="Escuchar explicación de cómo llenar el campo de contraseña"
                        >
                          <span aria-hidden="true">🔊</span>
                        </button>
                      )}
                    </div>
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

                  <div className="space-y-2">
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

                    {/* Botón de voz para explicar el botón principal */}
                    {voiceEnabled && (
                      <button
                        type="button"
                        onClick={() => speak(submitHelp)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--surface), white 4%)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--surface)"
                        }}
                        aria-label="Escuchar explicación de lo que hace el botón de Entrar"
                      >
                        <span aria-hidden="true">🔊</span>
                        <span>¿Qué hace este botón?</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>

        <footer className="max-w-5xl mx-auto px-6 py-6 text-xs" style={{ color: "var(--muted)" }}>
          © {new Date().getFullYear()} StudentsNotes
        </footer>
      </div>
    </>
  )
}
