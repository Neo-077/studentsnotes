import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import confirmService, { onConfirmRequest } from '../lib/confirmService'

type Props = {
  open?: boolean
  title?: string
  subtitle?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  children?: React.ReactNode
}

export default function ConfirmModal(props?: Props) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<any | null>(null)

  useEffect(() => {
    const off = onConfirmRequest((p) => setPending(p))
    return off
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { pending.resolve(false); confirmService.clearRequest(); setPending(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  // If props.open is explicitly provided, behave as a controlled prop-based modal
  if (props && typeof props.open !== 'undefined') {
    const {
      open, title: pTitle, subtitle: pSubtitle, confirmLabel: pConfirmLabel, cancelLabel: pCancelLabel, danger: pDanger, onCancel, onConfirm, children
    } = props
    if (!open) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-black/20 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-semibold">{pTitle ?? t('confirm.title')}</h3>
              {pSubtitle ? <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{pSubtitle}</p> : null}
            </div>
            <button onClick={onCancel} aria-label={pCancelLabel ?? t('confirm.no')} className="text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white">
              <FiX />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
            <button onClick={onCancel} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400">
              {pCancelLabel ?? t('confirm.no')}
            </button>
            <button onClick={onConfirm} className={`rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${pDanger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300 focus:ring-emerald-300'}`}>
              {pConfirmLabel ?? t('confirm.yes')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Service-backed modal (default)
  if (!pending) return null

  const opts = pending.opts || {}

  const title = opts.titleKey ? t(opts.titleKey) : (opts.titleText || t('confirm.title'))
  const description = opts.descriptionKey ? t(opts.descriptionKey) : (opts.descriptionText || '')
  const confirmLabel = opts.confirmLabelKey ? t(opts.confirmLabelKey) : (opts.confirmLabelText || t('confirm.yes'))
  const cancelLabel = opts.cancelLabelKey ? t(opts.cancelLabelKey) : (opts.cancelLabelText || t('confirm.no'))
  const danger = !!opts.danger

  function doCancel() {
    pending.resolve(false)
    confirmService.clearRequest()
    setPending(null)
  }

  function doConfirm() {
    pending.resolve(true)
    confirmService.clearRequest()
    setPending(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="w-full max-w-lg bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-black/20 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 id="confirm-modal-title" className="text-lg font-semibold">{title}</h3>
            {description ? <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{description}</p> : null}
          </div>
          <button onClick={doCancel} aria-label={t('confirm.no')} className="text-slate-300 hover:text-white">
            <FiX />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* optional area for extra content in future */}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-700">
          <button onClick={doCancel} className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400">
            {cancelLabel}
          </button>
          <button onClick={doConfirm} className={`rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300 focus:ring-emerald-300'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

