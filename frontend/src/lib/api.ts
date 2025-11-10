// src/lib/api.ts
import { supabase } from './supabaseClient'

const RAW_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const BASE = RAW_BASE.replace(/\/+$/, '') // sin trailing slash

function joinURL(base: string, path: string) {
  return `${base}/${String(path || '').replace(/^\/+/, '')}`
}

async function request(path: string, opts: RequestInit = {}) {
  const attempt = async (retrying = false): Promise<any> => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token || null

    const isFormData = opts.body instanceof FormData

    console.log('🔍 REQUEST - opts.body recibido:', opts.body)
    console.log('🔍 REQUEST - tipo:', typeof opts.body)

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(opts.headers as Record<string, string> | undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }

    if (!isFormData && opts.body !== undefined && opts.body !== null) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
      if (typeof opts.body !== 'string') {
        console.log('🔍 Body antes de stringify:', opts.body)
        const stringified = JSON.stringify(opts.body)
        console.log('🔍 Body después de stringify:', stringified)
        opts = { ...opts, body: stringified }
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)

    // Encadenar signal externo si viene
    if (opts.signal) {
      const outer = opts.signal as AbortSignal
      if (outer.aborted) controller.abort()
      else outer.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const base = joinURL(BASE, path)
    const url = retrying ? base + (base.includes('?') ? '&' : '?') + `_ts=${Date.now()}` : base

    try {
      const res = await fetch(url, {
        ...opts,
        headers,
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res.status === 304 && !retrying) return attempt(true)

      const raw = await res.text()
      let payload: any = null
      try { payload = raw ? JSON.parse(raw) : null } catch { payload = raw }

      if (!res.ok) {
        if (res.status === 401 && !retrying) {
          try { await supabase.auth.refreshSession() } catch { }
          return attempt(true)
        }
        const msg =
          payload?.error?.message ||
          payload?.message ||
          (typeof payload === 'string' ? payload : res.statusText || 'Error')
        throw new Error(msg)
      }

      if (res.status === 204 || res.status === 205) return null
      return payload
    } catch (err: any) {
      clearTimeout(timer)
      if (err?.name === 'AbortError') {
        if (!retrying) return attempt(true)
        throw new Error('Tiempo de espera agotado')
      }
      if (!retrying) return attempt(true)
      throw new Error(err?.message || 'Error de red')
    }
  }

  return attempt(false)
}

export default {
  get: (path: string, opts?: RequestInit) =>
    request(path, { method: 'GET', ...(opts || {}) }),

  post: (path: string, body?: any, opts?: RequestInit) => {
    console.log('📤 api.post - path:', path)
    console.log('📤 api.post - body recibido:', body)
    console.log('📤 api.post - opts:', opts)

    return request(path, {
      ...opts,
      method: 'POST',
      body: body,
    })
  },

  put: (path: string, body?: any, opts?: RequestInit) =>
    request(path, {
      method: 'PUT',
      ...(opts || {}),
      body: body instanceof FormData ? body : body,
    }),

  delete: (path: string, opts?: RequestInit) =>
    request(path, { method: 'DELETE', ...(opts || {}) }),
}
