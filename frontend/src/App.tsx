
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
}
