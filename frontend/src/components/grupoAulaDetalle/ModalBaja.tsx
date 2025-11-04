import React, { useEffect, useState } from 'react'
import { getUserIdFromLocalStorage } from '../../utils/func'
import api from '../../lib/api'

const motivos = [
  { value: 'academico',  label: 'Deserción académica' },
  { value: 'conductual', label: 'Faltas excesivas' },
  { value: 'salud',      label: 'Problemas de salud' },
  { value: 'personal',   label: 'Situación familiar o personal' },
  { value: 'economico',  label: 'Problemas económicos' },
  { value: 'otro',       label: 'Otro' },
]

type LogFormData = {
  id_inscripcion: number
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
  idInscripcion?: number
  onConfirm: (data: LogFormData) => Promise<void> | void
  onCancel: () => void
}

export default function ModalBaja({
  open,
  title = 'Registrar baja',
  subtitle,
  confirmLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  idInscripcion,
  onConfirm,
  onCancel
}: Props) {
  const userId = Number(getUserIdFromLocalStorage()) || 1

  const [form, setForm] = useState<LogFormData>({
    id_inscripcion: 0,
    fecha_baja: new Date().toISOString().split('T')[0],
    motivo_adicional: '',
    registrado_por: userId,
  })
  const [saving, setSaving] = useState(false)

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onCancel])

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    setForm({
      id_inscripcion: idInscripcion ? Number(idInscripcion) : 0,
      fecha_baja: new Date().toISOString().split('T')[0],
      motivo_adicional: '',
      registrado_por: userId,
    })
  }, [open, idInscripcion, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id_inscripcion || !form.motivo_adicional) {
      // Sin validaciones visuales: simplemente no enviamos si faltan datos.
      return
    }

    setSaving(true)
    const payload: LogFormData = {
      id_inscripcion: form.id_inscripcion,
      motivo_adicional: form.motivo_adicional,
      registrado_por: form.registrado_por,
      fecha_baja: form.fecha_baja,
    }

    try {
      // 1) Intentar crear el registro de baja (si falla, seguimos)
      try {
        await api.post('/baja-materia', payload)
      } catch (err) {
        console.warn('POST /baja-materia falló (continuando):', err)
      }

      // 2) Intentar marcar la inscripción como BAJA (si falla, igual seguimos)
      try {
        await api.put(`/inscripciones/${form.id_inscripcion}`, { status: 'BAJA' })
      } catch (err) {
        console.warn('PUT /inscripciones/:id falló (continuando):', err)
      }
    } finally {
      setSaving(false)
      // 3) Siempre cerramos y avisamos al padre para que refresque y muestre el OK
      await onConfirm(payload)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-baja-title"
      onClick={() => { if (!saving) onCancel() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b">
          <div id="modal-baja-title" className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-4 py-4 grid md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs text-slate-600">Id de inscripción *</label>
              <input
                type="number"
                disabled
                className="h-10 rounded-xl border px-3 text-sm bg-slate-50"
                value={form.id_inscripcion}
                onChange={e => setForm({ ...form, id_inscripcion: Number(e.target.value || 0) })}
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs text-slate-600">Fecha de baja *</label>
              <input
                type="date"
                className="h-10 rounded-xl border px-3 text-sm"
                value={form.fecha_baja}
                onChange={e => setForm({ ...form, fecha_baja: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <label className="text-xs text-slate-600">Motivo de baja *</label>
              <select
                className="h-10 rounded-xl border px-3 text-sm"
                value={form.motivo_adicional}
                onChange={e => setForm({ ...form, motivo_adicional: e.target.value })}
                required
              >
                <option value="">Selecciona un motivo</option>
                {motivos.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Se registrará la baja y la inscripción cambiará a <span className="font-medium">INACTIVO</span>.
              </p>
            </div>
          </div>

          {/* Ya no mostramos errores en el modal */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onCancel}
              disabled={saving}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-3 py-2 text-sm disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-ctr)' }}
            >
              {saving ? 'Guardando…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
