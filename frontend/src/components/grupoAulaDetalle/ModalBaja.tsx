import React, { useEffect, useState } from 'react'
import { getUserIdFromLocalStorage } from '../../utils/func'
import api from '../../lib/api'

const motivos = [
    { value: 'académico', label: 'Deserción académica' },
    { value: 'conductual', label: 'Faltas excesivas' },
    { value: 'salud', label: 'Problemas de salud' },
    { value: 'personal', label: 'Situación familiar o personal' },
    { value: 'economico', label: 'Problemas económicos' },
    { value: 'otro', label: 'Otro' },
]

type LogFormData = {
    id_inscripcion: number | ''
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
    onConfirm: (data: LogFormData) => void
    onCancel: () => void
}

export default function ModalBaja({ open, title = 'Registrar baja', subtitle, confirmLabel = 'Guardar', cancelLabel = 'Cancelar', idInscripcion, onConfirm, onCancel }: Props) {
    const [form, setForm] = useState<LogFormData>({
        id_inscripcion: 0,
        fecha_baja: '',
        motivo_adicional: '',
        registrado_por: 1,
    })

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onCancel])

    const userId = getUserIdFromLocalStorage()

    useEffect(() => {
        if (open) {

            setForm({
                id_inscripcion: idInscripcion ? Number(idInscripcion) : 0, // Asegura que sea un número
                fecha_baja: new Date().toISOString().split('T')[0],
                motivo_adicional: '',
                registrado_por: 1,
            })
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        try {
            await api.post('/baja-materia', form);
            onConfirm(form)
            e.preventDefault()
        } catch (e: any) { console.error(e.message || 'Error') }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
            <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="px-4 py-3 border-b">
                    <div className="text-sm font-semibold">{title}</div>
                    {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-4 py-4 grid md:grid-cols-2 gap-3">
                        <div className="grid gap-1">
                            <label className="text-xs text-slate-600">Id de inscripción *</label>
                            <input
                                type="number"
                                disabled
                                className="h-10 rounded-xl border px-3 text-sm"
                                value={form.id_inscripcion}
                                onChange={e => setForm({ ...form, id_inscripcion: e.target.value ? Number(e.target.value) : '' })}
                                required
                            />
                        </div>

                        <div className="grid gap-1">
                            <label className="text-xs text-slate-600">Motivo de baja *</label>
                            <select
                                className="h-10 rounded-xl border px-3 text-sm"
                                value={form.motivo_adicional}
                                onChange={e => setForm({ ...form, motivo_adicional: e.target.value })}
                                required
                            >
                                <option value="">Selecciona un motivo</option>
                                {motivos.map((motivo) => (
                                    <option key={motivo.value} value={motivo.value}>
                                        {motivo.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
                        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onCancel}>{cancelLabel}</button>
                        <button type="submit" className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-ctr)' }}>{confirmLabel}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
