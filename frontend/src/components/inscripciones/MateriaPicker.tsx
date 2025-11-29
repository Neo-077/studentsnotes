// src/components/inscripciones/MateriaPicker.tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSubjectLabel, getCareerLabel } from '../../lib/labels'
import { Catalogos } from '../../lib/catalogos'

type Materia = {
  id_materia: number
  clave?: string
  nombre: string
  // opcionales, dependen del backend
  carrera?: { nombre?: string; clave?: string }
  carrera_nombre?: string
  carrera_clave?: string
}

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

  const { t, i18n } = useTranslation()

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      try {
        // si hay carrera/termino los pasamos como query
        const listRaw = await Catalogos.materias({
          carrera_id: carreraId ?? undefined,
          termino_id: terminoId ?? undefined,
        })
        const list = Array.isArray(listRaw) ? listRaw : (listRaw?.rows ?? listRaw?.data ?? [])
        if (!cancel) setItems(list ?? [])
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    void load()
    return () => { cancel = true }
    // reload materias when carrera, termino or language change
  }, [carreraId, terminoId, i18n?.language])

  const selectEl = (
    <select
      className={`h-10 w-full truncate box-border ${className ?? ''}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled || loading}
    >
      <option value="">{t('pickers.subjectAll')}</option>
      {(() => {
        const byName = (a: string, b: string) => a.localeCompare(b, i18n?.language?.startsWith('en') ? 'en' : 'es', { sensitivity: 'base' })
        const labelFor = (m: Materia) => {
          const s = getSubjectLabel(m)
          return s || `${m.clave ? `${m.clave} — ` : ''}${m.nombre}`
        }

        // Si hay carrera seleccionada, lista plana ordenada por nombre/clave
        if (carreraId) {
          const list = [...items].sort((a, b) => byName(labelFor(a), labelFor(b)))
          return list.map(m => (
            <option key={`${m.id_materia}`} value={m.id_materia}>
              {getSubjectLabel(m)}
            </option>
          ))
        }

        // Sin carrera: agrupar por carrera y ordenar
        const groups = new Map<string, Materia[]>()
        for (const m of items) {
          const carreraObj = m.carrera || (m.carrera_nombre ? { nombre: m.carrera_nombre } : undefined)
          const carreraLabel = getCareerLabel(carreraObj) || m.carrera_nombre || m.carrera_clave || '— Sin carrera'
          const arr = groups.get(carreraLabel) || []
          arr.push(m)
          groups.set(carreraLabel, arr)
        }
        const carreraNames = Array.from(groups.keys()).sort(byName)
        return carreraNames.map((car) => {
          const list = (groups.get(car) || []).sort((a, b) => byName(labelFor(a), labelFor(b)))
          return (
            <optgroup key={car} label={car}>
              {list.map(m => (
                <option key={`${car}:${m.id_materia}`} value={m.id_materia}>
                  {getSubjectLabel(m)}
                </option>
              ))}
            </optgroup>
          )
        })
      })()}
    </select>
  )

  // Wrap select in shrinkable container so long labels don't expand it
  return (
    <div className={`select-wrapper min-w-0 overflow-hidden`}>
      {selectEl}
    </div>
  )
}
