// src/components/inscripciones/SemestrePicker.tsx
import { useRef } from "react"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

type Props = { value?: number | null; onChange?: (n: number | null) => void }

export default function SemestrePicker({ value, onChange }: Props) {
  const semestres = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))
  const lastSpoken = useRef<string | null>(null)

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    if (lastSpoken.current === text) return
    lastSpoken.current = text
    TTS.speak(text, { rate: voiceRate })
  }

  const handleFocus: React.FocusEventHandler<HTMLSelectElement> = () => {
    speak("Selector de semestre. Usa las flechas para elegir el semestre.")
  }

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const v = e.target.value
    const n = v ? Number(v) : null
    onChange?.(n)
    if (n != null) speak(`Semestre seleccionado: ${n}`)
  }

  const handleMouseMove: React.MouseEventHandler<HTMLSelectElement> = (e) => {
    const sel = e.currentTarget
    const opt = sel.options[sel.selectedIndex]
    if (opt) speak(`Opción: semestre ${opt.text}`)
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600" htmlFor="semester-select">
        Semestre
      </label>
      <select
        id="semester-select"
        className="border rounded-xl px-3 py-2"
        value={value ?? ""}
        onChange={handleChange}
        onFocus={handleFocus}
        onMouseMove={handleMouseMove}
        aria-label="Semestre"
      >
        <option value="">Todos</option>
        {semestres.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}
