// src/components/inscripciones/CarreraPicker.tsx
import { useEffect, useState } from "react"
import { Catalogos } from "../../lib/catalogos"

type Props = { value?: number; onChange?: (id: number) => void }

export default function CarreraPicker({ value, onChange }: Props) {
  const [list, setList] = useState<any[]>([])
  useEffect(() => { Catalogos.carreras().then(setList) }, [])
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">Carrera</label>
      <select
        className="border rounded-xl px-3 py-2"
        value={value ?? ""}
        onChange={(e) => onChange?.(Number(e.target.value))}
      >
        <option value="" disabled>Selecciona...</option>
        {list.map((c) => (
          <option key={c.id_carrera} value={c.id_carrera}>
            {c.clave ? `${c.clave} — ` : ''}{c.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
