
import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supabase: SupabaseClient = createClient(url, anon)
type Ctx = { session: Session | null }
const SessionCtx = createContext<Ctx>({ session: null })
export const useSession = ()=> useContext(SessionCtx)
export const SessionProvider: React.FC<{children: React.ReactNode}> = ({children})=>{
  const [session, setSession] = useState<Session | null>(null)
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=> setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s)=> setSession(s))
    return ()=> subscription.unsubscribe()
  },[])
  return <SessionCtx.Provider value={{session}}>{children}</SessionCtx.Provider>
}
