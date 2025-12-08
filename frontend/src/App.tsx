// App.tsx
import { Routes, Route, Navigate, Outlet, NavLink, useLocation } from 'react-router-dom'
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
import Account from './routes/Account'
import { useTranslation } from 'react-i18next'
import { FiHome, FiUserPlus, FiLayers, FiUsers, FiUser, FiBook, FiSettings } from 'react-icons/fi'
import ConfirmModal from './components/ConfirmModal'
import NotificationToast from './components/NotificationToast'
import ReadingMask from './components/ReadingMask'
import ReadingGuide from './components/ReadingGuide'
import { useAccessibility } from './store/useAccessibility'
import { AccessibilityMenu } from './components/AccessibilityMenu'

// --- helper que ya tenías ---
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

function Shell() {
  const { t, i18n } = useTranslation()

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
    customSidebarBgColor,
    customSidebarFgColor,
  } = useAccessibility()

  const { session, user, role, avatarUrl, logout } = useAuth()

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    'Docente'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('')

  // === estilos DEL SIDEBAR unificados ===
  // Usar variables CSS en lugar de estilos inline hardcodeados
  const sidebarStyle: React.CSSProperties | undefined = (() => {
    // 1) Paleta personalizada - usar inline solo para colores custom
    if (customColorsEnabled) {
      const bg = customSidebarBgColor || customBgColor || '#003D7A'
      const fg = customSidebarFgColor || getContrastCounterpart(bg)
      return {
        background: bg,
        color: fg,
        borderRight: '1px solid rgba(15,23,42,0.15)',
      }
    }

    // 2-4) Para todos los demás modos, usar variables CSS definidas en globals.css
    // El sidebar ya tiene estilos en .sidebar que usan var(--sidebar-bg) y var(--sidebar-fg)
    // No aplicar estilos inline para que las variables CSS se apliquen correctamente
    return undefined
  })()

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
      case '/dashboard': return <FiHome className="w-5 h-5 flex-none" />
      case '/inscripciones': return <FiUserPlus className="w-5 h-5 flex-none" />
      case '/grupos': return <FiLayers className="w-5 h-5 flex-none" />
      case '/grupos/aula': return <FiUsers className="w-5 h-5 flex-none" />
      case '/docentes': return <FiUser className="w-5 h-5 flex-none" />
      case '/materias': return <FiBook className="w-5 h-5 flex-none" />
      case '/estudiantes': return <FiUsers className="w-5 h-5 flex-none" />
      case '/cuenta': return <FiSettings className="w-5 h-5 flex-none" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen-fix grid grid-cols-1 lg:grid-cols-[260px_1fr] app-root">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 bg-blue-600 text-white px-3 py-2 rounded shadow-lg z-50"
      >
        {t('layout.skipToContent')}
      </a>

      {/* ⬇⬇ AQUÍ USAMOS sidebarStyle solo si hay colores custom ⬇⬇ */}
      <aside
        className="sidebar p-4 lg:min-h-screen-fix lg:min-w-[260px] shadow-xl"
        aria-label={t('layout.sidebarAria')}
        style={sidebarStyle || undefined}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-white/15 grid place-items-center font-semibold">SN</div>
            <h1 className="text-[clamp(1rem,2vw,1.25rem)] font-semibold tracking-wide">StudentsNotes</h1>
          </div>
        </div>

        {/* Accessibility controls (inline, compact) */}
        <div className="mb-3">
          <AccessibilityMenu inline />
        </div>

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

      <ConfirmModal />
      <NotificationToast />
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
  return <Outlet />
}

function DefaultRedirect() {
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      {/* Login fuera del Shell */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas, dentro del Shell */}
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grupos/aula" element={<GruposAula />} />
          <Route path="/grupos/aula/:id_grupo" element={<GrupoAulaDetalle />} />
          <Route path="/estudiantes" element={<Estudiantes />} />
          <Route path="/cuenta" element={<Account />} />
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

export default App