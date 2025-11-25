import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import notifyService from '../lib/notifyService'
import { useTranslation } from 'react-i18next'

export default function Account() {
  const { role, refresh } = useAuth()
  const isMaestro = role === 'maestro'
  const { t } = useTranslation()

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

    if (!isMaestro) return setMsg(t('account.errors.onlyTeacher'))
    if (oldPw.length < 6) return setMsg(t('account.errors.needCurrent'))
    if (pw.length < 6) return setMsg(t('account.errors.newTooShort'))
    if (pw !== pw2) return setMsg(t('account.errors.notMatch'))
    if (pw === oldPw) return setMsg(t('account.errors.sameAsOld'))

    setLoading(true)
    try {
      await api.post(
        '/auth/change-password',
        { old_password: oldPw, new_password: pw },
        { headers: { 'x-no-retry': '1' } }
      )
      await refresh()
      notifyService.notify({ type: 'success', message: t('account.messages.passwordUpdated') })
      setOldPw('')
      setPw('')
      setPw2('')
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const message = format(e, { action: 'update' }) || t('account.errors.changeFailedGeneric')
      setMsg(message)
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
      notifyService.notify({ type: 'success', message: t('account.messages.avatarDeleted') })
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      notifyService.notify({ type: 'error', message: format(e, { action: 'delete' }) || t('account.errors.avatarDeleteFailed') })
    }
  }

  async function onUploadAvatar(file: File) {
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await api.put('/auth/avatar', fd as any)
      if (res?.url) setAvatarUrl(res.url)
      notifyService.notify({ type: 'success', message: t('account.messages.avatarUpdated') })
      await refresh()
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      notifyService.notify({ type: 'error', message: format(e, { action: 'create' }) || t('account.errors.avatarUploadFailed') })
    }
  }

  async function requestResetLink() {
    if (sendingLink) return
    setMsg(null)
    setSendingLink(true)
    try {
      await api.post('/auth/request-password-reset', {})
      notifyService.notify({ type: 'success', message: t('account.messages.resetLinkSent') })
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      notifyService.notify({ type: 'error', message: format(e, { action: 'create' }) || t('account.errors.resetLinkFailed') })
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold">
          {t('account.title')}
        </h2>
        <p className="text-sm text-slate-600">
          {isMaestro
            ? t('account.subtitleTeacher')
            : t('account.subtitleAdmin')}
        </p>
      </div>

      <div
        className={`rounded-2xl border bg-white p-4 shadow-sm max-w-xl ${!isMaestro ? 'opacity-60 pointer-events-none' : ''
          }`}
      >
        <h3 className="font-medium mb-3">
          {t('account.passwordSectionTitle')}
        </h3>
        <form onSubmit={changePassword} className="grid gap-3">
          <input
            type="password"
            placeholder={t('account.currentPasswordPlaceholder')}
            className="h-10 rounded-xl border px-3"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
          />
          <input
            type="password"
            placeholder={t('account.newPasswordPlaceholder')}
            className="h-10 rounded-xl border px-3"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <input
            type="password"
            placeholder={t('account.confirmPasswordPlaceholder')}
            className="h-10 rounded-xl border px-3"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <button
              disabled={loading || !isMaestro}
              className="h-10 rounded-lg bg-blue-600 px-4 text-white shadow-sm disabled:opacity-60 inline-flex items-center"
            >
              <FiSave className="mr-2" size={14} />
              {loading ? t('account.saving') : t('account.savePassword')}
            </button>
            <button
              type="button"
              onClick={requestResetLink}
              disabled={sendingLink || !isMaestro}
              className="h-10 rounded-lg border px-4 text-sm disabled:opacity-60"
              title={t('account.resetByEmailTitle')}
            >
              {sendingLink ? t('account.requesting') : t('account.resetByEmail')}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm max-w-xl">
        <h3 className="font-medium mb-3">
          {t('account.avatarSectionTitle')}
        </h3>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={t('account.avatarAlt')}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            {t('account.uploadLabel')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && onUploadAvatar(e.target.files[0])
              }
            />
          </label>
          <button
            type="button"
            onClick={onDeleteAvatar}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {t('account.deleteAvatar')}
          </button>
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  )
}