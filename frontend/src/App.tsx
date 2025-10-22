<<<<<<< HEAD
<<<<<<< HEAD

import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useSession, supabase } from './lib/supabase'
export default function App(){
  const { session } = useSession()
  const navigate = useNavigate()
  if(!session){ navigate('/'); return null }
  async function signOut(){ await supabase.auth.signOut(); navigate('/') }
  return (<div className="min-h-screen text-gray-900 bg-gray-50">
    <header className="bg-white border-b">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
        <div className="font-semibold">StudentsNotes</div>
        <nav className="flex gap-2 text-sm">
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app">Dashboard</Link>
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app/students">Estudiantes</Link>
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app/pareto">Pareto</Link>
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app/dispersion">Dispersión</Link>
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app/control">Control</Link>
          <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/app/pastel">Pastel</Link>
        </nav>
        <div className="flex-1" />
        <div className="text-xs text-gray-600">{session?.user.email}</div>
        <button onClick={signOut} className="text-sm border px-3 py-1 rounded">Salir</button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-6 py-6"><Outlet /></main>
  </div>)
=======
=======
>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
import { Routes, Route, Navigate, Link, Outlet } from 'react-router-dom'
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
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-4">studentsnotes</h1>
        <nav className="grid gap-2 text-sm">
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/pareto" className="hover:underline">Pareto</Link>
          <Link to="/dispersion" className="hover:underline">Dispersión</Link>
          <Link to="/control" className="hover:underline">Control</Link>
          <Link to="/pastel" className="hover:underline">Pastel</Link>
          <Link to="/inscripciones" className="hover:underline">Inscripciones</Link>
        </nav>
      </aside>
      <main className="p-6">
        <Outlet />
      </main>
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
<<<<<<< HEAD
>>>>>>> d2eb161 (Proyecto StudentsNotes: frontend y backend iniciales)
=======
>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
}
