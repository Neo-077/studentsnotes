type Props = { value?: number | null; onChange?: (n: number | null) => void }

export default function SemestrePicker({ value, onChange }: Props) {
  const semestres = [1,2,3,4,5,6,7,8,9,10]
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">Semestre</label>
      <select
        className="border rounded-xl px-3 py-2"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos</option>
        {semestres.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  )
}
