// App.tsx
import { Routes, Route, Navigate, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Inscripciones from './routes/Inscripciones'
import Grupos from './routes/Grupos'
import Login from './routes/Login'
import NotFound from './routes/NotFound'
import useAuth from './store/useAuth'
import Estudiantes from './routes/Estudiantes'
import Docentes from './routes/Docentes'
import Materias from './routes/Materias'
import GruposAula from './routes/GruposAula'
import GrupoAulaDetalle from './routes/GrupoAulaDetalle'
import Dashboard from './routes/Dashboard'
import { toggleTheme, isDark } from './lib/theme'
import Account from './routes/Account'
import { useTranslation } from 'react-i18next'
import { FiHome, FiUserPlus, FiLayers, FiUsers, FiUser, FiBook, FiSettings } from 'react-icons/fi'
import ConfirmModal from './components/ConfirmModal'
import NotificationToast from './components/NotificationToast'

type FontSizePref = 'normal' | 'large'

function applyFontSize(pref: FontSizePref) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.fontSize = pref
  try {
    localStorage.setItem('sn_font_size', pref)
  } catch {
    // ignore
  }
}

function getStoredFontSize(): FontSizePref {
  if (typeof window === 'undefined') return 'normal'
  try {
    const value = localStorage.getItem('sn_font_size') as FontSizePref | null
    return value === 'large' ? 'large' : 'normal'
  } catch {
    return 'normal'
  }
}

function applyHighContrast(enabled: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('high-contrast', enabled)
  try {
    localStorage.setItem('sn_high_contrast', enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

function getStoredHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('sn_high_contrast') === '1'
  } catch {
    return false
  }
}

function Shell() {
  const { user, logout, role, avatarUrl, refresh } = useAuth()
  const [dark, setDark] = useState(false)
  const [fontSize, setFontSize] = useState<FontSizePref>('normal')
  const [highContrast, setHighContrast] = useState(false)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    setDark(isDark())
    const storedSize = getStoredFontSize()
    setFontSize(storedSize)
    applyFontSize(storedSize)

    const storedHighContrast = getStoredHighContrast()
    setHighContrast(storedHighContrast)
    applyHighContrast(storedHighContrast)
  }, [])

  // Si hay sesión pero rol aún no llega (primer render), refresca perfil una sola vez
  useEffect(() => {
    if (user && role == null) {
      refresh().catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user])

  useEffect(() => {
    applyFontSize(fontSize)
  }, [fontSize])

  useEffect(() => {
    applyHighContrast(highContrast)
  }, [highContrast])

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    'Docente'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const handleThemeToggle = () => {
    setDark(toggleTheme() === 'dark')
  }

  const handleFontSizeChange = (size: FontSizePref) => {
    setFontSize(size)
  }

  const handleHighContrastToggle = () => {
    setHighContrast((prev) => !prev)
  }

  const currentLng = i18n.language?.startsWith('en') ? 'en' : 'es'

  const handleLanguageToggle = () => {
    const next = currentLng === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
  }

  const navItemsAdmin = [
    { to: '/dashboard', label: t('nav.home') },
    { to: '/inscripciones', label: t('nav.enrollments') },
    { to: '/grupos', label: t('nav.groups') },
    { to: '/grupos/aula', label: t('nav.classGroups') },
    { to: '/docentes', label: t('nav.teachers') },
    { to: '/materias', label: t('nav.subjects') },
    { to: '/estudiantes', label: t('nav.students') },
    { to: '/cuenta', label: t('nav.settings') },
  ] as const

  const navItemsTeacher = [
    { to: '/dashboard', label: t('nav.home') },
    { to: '/grupos/aula', label: t('nav.classGroups') },
    { to: '/estudiantes', label: t('nav.students') },
    { to: '/cuenta', label: t('nav.settings') },
  ] as const

  function getIconForPath(path: string) {
    switch (path) {
      case '/dashboard':
        return <FiHome className="w-5 h-5 flex-none" />
      case '/inscripciones':
        return <FiUserPlus className="w-5 h-5 flex-none" />
      case '/grupos':
        return <FiLayers className="w-5 h-5 flex-none" />
      case '/grupos/aula':
        return <FiUsers className="w-5 h-5 flex-none" />
      case '/docentes':
        return <FiUser className="w-5 h-5 flex-none" />
      case '/materias':
        return <FiBook className="w-5 h-5 flex-none" />
      case '/estudiantes':
        return <FiUsers className="w-5 h-5 flex-none" />
      case '/cuenta':
        return <FiSettings className="w-5 h-5 flex-none" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen-fix grid grid-cols-1 lg:grid-cols-[260px_1fr] app-root">
      {/* Enlace para saltar al contenido principal (para teclado/lector) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 bg-blue-600 text-white px-3 py-2 rounded shadow-lg z-50"
      >
        {t('layout.skipToContent')}
      </a>

      {/* Sidebar */}
      <aside className="sidebar p-4 lg:min-h-screen-fix lg:min-w-[260px] shadow-xl" aria-label={t('layout.sidebarAria')}>
        {/* Marca */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-white/15 grid place-items-center font-semibold">SN</div>
            <h1 className="text-[clamp(1rem,2vw,1.25rem)] font-semibold tracking-wide">StudentsNotes</h1>
          </div>
        </div>

        {/* Panel de accesibilidad */}
        <section
          className="mb-6 rounded-xl p-3 text-xs space-y-3"
          aria-label={t('accessibility.panelAria')}
          style={{
            background: 'color-mix(in oklab, var(--sidebar-bg), white 6%)',
            border: '1px solid color-mix(in oklab, var(--sidebar-fg), transparent 80%)',
          }}
        >
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-[0.8rem] uppercase tracking-wide">
            <span>{t('accessibility.title')}</span>
          </h2>

          <div className="space-y-3">
            {/* Tema claro / oscuro */}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="theme-toggle inline-flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs"
            >
              <span className="flex items-center gap-2">
                <span>{t('accessibility.theme')}</span>
              </span>
              <span className="opacity-80">
                {dark ? t('accessibility.themeDark') : t('accessibility.themeLight')}
              </span>
            </button>

            {/* Tamaño de fuente */}
            <div className="space-y-1">
              <span className="block text-[0.7rem] font-semibold uppercase tracking-wide">
                {t('accessibility.fontSize')}
              </span>

              <div className="inline-flex gap-1 rounded-md bg-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('normal')}
                  className={[
                    'px-2 py-1 text-[0.7rem] rounded-md transition',
                    fontSize === 'normal' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-700',
                  ].join(' ')}
                  aria-pressed={fontSize === 'normal'}
                >
                  {t('accessibility.fontSizeNormal')}
                </button>
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('large')}
                  className={[
                    'px-2 py-1 text-[0.8rem] rounded-md transition',
                    fontSize === 'large' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-700',
                  ].join(' ')}
                  aria-pressed={fontSize === 'large'}
                >
                  {t('accessibility.fontSizeLarge')}
                </button>
              </div>
            </div>

            {/* Alto contraste */}
            <label className="mt-1 flex items-center gap-2">
              <input
                type="checkbox"
                className="size-3"
                checked={highContrast}
                onChange={handleHighContrastToggle}
              />
              <span>{t('accessibility.highContrast')}</span>
            </label>

            {/* Idioma - mismo diseño que el botón de tema */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="theme-toggle inline-flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs"
              aria-label={t('accessibility.languageAria')}
            >
              <span className="flex items-center gap-2">
                <span>{t('accessibility.language')}</span>
              </span>
              <span className="opacity-80">
                {currentLng === 'es' ? 'Español' : 'English'}
              </span>
            </button>
          </div>
        </section>

        {/* Navegación principal */}
        <nav className="mt-2" aria-label={t('layout.mainNavAria')}>
          <ul className="grid gap-1 text-sm">
            {(role === 'admin' ? navItemsAdmin : navItemsTeacher).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/grupos'}
                  className={({ isActive }) =>
                    [
                      'sidebar-link inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
                      isActive ? 'is-active' : '',
                    ].join(' ')
                  }
                >
                  <span className="flex items-center gap-3 w-full min-w-0">
                    {getIconForPath(item.to)}
                    <span className="truncate">{item.label}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Info de usuario + logout */}
        <div className="mt-6 grid gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/12 grid place-items-center font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t('layout.userAvatarAlt')} className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden="true">{initials || 'D'}</span>
              )}
            </div>
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium break-words leading-snug">{displayName}</p>
              {user?.email && (
                <p className="text-xs opacity-80 break-all leading-snug">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="logout-btn rounded-md transition px-4 py-2 text-sm text-left"
            title={t('layout.logout')}
          >
            {t('layout.logout')}
          </button>
        </div>
      </aside>

      {/* Global confirm modal (listens to confirmService) */}
      <ConfirmModal />
      {/* Global notification toasts */}
      <NotificationToast />

      {/* Columna principal */}
      <div>
        <main
          id="main-content"
          className="safe-areas mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-7"
          role="main"
          aria-live="polite"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function RequireAuth() {
  const { session, initialized } = useAuth()
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="animate-pulse text-gray-500">Cargando sesión…</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />

  if (location.pathname === '/') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function AdminOnly() {
  const { role, initialized } = useAuth()
  if (!initialized) return null
  // Opcional: si quieres forzar solo admin en frontend:
  // if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<DefaultRedirect />} />
          {/* Rutas accesibles a todos los autenticados */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grupos/aula" element={<GruposAula />} />
          <Route path="/grupos/aula/:id_grupo" element={<GrupoAulaDetalle />} />
          <Route path="/estudiantes" element={<Estudiantes />} />
          <Route path="/cuenta" element={<Account />} />
          {/* Rutas solo admin */}
          <Route element={<AdminOnly />}>
            <Route path="/inscripciones" element={<Inscripciones />} />
            <Route path="/grupos" element={<Grupos />} />
            <Route path="/docentes" element={<Docentes />} />
            <Route path="/materias" element={<Materias />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function DefaultRedirect() {
  return <Navigate to="/dashboard" replace />
}