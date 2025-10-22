import { supabase } from './supabaseClient'

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

async function request(path: string, opts: RequestInit = {}) {
  // Obtener el token actual de la sesión de Supabase
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  if (!res.ok) {
    let msg = await res.text()
    try {
      const j = JSON.parse(msg)
      msg = j?.error?.message || msg
    } catch {}
    throw new Error(msg)
  }

  // Si el backend responde sin contenido (204 No Content), no parsear JSON
  return res.status === 204 ? null : res.json()
}

export default {
  get: (path: string) => request(path),
  post: (path: string, body: any) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) =>
    request(path, { method: 'DELETE' })
}
