// src/components/inscripciones/MateriaPicker.tsx
import { useEffect, useState } from 'react'
import { Catalogos } from '../../lib/catalogos'

type Materia = { id_materia: number; clave?: string; nombre: string }

type Props = {
  value?: number | null
  onChange: (v: number | null) => void
  terminoId?: number            // ← nuevo (opcional)
  carreraId?: number            // ← nuevo (opcional)
  className?: string
  disabled?: boolean
}

export default function MateriaPicker({
  value,
  onChange,
  terminoId,
  carreraId,
  className,
  disabled,
}: Props) {
  const [items, setItems] = useState<Materia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      try {
        // si hay carrera/termino los pasamos como query
        const list = await Catalogos.materias({
          carrera_id: carreraId ?? undefined,
          termino_id: terminoId ?? undefined,
        })
        if (!cancel) setItems(list ?? [])
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [carreraId, terminoId])

  return (
    <select
      className={`h-10 rounded-xl border px-3 text-sm ${className ?? ''}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled || loading}
    >
      <option value="">Todas</option>
      {items.map(m => (
        <option key={m.id_materia} value={m.id_materia}>
          {m.clave ? `${m.clave} — ` : ''}{m.nombre}
        </option>
      ))}
    </select>
  )
}
