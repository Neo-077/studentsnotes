// App.tsx
import { Routes, Route, Navigate, Link, Outlet, NavLink } from 'react-router-dom' // 👈 añade NavLink
import Dashboard from './routes/Dashboard'
import Pareto from './routes/Pareto'
import Dispersion from './routes/Dispersion'
import ControlCharts from './routes/ControlCharts'
import Pastel from './routes/Pastel'
import Inscripciones from './routes/Inscripciones'
import Login from './routes/Login'
import NotFound from './routes/NotFound'
import useAuth from './store/useAuth'

function Shell() {
  const { user, logout } = useAuth()

  // Mejor etiqueta para mostrar (nombre de docente si existe en metadatos)
  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    'Docente'

  // Iniciales para el avatar
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="bg-[#0f172a] text-white px-5 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">StudentsNotes</h1>
        </div>

        {/* Navegación con más separación y estado activo */}
        <nav className="flex-1 grid gap-2">
          {[
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/pareto', label: 'Pareto' },
            { to: '/dispersion', label: 'Dispersión' },
            { to: '/control', label: 'Control' },
            { to: '/pastel', label: 'Pastel' },
            { to: '/inscripciones', label: 'Inscripciones' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'block rounded-xl px-4 py-3 transition',
                  'hover:bg-white/10',
                  isActive ? 'bg-white/10 ring-1 ring-white/10' : ''
                ].join(' ')
              }
            >
              <span className="text-[15px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Perfil compacto también en el sidebar (siempre visible) */}
        <div className="mt-auto grid gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/10 grid place-items-center font-semibold">
              {initials || 'D'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              {user?.email && <div className="text-xs text-white/70 truncate">{user.email}</div>}
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 w-full rounded-lg bg-white/10 hover:bg-white/20 transition px-4 py-2 text-sm"
            title="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-h-screen flex-col">
        {/* Header superior fijo con usuario + logout (siempre visible) */}
        <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <div />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3">
                <div className="size-8 rounded-full bg-gray-900 text-white grid place-items-center text-sm font-semibold">
                  {initials || 'D'}
                </div>
                <div className="text-sm">
                  <div className="font-medium leading-4">{displayName}</div>
                  {user?.email && <div className="text-gray-500 text-xs leading-4">{user.email}</div>}
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                title="Cerrar sesión"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        {/* Contenido de cada ruta */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
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
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
