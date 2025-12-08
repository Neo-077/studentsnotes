// src/routes/Account.tsx

import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import notifyService from '../lib/notifyService'
import { useTranslation } from 'react-i18next'
import { useAccessibility } from '../store/useAccessibility'
import { TTS } from '../lib/tts'

export default function Account() {
  const { role, refresh } = useAuth()
  const isMaestro = role === 'maestro'
  const { t } = useTranslation()

  // ====== Voz ======
  const { voiceEnabled, voiceRate } = useAccessibility(s => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    TTS.speak(text, { rate: voiceRate })
  }

  // ====== Textos de ayuda ======
  const pageHelp = t(
    'account.tts.pageHelp',
    'En esta pantalla puedes actualizar tu contraseña, solicitar un enlace de recuperación y administrar tu foto de perfil.'
  )

  const passwordSectionHelp = t(
    'account.tts.passwordSectionHelp',
    'En este apartado puedes cambiar tu contraseña. Primero escribe tu contraseña actual, luego la nueva, y después repítela para confirmación. Finalmente presiona Guardar.'
  )

  const avatarSectionHelp = t(
    'account.tts.avatarSectionHelp',
    'Aquí puedes subir tu fotografía de perfil o eliminar la que ya tengas.'
  )

  const helpCurrentPw = t(
    'account.tts.currentPasswordHelp',
    'En este campo escribe tu contraseña actual. Debe tener al menos seis caracteres.'
  )

  const helpNewPw = t(
    'account.tts.newPasswordHelp',
    'En este campo escribe la nueva contraseña. Debe ser distinta de la anterior y tener mínimo seis caracteres.'
  )

  const helpConfirmPw = t(
    'account.tts.confirmPasswordHelp',
    'Repite aquí la nueva contraseña exactamente igual para confirmarla.'
  )

  // ====== States ======
  const [oldPw, setOldPw] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)

  // ====== Password Change ======
  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setMsg(null)

    // Validaciones con voz
    const error = (() => {
      if (!isMaestro) return t('account.errors.onlyTeacher')
      if (oldPw.length < 6) return t('account.errors.needCurrent')
      if (pw.length < 6) return t('account.errors.newTooShort')
      if (pw !== pw2) return t('account.errors.notMatch')
      if (pw === oldPw) return t('account.errors.sameAsOld')
      return null
    })()

    if (error) {
      setMsg(error)
      speak(error)
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', { old_password: oldPw, new_password: pw }, { headers: { 'x-no-retry': '1' } })
      await refresh()
      const ok = t('account.messages.passwordUpdated')
      notifyService.notify({ type: 'success', message: ok })
      speak(ok)
      setOldPw('')
      setPw('')
      setPw2('')
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const message = format(e, { action: 'update' }) || t('account.errors.changeFailedGeneric')
      setMsg(message)
      speak(message)
    } finally {
      setLoading(false)
    }
  }

  // ====== Avatar Delete ======
  async function onDeleteAvatar() {
    setMsg(null)
    try {
      await api.delete('/auth/avatar')
      setAvatarUrl(undefined)
      await refresh()
      const msg = t('account.messages.avatarDeleted')
      notifyService.notify({ type: 'success', message: msg })
      speak(msg)
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const message = format(e, { action: 'delete' }) || t('account.errors.avatarDeleteFailed')
      notifyService.notify({ type: 'error', message })
      speak(message)
    }
  }

  // ====== Avatar Upload ======
  async function onUploadAvatar(file: File) {
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await api.put('/auth/avatar', fd as any)
      if (res?.url) setAvatarUrl(res.url)
      const ok = t('account.messages.avatarUpdated')
      notifyService.notify({ type: 'success', message: ok })
      speak(ok)
      await refresh()
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const message = format(e, { action: 'create' }) || t('account.errors.avatarUploadFailed')
      notifyService.notify({ type: 'error', message })
      speak(message)
    }
  }

  // ====== Reset Link ======
  async function requestResetLink() {
    if (sendingLink) return
    setMsg(null)
    setSendingLink(true)

    try {
      await api.post('/auth/request-password-reset', {})
      const ok = t('account.messages.resetLinkSent')
      notifyService.notify({ type: 'success', message: ok })
      speak(ok)
    } catch (e: any) {
      const format = (await import('../lib/errorFormatter')).default
      const message = format(e, { action: 'create' }) || t('account.errors.resetLinkFailed')
      notifyService.notify({ type: 'error', message })
      speak(message)
    } finally {
      setSendingLink(false)
    }
  }

  return (
    <div className="grid gap-6 max-w-2xl">

      {/* Encabezado con botón de voz */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('account.title')}</h2>
          <p className="text-sm text-slate-600">
            {isMaestro ? t('account.subtitleTeacher') : t('account.subtitleAdmin')}
          </p>
        </div>

        {voiceEnabled && (
          <button
            type="button"
            onClick={() => speak(pageHelp)}
            className="rounded-md border px-3 py-1 text-xs inline-flex items-center bg-slate-50 hover:bg-slate-100"
          >
            🔊 {t('account.tts.explainPage', 'Explicar pantalla')}
          </button>
        )}
      </div>

      {/* === Cambiar contraseña === */}
      <div
        className={`rounded-2xl border bg-white p-4 shadow-sm max-w-xl ${!isMaestro ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">{t('account.passwordSectionTitle')}</h3>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(passwordSectionHelp)}
              className="rounded-md border px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100"
            >
              🔊 {t('account.tts.explainSection', 'Explicar')}
            </button>
          )}
        </div>

        <form onSubmit={changePassword} className="grid gap-3">

          {/* Campo contraseña actual */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-700">{t('account.currentPasswordPlaceholder')}</label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(helpCurrentPw)}
                className="text-[11px] border rounded px-2 py-0.5 bg-slate-50"
              >
                🔊 ¿Qué hacer?
              </button>
            )}
          </div>
          <input
            type="password"
            className="h-10 rounded-xl border px-3"
            value={oldPw}
            onFocus={() => speak(t('account.currentPasswordPlaceholder'))}
            onChange={(e) => setOldPw(e.target.value)}
          />

          {/* Nueva contraseña */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-700">{t('account.newPasswordPlaceholder')}</label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(helpNewPw)}
                className="text-[11px] border rounded px-2 py-0.5 bg-slate-50"
              >
                🔊 ¿Qué hacer?
              </button>
            )}
          </div>
          <input
            type="password"
            className="h-10 rounded-xl border px-3"
            value={pw}
            onFocus={() => speak(t('account.newPasswordPlaceholder'))}
            onChange={(e) => setPw(e.target.value)}
          />

          {/* Confirmar contraseña */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-700">{t('account.confirmPasswordPlaceholder')}</label>
            {voiceEnabled && (
              <button
                type="button"
                onClick={() => speak(helpConfirmPw)}
                className="text-[11px] border rounded px-2 py-0.5 bg-slate-50"
              >
                🔊 ¿Qué hacer?
              </button>
            )}
          </div>
          <input
            type="password"
            className="h-10 rounded-xl border px-3"
            value={pw2}
            onFocus={() => speak(t('account.confirmPasswordPlaceholder'))}
            onChange={(e) => setPw2(e.target.value)}
          />

          {/* Botones */}
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
            >
              {sendingLink ? t('account.requesting') : t('account.resetByEmail')}
            </button>
          </div>
        </form>
      </div>

      {/* === Avatar === */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">{t('account.avatarSectionTitle')}</h3>
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(avatarSectionHelp)}
              className="rounded-md border px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100"
            >
              🔊 {t('account.tts.explainSection', 'Explicar')}
            </button>
          )}
        </div>

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

          {/* Subir */}
          <label className="rounded-lg border px-3 py-2 text-sm cursor-pointer">
            {t('account.uploadLabel')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUploadAvatar(e.target.files[0])}
            />
          </label>

          {/* Eliminar */}
          <button
            type="button"
            onClick={onDeleteAvatar}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {t('account.deleteAvatar')}
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div className="text-sm text-red-600">
          {msg}
        </div>
      )}
    </div>
  )
}
