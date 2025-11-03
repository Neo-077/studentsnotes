// src/lib/api.ts
import { supabase } from './supabaseClient'

const RAW_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const BASE = RAW_BASE.replace(/\/+$/, '') // sin trailing slash

function joinURL(base: string, path: string) {
  return `${base}/${String(path || '').replace(/^\/+/, '')}`
}

async function request(path: string, opts: RequestInit = {}) {
  const attempt = async (retrying = false) => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    const isFormData = opts.body instanceof FormData
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(opts.headers as Record<string, string>),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }
    if (!isFormData) headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'

    // Timeout para evitar requests colgados
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12000)
    let res: Response
    try {
      const url = (()=>{
        const base = joinURL(BASE, path)
        return retrying ? (base + (base.includes('?') ? '&' : '?') + `_ts=${Date.now()}`) : base
      })()
      // No agregamos headers de no-cache para evitar preflights CORS innecesarios
      res = await fetch(url, { ...opts, headers, mode: 'cors', cache: 'no-store', signal: controller.signal })
    } catch (e: any) {
      clearTimeout(t)
      // Un retry en errores de red
      if (!retrying) return attempt(true)
      throw e
    }
    clearTimeout(t)

    const raw = await res.text()
    let payload: any = null
    try { payload = raw ? JSON.parse(raw) : null } catch { payload = raw }

    if (res.status === 304 && !retrying) {
      // Algunos navegadores devuelven 304 con cuerpo vacío → forzamos un retry con cache-buster
      return attempt(true)
    }
    if (!res.ok) {
      // Reintentar una vez si 401 y podemos refrescar sesión
      if (res.status === 401 && !retrying) {
        try { await supabase.auth.refreshSession() } catch {}
        return attempt(true)
      }
      const msg = payload?.error?.message || payload?.message || (typeof payload === 'string' ? payload : res.statusText)
      throw new Error(msg)
    }
    return res.status === 204 ? null : payload
  }
  return attempt(false)
}

export default {
  get: (path: string) => request(path),
  post: (path: string, body?: any, opts?: RequestInit) =>
    request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put: (path: string, body?: any, opts?: RequestInit) =>
    request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  delete: (path: string, opts?: RequestInit) => request(path, { method: 'DELETE', ...opts }),
}
