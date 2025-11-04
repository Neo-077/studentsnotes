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
import { toggleTheme, isDark } from './lib/theme'
import Account from './routes/Account'

function Shell() {
  const { user, logout, role, avatarUrl, refresh } = useAuth()
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(isDark()) }, [])

  // Si hay sesión pero rol aún no llega (primer render), refresca perfil una sola vez
  useEffect(() => {
    if (user && role == null) {
      refresh().catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user])

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email || 'Docente'

  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return (
    <div className="min-h-screen-fix grid grid-cols-1 lg:grid-cols-[260px_1fr] app-root">
      {/* Sidebar */}
      <aside className="sidebar p-4 lg:min-h-screen-fix shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-8 rounded-md bg-white/15 grid place-items-center font-semibold">SN</div>
          <h1 className="text-[clamp(1rem,2vw,1.25rem)] font-semibold tracking-wide">StudentsNotes</h1>
        </div>
        <button
          onClick={() => setDark(toggleTheme() === 'dark')}
          className="theme-toggle mb-4 inline-flex items-center gap-2 rounded-md transition px-3 py-2 text-xs"
          title="Alternar tema"
        >
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" stroke="currentColor" strokeWidth="1.5" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07 6.07-1.41-1.41M8.34 8.34 6.93 6.93m10.14 0-1.41 1.41M8.34 15.66l-1.41 1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          )}
          <span>{dark ? 'Oscuro' : 'Claro'}</span>
        </button>

        <nav className="grid gap-1 mt-1">
          {(role === 'maestro'
            ? [{ to: '/grupos/aula', label: 'Grupos (Aula)' }, { to: '/cuenta', label: 'Configuración' }]
            : [
              // { to: '/dashboard', label: 'Dashboard' },
              { to: '/inscripciones', label: 'Inscripciones' },
              { to: '/grupos', label: 'Grupos' },
              { to: '/grupos/aula', label: 'Grupos (Aula)' },
              { to: '/docentes', label: 'Docentes' },
              { to: '/materias', label: 'Materias' },
              { to: '/estudiantes', label: 'Estudiantes' },
              { to: '/cuenta', label: 'Configuración' },
            ]
          ).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/grupos'}
              className={({ isActive }) => [
                'sidebar-link',
                isActive ? 'is-active' : ''
              ].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 grid gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/12 grid place-items-center font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials || 'D'}</span>
              )}
            </div>
            <div className="min-w-0 w-full">
              <div className="text-sm font-medium break-words leading-snug">{displayName}</div>
              {user?.email && <div className="text-xs opacity-80 break-all leading-snug">{user.email}</div>}
            </div>
          </div>
          <button
            onClick={logout}
            className="logout-btn rounded-md transition px-4 py-2 text-sm"
            title="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna principal */}
      <div>
        <main className="safe-areas mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


/* ====== Iconos SVG simples (sin dependencias) ====== */
function IconHome(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconBars(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M5 12v6m7-10v10m7-6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconScatter(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="16" r="1.6" fill="currentColor" /><circle cx="12" cy="10" r="1.6" fill="currentColor" /><circle cx="18" cy="14" r="1.6" fill="currentColor" />
    </svg>
  )
}
function IconControl(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M6 7h12M6 12h8M6 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconPie(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v9h9A9 9 0 1 1 12 3Z" stroke="currentColor" strokeWidth="1.5" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconUsers(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M20 19v-1a3 3 0 0 0-2-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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

  // 🔒 Fuerza que cualquier usuario autenticado termine en /grupos/aula
  // incluso si viene de "/" o "/dashboard".
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return <Navigate to="/grupos/aula" replace />
  }

  return <Outlet />
}

function AdminOnly() {
  const { role, initialized } = useAuth()
  if (!initialized) return null
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
          <Route path="/grupos/aula" element={<GruposAula />} />
          <Route path="/grupos/aula/:id_grupo" element={<GrupoAulaDetalle />} />
          <Route path="/cuenta" element={<Account />} />
          {/* Rutas solo admin */}
          <Route element={<AdminOnly />}>
            <Route path="/inscripciones" element={<Inscripciones />} />
            <Route path="/grupos" element={<Grupos />} />
            <Route path="/docentes" element={<Docentes />} />
            <Route path="/materias" element={<Materias />} />
            <Route path="/estudiantes" element={<Estudiantes />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function DefaultRedirect() {
  const { role } = useAuth()
  return <Navigate to="/grupos/aula" replace />
}
