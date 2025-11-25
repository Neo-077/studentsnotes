// src/components/inscripciones/CarreraPicker.tsx
import { useEffect, useState } from "react"
import { Catalogos } from "../../lib/catalogos"

type Props = {
  value?: number | null
  onChange?: (id: number | null) => void
  label?: boolean
  className?: string
}

export default function CarreraPicker({ value, onChange, label = true, className }: Props) {
  const [list, setList] = useState<any[]>([])
  useEffect(() => {
    Catalogos.carreras().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.rows ?? res?.data ?? [])
      setList(arr)
    })
  }, [])
  const select = (
    <select
      className={`border rounded-xl px-3 py-2 ${className ?? ''}`}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value
        onChange?.(v === "" ? null : Number(v))
      }}
    >
      <option value="">Carrera…</option>
      {list.map((c) => (
        <option key={c.id_carrera} value={c.id_carrera}>
          {c.clave ? `${c.clave} — ` : ''}{c.nombre}
        </option>
      ))}
    </select>
  )

  if (!label) return select
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">Carrera</label>
      {select}
    </div>
  )
}
