// src/pages/Account.tsx
import { useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'

export default function Account() {
  const { role, refresh } = useAuth()
  const isMaestro = role === 'maestro'

  const [oldPw, setOldPw] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setMsg(null)

    if (!isMaestro) return setMsg('⚠️ Solo los docentes pueden cambiar contraseña en la app.')
    if (oldPw.length < 6) return setMsg('❌ Escribe tu contraseña actual')
    if (pw.length < 6) return setMsg('❌ La nueva contraseña debe tener al menos 6 caracteres')
    if (pw !== pw2) return setMsg('❌ Las contraseñas no coinciden')
    if (pw === oldPw) return setMsg('❌ La nueva contraseña debe ser distinta a la actual')

    setLoading(true)
    try {
      await api.post('/auth/change-password', { old_password: oldPw, new_password: pw }, { headers: { 'x-no-retry': '1' } })
      await refresh()
      setMsg('Contraseña actualizada')
      setOldPw(''); setPw(''); setPw2('')
    } catch (e: any) {
      // nuestro api.ts lanza Error(message)
      const message = e?.message || 'Error al cambiar la contraseña'
      setMsg(` ${message}`)
    } finally {
      setLoading(false)
    }
  }

  async function onDeleteAvatar() {
    setMsg(null)
    try {
      await api.delete('/auth/avatar')
      setAvatarUrl(undefined)
      await refresh()
      setMsg('Avatar eliminado')
    } catch (e: any) {
      setMsg((e.message || 'Error eliminando avatar'))
    }
  }

  async function onUploadAvatar(file: File) {
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await api.put('/auth/avatar', fd as any)
      if (res?.url) setAvatarUrl(res.url)
      setMsg('✅ Avatar actualizado')
      await refresh()
    } catch (e: any) {
      setMsg(' ' + (e.message || 'Error subiendo avatar'))
    }
  }

  async function requestResetLink() {
    if (sendingLink) return
    setMsg(null)
    setSendingLink(true)
    try {
      await api.post('/auth/request-password-reset', {})
      setMsg('✉️ Si tu cuenta es válida, recibirás un enlace para restablecer la contraseña.')
    } catch (e: any) {
      setMsg((e?.message || 'No se pudo solicitar el enlace'))
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Configuración de cuenta</h2>
        <p className="text-sm text-slate-600">
          {isMaestro
            ? 'Actualiza tu contraseña y tu foto de perfil.'
            : 'Los administradores no pueden cambiar contraseña desde la app.'}
        </p>
      </div>

      <div className={`rounded-2xl border bg-white p-4 shadow-sm max-w-xl ${!isMaestro ? 'opacity-60 pointer-events-none' : ''}`}>
        <h3 className="font-medium mb-3">Contraseña</h3>
        <form onSubmit={changePassword} className="grid gap-3">
          <input type="password" placeholder="Contraseña actual" className="h-10 rounded-xl border px-3"
                 value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          <input type="password" placeholder="Nueva contraseña" className="h-10 rounded-xl border px-3"
                 value={pw} onChange={(e) => setPw(e.target.value)} />
          <input type="password" placeholder="Confirmar contraseña nueva" className="h-10 rounded-xl border px-3"
                 value={pw2} onChange={(e) => setPw2(e.target.value)} />

          <div className="flex items-center gap-3">
            <button disabled={loading || !isMaestro}
                    className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm disabled:opacity-60">
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            <button type="button" onClick={requestResetLink}
                    disabled={sendingLink || !isMaestro}
                    className="h-10 rounded-lg border px-4 text-sm disabled:opacity-60"
                    title="Solicitar enlace de restablecimiento al correo">
              {sendingLink ? 'Solicitando…' : 'Cambiar por correo'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm max-w-xl">
        <h3 className="font-medium mb-3">Avatar</h3>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : null}
          </div>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            Subir imagen (jpg/png/webp)
            <input type="file" accept="image/*" className="hidden"
                   onChange={(e) => e.target.files?.[0] && onUploadAvatar(e.target.files[0])} />
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
