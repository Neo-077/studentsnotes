import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type AuthState = {
  session: Session | null
  user: User | null
  initialized: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => Promise<void>
}

const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      initialized: false,

      // 1) Login con Supabase
      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return false
        set({ session: data.session, user: data.user })
        return true
      },

      // 2) Logout
      async logout() {
        await supabase.auth.signOut()
        set({ session: null, user: null })
      },

      // 3) Inicializar estado al cargar la app y suscribirse a cambios
      async init() {
        // Recuperar sesión guardada
        const { data } = await supabase.auth.getSession()
        set({ session: data.session ?? null, user: data.session?.user ?? null, initialized: true })

        // Listener de cambios de auth (login, logout, token refresh)
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ session: session ?? null, user: session?.user ?? null })
        })
      }
    }),
    {
      name: 'studentsnotes-auth', // guarda en localStorage
      partialize: (s) => ({ session: s.session, user: s.user }) // no guardar "initialized"
    }
  )
)

export default useAuth
