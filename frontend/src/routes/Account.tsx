import { useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'

export default function Account(){
  const { user, refresh } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string|undefined>(undefined)

  async function changePassword(e: React.FormEvent){
    e.preventDefault(); setMsg(null); setLoading(true)
    try{
      if (pw.length < 6) { setMsg('❌ Mínimo 6 caracteres'); return }
      if (pw !== pw2) { setMsg('❌ Las contraseñas no coinciden'); return }
      await api.post('/auth/change-password', { new_password: pw })
      await refresh()
      setMsg('✅ Contraseña actualizada')
      setPw(''); setPw2('')
    }catch(e:any){ setMsg('❌ '+(e.message||'Error')) }
    finally{ setLoading(false) }
  }

  async function onDeleteAvatar(){
    setMsg(null)
    try{
      await api.delete('/auth/avatar')
      setAvatarUrl(undefined)
      await refresh()
      setMsg('✅ Avatar eliminado')
    }catch(e:any){ setMsg('❌ '+(e.message||'Error eliminando avatar')) }
  }

  async function onUploadAvatar(file: File){
    setMsg(null)
    try{
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await api.put('/auth/avatar', fd as any)
      if (res?.url) setAvatarUrl(res.url)
      setMsg('✅ Avatar actualizado')
      await refresh()
    }catch(e:any){ setMsg('❌ '+(e.message||'Error subiendo avatar')) }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Configuración de cuenta</h2>
        <p className="text-sm text-slate-600">Actualiza tu contraseña y tu foto de perfil.</p>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm max-w-xl">
        <h3 className="font-medium mb-3">Contraseña</h3>
        <form onSubmit={changePassword} className="grid gap-3">
          <input type="password" placeholder="Nueva contraseña" className="h-10 rounded-xl border px-3" value={pw} onChange={e=>setPw(e.target.value)} />
          <input type="password" placeholder="Confirmar contraseña" className="h-10 rounded-xl border px-3" value={pw2} onChange={e=>setPw2(e.target.value)} />
          <button disabled={loading} className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm disabled:opacity-60">{loading?'Guardando…':'Guardar contraseña'}</button>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm max-w-xl">
        <h3 className="font-medium mb-3">Avatar</h3>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/> : null}
          </div>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            Subir imagen (jpg/png/webp)
            <input type="file" accept="image/*" className="hidden" onChange={e=> e.target.files?.[0] && onUploadAvatar(e.target.files[0])} />
          </label>
          <button type="button" onClick={onDeleteAvatar} className="rounded-lg border px-3 py-2 text-sm">
            Eliminar avatar
          </button>
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  )
}
