// src/components/inscripciones/CarreraPicker.tsx
import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { getCareerLabel } from '../../lib/labels'
import { Catalogos } from "../../lib/catalogos"

type Props = {
  value?: number | null
  onChange?: (id: number | null) => void
  label?: boolean
  className?: string
}

export default function CarreraPicker({ value, onChange, label = true, className }: Props) {
  const [list, setList] = useState<any[]>([])
  const { t, i18n } = useTranslation()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await Catalogos.carreras()
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      if (!cancelled) setList(arr)
    }
    void load()
    return () => { cancelled = true }
  }, [i18n?.language])

  const selectEl = (
    <select
      className={`w-full truncate box-border ${className ?? ''}`}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value
        onChange?.(v === "" ? null : Number(v))
      }}
    >
      <option value="">{t('pickers.careerPlaceholder')}</option>
      {list.map((c) => (
        <option key={c.id_carrera} value={c.id_carrera}>
          {getCareerLabel(c)}
        </option>
      ))}
    </select>
  )

  // Wrap the select in a shrinkable container so long option text cannot expand the control
  const wrapped = (
    <div className={`select-wrapper min-w-0 overflow-hidden`}>
      {selectEl}
    </div>
  )

  if (!label) return wrapped
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">{t('pickers.careerLabel')}</label>
      {wrapped}
    </div>
  )
}
