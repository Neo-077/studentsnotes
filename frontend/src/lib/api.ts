// src/lib/api.ts
import { supabase } from './supabaseClient'

const RAW_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const BASE = RAW_BASE.replace(/\/+$/, '') // sin trailing slash

function joinURL(base: string, path: string) {
  return `${base}/${String(path || '').replace(/^\/+/, '')}`
}

async function request(path: string, opts: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  const isFormData = opts.body instanceof FormData
  const headers: Record<string, string> = {
    Accept: 'application/json',                           // 👈 fuerza JSON en la respuesta
    ...(opts.headers as Record<string, string>),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
  if (!isFormData) headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'

  const res = await fetch(joinURL(BASE, path), { ...opts, headers, mode: 'cors' })

  // Intenta parsear JSON; si no, deja texto
  const raw = await res.text()
  let payload: any = null
  try { payload = raw ? JSON.parse(raw) : null } catch { payload = raw }

  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      (typeof payload === 'string' ? payload : res.statusText)
    throw new Error(msg)
  }

  return res.status === 204 ? null : payload
}

export default {
  get: (path: string) => request(path),
  post: (path: string, body?: any, opts?: RequestInit) =>
    request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put: (path: string, body?: any, opts?: RequestInit) =>
    request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  delete: (path: string, opts?: RequestInit) => request(path, { method: 'DELETE', ...opts }),
}
