import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import api from '../lib/api'

type AuthState = {
  session: Session | null
  user: User | null
  initialized: boolean
  role: 'admin' | 'maestro' | null
  id_docente: number | null
  avatarUrl?: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => Promise<void>
  refresh: () => Promise<void>
}

// Memoización simple para /auth/whoami
let _whoamiInFlight: Promise<any> | null = null
let _whoamiCacheAt = 0
let _whoamiCache: any = null

async function fetchWhoami(force = false){
  const now = Date.now()
  if (!force && _whoamiCache && (now - _whoamiCacheAt < 8000)) return _whoamiCache
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

const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      initialized: false,
      role: null,
      id_docente: null,
      avatarUrl: null,

      // 1) Login con Supabase
      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return false
        // mapear rol desde backend (tabla usuario)
        try {
          const me = await fetchWhoami(true)
          set({ session: data.session, user: data.user, role: me?.user?.rol ?? null, id_docente: me?.user?.id_docente ?? null, avatarUrl: me?.user?.avatar_url ?? null })
        } catch {
          set({ session: data.session, user: data.user, role: null, id_docente: null, avatarUrl: null })
        }
        return true
      },

      // 2) Logout
      async logout() {
        await supabase.auth.signOut()
        set({ session: null, user: null, role: null, id_docente: null, avatarUrl: null })
      },

      // 3) Inicializar estado al cargar la app y suscribirse a cambios
      async init() {
        // Recuperar sesión guardada
        const { data } = await supabase.auth.getSession()
        let role: 'admin' | 'maestro' | null = null
        let id_docente: number | null = null
        let avatarUrl: string | null = null
        if (data.session) {
          try {
            const me = await fetchWhoami(false)
            role = me?.user?.rol ?? null
            id_docente = me?.user?.id_docente ?? null
            avatarUrl = me?.user?.avatar_url ?? null
          } catch {}
        }
        set({ session: data.session ?? null, user: data.session?.user ?? null, role, id_docente, avatarUrl, initialized: true })

        // Listener de cambios de auth (login, logout, token refresh)
        supabase.auth.onAuthStateChange(async (_event, session) => {
          let role: 'admin' | 'maestro' | null = null
          let id_docente: number | null = null
          let avatarUrl: string | null = null
          if (session) {
            try {
              const me = await fetchWhoami(false)
              role = me?.user?.rol ?? null
              id_docente = me?.user?.id_docente ?? null
              avatarUrl = me?.user?.avatar_url ?? null
            } catch {}
          }
          set({ session: session ?? null, user: session?.user ?? null, role, id_docente, avatarUrl })
        })
      },

      async refresh(){
        const { data } = await supabase.auth.getSession()
        if (!data.session) { set({ role: null, id_docente: null, avatarUrl: null }); return }
        try{
          const me = await fetchWhoami(false)
          set({ role: me?.user?.rol ?? null, id_docente: me?.user?.id_docente ?? null, avatarUrl: me?.user?.avatar_url ?? null })
        }catch{
          set({ role: null, id_docente: null, avatarUrl: null })
        }
      }
    }),
    {
      name: 'studentsnotes-auth', // guarda en localStorage
      partialize: (s) => ({ session: s.session, user: s.user, role: s.role, id_docente: s.id_docente, avatarUrl: s.avatarUrl }) // no guardar "initialized"
    }
  )
)

export default useAuth
