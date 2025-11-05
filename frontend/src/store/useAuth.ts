// src/store/useAuth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import api from '../lib/api'

type AppRole = 'admin' | 'maestro'

type AuthState = {
  session: Session | null
  user: User | null
  initialized: boolean
  role: AppRole | null
  id_docente: number | null
  avatarUrl?: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => Promise<void>
  refresh: () => Promise<void>
}

let _whoamiInFlight: Promise<any> | null = null
let _whoamiCacheAt = 0
let _whoamiCache: any = null

async function fetchWhoami(force = false) {
  const now = Date.now()
  if (!force && _whoamiCache && now - _whoamiCacheAt < 8000) return _whoamiCache
  if (_whoamiInFlight) return _whoamiInFlight
  _whoamiInFlight = (async () => {
    try {
      const me = await api.get('/auth/whoami')
      _whoamiCache = me
      _whoamiCacheAt = Date.now()
      return me
    } finally {
      _whoamiInFlight = null
    }
  })()
  return _whoamiInFlight
}

const pickAppRole = (me: any): AppRole | null =>
  (me?.user?.role ?? me?.user?.rol ?? null) as AppRole | null
const pickIdDocente = (me: any): number | null =>
  (me?.user?.id_docente ?? null) as number | null
const pickAvatarUrl = (me: any): string | null =>
  (me?.user?.avatar_url ?? null) as string | null

const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      initialized: false,
      role: null,
      id_docente: null,
      avatarUrl: null,

      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return false
        try {
          const me = await fetchWhoami(true)
          set({
            session: data.session,
            user: data.user,
            role: pickAppRole(me),
            id_docente: pickIdDocente(me),
            avatarUrl: pickAvatarUrl(me)
          })
        } catch {
          set({ session: data.session, user: data.user, role: null, id_docente: null, avatarUrl: null })
        }
        return true
      },

      async logout() {
        await supabase.auth.signOut()
        set({ session: null, user: null, role: null, id_docente: null, avatarUrl: null })
      },

      async init() {
        const { data } = await supabase.auth.getSession()
        let role: AppRole | null = null
        let id_docente: number | null = null
        let avatarUrl: string | null = null
        if (data.session) {
          try {
            const me = await fetchWhoami(false)
            role = pickAppRole(me)
            id_docente = pickIdDocente(me)
            avatarUrl = pickAvatarUrl(me)
          } catch {}
        }
        set({
          session: data.session ?? null,
          user: data.session?.user ?? null,
          role,
          id_docente,
          avatarUrl,
          initialized: true
        })

        supabase.auth.onAuthStateChange(async (_event, session) => {
          let role: AppRole | null = null
          let id_docente: number | null = null
          let avatarUrl: string | null = null
          if (session) {
            try {
              const me = await fetchWhoami(false)
              role = pickAppRole(me)
              id_docente = pickIdDocente(me)
              avatarUrl = pickAvatarUrl(me)
            } catch {}
          }
          set({ session: session ?? null, user: session?.user ?? null, role, id_docente, avatarUrl })
        })
      },

      async refresh() {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          set({ role: null, id_docente: null, avatarUrl: null })
          return
        }
        try {
          const me = await fetchWhoami(false)
          set({
            role: pickAppRole(me),
            id_docente: pickIdDocente(me),
            avatarUrl: pickAvatarUrl(me)
          })
        } catch {
          set({ role: null, id_docente: null, avatarUrl: null })
        }
      }
    }),
    {
      name: 'studentsnotes-auth',
      partialize: (s) => ({
        session: s.session,
        user: s.user,
        role: s.role,
        id_docente: s.id_docente,
        avatarUrl: s.avatarUrl
      })
    }
  )
)

export default useAuth
