import React, { useEffect, useState } from 'react'
import { getUserIdFromLocalStorage } from '../../utils/func'
import api from '../../lib/api'

const motivos = [
    { value: 'academico', label: 'Deserción académica' },
    { value: 'conductual', label: 'Faltas excesivas' },
    { value: 'salud', label: 'Problemas de salud' },
    { value: 'personal', label: 'Situación familiar o personal' },
    { value: 'economico', label: 'Problemas económicos' },
    { value: 'otro', label: 'Otro' },
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
    title = 'Dar de baja estudiante',
    subtitle,
    confirmLabel = 'Dar de baja',
    cancelLabel = 'Cancelar',
    idEstudiante,
    onConfirm,
    onCancel
}: Props) {
    const userId = Number(getUserIdFromLocalStorage()) || 1

    const [form, setForm] = useState<BajaEstudianteFormData>({
        id_estudiante: 0,
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
            await api.post(`/estudiantes/${form.id_estudiante}/baja`, payload)
        } finally {
            setSaving(false)
            await onConfirm(payload)
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-baja-estudiante-title"
            onClick={() => { if (!saving) onCancel() }}
        >
            <div
                className="w-full max-w-2xl rounded-2xl border bg-white shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b">
                    <div id="modal-baja-estudiante-title" className="text-sm font-semibold">{title}</div>
                    {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-4 py-4 grid md:grid-cols-2 gap-3">
                        <div className="grid gap-1">
                            <label className="text-xs text-slate-600">Id de estudiante *</label>
                            <input
                                type="number"
                                disabled
                                className="h-10 rounded-xl border px-3 text-sm bg-slate-50"
                                value={form.id_estudiante}
                                onChange={e => setForm({ ...form, id_estudiante: Number(e.target.value || 0) })}
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
                                El estudiante será marcado como inactivo y todas sus inscripciones activas serán dadas de baja.
                            </p>
                        </div>
                    </div>

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
                            disabled={saving || !form.motivo_adicional}
                            className="rounded-md px-3 py-2 text-sm disabled:opacity-60 bg-red-600 text-white hover:bg-red-700"
                        >
                            {saving ? 'Guardando…' : confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

