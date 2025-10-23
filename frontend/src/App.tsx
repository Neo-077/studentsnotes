// App.tsx
import { Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom'
import Dashboard from './routes/Dashboard'
import Pareto from './routes/Pareto'
import Dispersion from './routes/Dispersion'
import ControlCharts from './routes/ControlCharts'
import Pastel from './routes/Pastel'
import Inscripciones from './routes/Inscripciones'
import Grupos from './routes/Grupos'
import Login from './routes/Login'
import NotFound from './routes/NotFound'
import useAuth from './store/useAuth'

function Shell() {
  const { user, logout } = useAuth()

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    'Docente'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen grid grid-cols-[248px_1fr] bg-slate-50">
      {/* Sidebar refinado */}
      <aside className="text-white bg-[#0f172a] border-r border-white/10">
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center text-sm font-bold">
            SN
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">StudentsNotes</h1>
            <p className="text-[11px] text-white/60 -mt-0.5">TecNM</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="px-3 py-4 space-y-1">
          {[
            { to: '/dashboard', label: 'Dashboard', icon: IconHome },
            { to: '/pareto', label: 'Pareto', icon: IconBars },
            { to: '/dispersion', label: 'Dispersión', icon: IconScatter },
            { to: '/control', label: 'Control', icon: IconControl },
            { to: '/pastel', label: 'Pastel', icon: IconPie },
            { to: '/inscripciones', label: 'Inscripciones', icon: IconUsers },
            { to: '/grupos', label: 'Grupos', icon: IconUsers },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition',
                  isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                ].join(' ')
              }
            >
              <item.icon className="h-4.5 w-4.5 opacity-90 group-hover:opacity-100" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Perfil + logout */}
        <div className="mt-auto px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-white/15 grid place-items-center text-[13px] font-semibold">
              {initials || 'D'}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate">{displayName}</div>
              {user?.email && <div className="text-[11px] text-white/60 truncate">{user.email}</div>}
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 transition px-3 py-2 text-[13px]"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna principal con contenedor */}
      <div className="min-h-screen">
        <main className="mx-auto max-w-7xl px-6 py-6">
          {/* Card de marco suave para que todas las vistas luzcan mejor sin tocarlas */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <Outlet />
          </div>
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
  if (!initialized) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="animate-pulse text-gray-500">Cargando sesión…</div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pareto" element={<Pareto />} />
          <Route path="/dispersion" element={<Dispersion />} />
          <Route path="/control" element={<ControlCharts />} />
          <Route path="/pastel" element={<Pastel />} />
          <Route path="/inscripciones" element={<Inscripciones />} />
          <Route path="/grupos" element={<Grupos />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
