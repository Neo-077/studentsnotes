import React, { useEffect, useState } from 'react'
import { getUserIdFromLocalStorage } from '../../utils/func'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi'

const motivos = [
  { value: 'academico', key: 'students.dropModal.reasons.academico' },
  { value: 'conductual', key: 'students.dropModal.reasons.conductual' },
  { value: 'salud', key: 'students.dropModal.reasons.salud' },
  { value: 'personal', key: 'students.dropModal.reasons.personal' },
  { value: 'economico', key: 'students.dropModal.reasons.economico' },
  { value: 'otro', key: 'students.dropModal.reasons.otro' },
]

type BajaEstudianteFormData = {
  id_estudiante: number
  motivo_adicional: string
  registrado_por: number
  fecha_baja: string
}

type Props = {
  open: boolean
  title?: string
  subtitle?: string
  confirmLabel?: string
  cancelLabel?: string
  idEstudiante?: number
  onConfirm: (data: BajaEstudianteFormData) => Promise<void> | void
  onCancel: () => void
}

export default function ModalBajaEstudiante({
  open,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  idEstudiante,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  const userId = Number(getUserIdFromLocalStorage()) || 1

  const [form, setForm] = useState<BajaEstudianteFormData>({
    id_estudiante: 0,
    fecha_baja: new Date().toISOString().split('T')[0],
    motivo_adicional: '',
    registrado_por: userId,
  })
  const [saving, setSaving] = useState(false)

  const resolvedTitle = title ?? t('students.dropModal.title')
  const resolvedConfirmLabel = confirmLabel ?? t('students.dropModal.confirm')
  const resolvedCancelLabel = cancelLabel ?? t('students.dropModal.cancel')

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onCancel])

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    setForm({
      id_estudiante: idEstudiante ? Number(idEstudiante) : 0,
      fecha_baja: new Date().toISOString().split('T')[0],
      motivo_adicional: '',
      registrado_por: userId,
    })
  }, [open, idEstudiante, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id_estudiante || !form.motivo_adicional) {
      return
    }

    setSaving(true)
    const payload: BajaEstudianteFormData = {
      id_estudiante: form.id_estudiante,
      motivo_adicional: form.motivo_adicional,
      registrado_por: form.registrado_por,
      fecha_baja: form.fecha_baja,
    }

    try {
      await api.post(
        `/estudiantes/${form.id_estudiante}/baja`,
        payload,
        { skipConfirm: true } as any
      )

      // ✅ notifyService correctamente: default.notify(...)
      try {
        ;(await import('../../lib/notifyService')).default.notify({
          type: 'success',
          message: t('students.messages.droppedWithId', {
            id: form.id_estudiante,
          }),
        })
      } catch {
        // noop
      }

      await onConfirm(payload)
    } catch (err: any) {
      console.error('Error al dar de baja estudiante:', err)
      const format = (await import('../../lib/errorFormatter')).default
      const msg = format(err, { entity: 'el estudiante', action: 'delete' })

      try {
        ;(await import('../../lib/notifyService')).default.notify({
          type: 'error',
          message: msg,
        })
      } catch {
        // noop
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-baja-estudiante-title"
      onClick={() => {
        if (!saving) onCancel()
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-lg ring-1 ring-black/10 dark:ring-black/20 border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b">
          <div
            id="modal-baja-estudiante-title"
            className="text-sm font-semibold"
          >
            {resolvedTitle}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-600">{subtitle}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-4 py-4 grid md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">
                {t('students.dropModal.studentIdLabel')}
              </label>
              <input
                type="number"
                disabled
                className="h-10 rounded-xl border px-3 text-sm bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-600"
                value={form.id_estudiante}
                onChange={(e) =>
                  setForm({
                    ...form,
                    id_estudiante: Number(e.target.value || 0),
                  })
                }
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">
                {t('students.dropModal.dropDateLabel')}{' '}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                type="date"
                className="h-10 rounded-xl border px-3 text-sm bg-transparent text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-600"
                value={form.fecha_baja}
                onChange={(e) =>
                  setForm({ ...form, fecha_baja: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <label className="text-xs text-slate-600 dark:text-slate-300">
                {t('students.dropModal.reasonLabel')}{' '}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                className="h-10 rounded-xl border px-3 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-600"
                value={form.motivo_adicional}
                onChange={(e) =>
                  setForm({ ...form, motivo_adicional: e.target.value })
                }
                required
                aria-required="true"
              >
                <option value="">
                  {t('students.dropModal.selectReason')}
                </option>
                {motivos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(m.key)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('students.dropModal.helperText')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm disabled:opacity-60 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
              onClick={onCancel}
              disabled={saving}
            >
              <FiArrowLeft className="mr-2" size={16} />
              {resolvedCancelLabel}
            </button>
            <button
              type="submit"
              disabled={saving || !form.motivo_adicional}
              className="rounded-md px-3 py-2 text-sm disabled:opacity-60 bg-red-600 text-white hover:bg-red-700 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
            >
              <FiTrash2 className="mr-2" size={16} />
              {saving
                ? t('students.dropModal.saving')
                : resolvedConfirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
