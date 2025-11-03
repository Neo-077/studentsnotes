import React, { useEffect } from 'react'

type Props = {
  open: boolean
  title?: string
  subtitle?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export default function ConfirmModal({ open, title = 'Confirmar', subtitle, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger, onConfirm, onCancel, children }: Props){
  useEffect(()=>{
    if (!open) return
    const onKey = (e: KeyboardEvent)=>{ if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-lg" onClick={(e)=> e.stopPropagation()}>
        <div className="px-4 py-3 border-b">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
        </div>
        <div className="px-4 py-4">
          {children}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <button className="rounded-md border px-3 py-2 text-sm" onClick={onCancel}>{cancelLabel}</button>
          <button className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: danger ? 'var(--danger-bg)' : 'var(--primary)', color: danger ? 'var(--danger-fg)' : 'var(--primary-ctr)' }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
