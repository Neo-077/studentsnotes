import { useEffect, useState } from "react"
import { Catalogos } from "../../lib/catalogos"

type Props = { value?: number | null; onChange?: (id: number | null) => void }

export default function MateriaPicker({ value, onChange }: Props) {
  const [list, setList] = useState<any[]>([])
  useEffect(() => { Catalogos.materias().then(setList) }, [])
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">Materia</label>
      <select
        className="border rounded-xl px-3 py-2"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todas</option>
        {list.slice(0,5).map(m => (
          <option key={m.id_materia} value={m.id_materia}>{m.nombre}</option>
        ))}
      </select>
    </div>
  )
}
