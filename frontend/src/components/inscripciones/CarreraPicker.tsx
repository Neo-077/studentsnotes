// src/components/inscripciones/CarreraPicker.tsx
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getCareerLabel } from "../../lib/labels"
import { Catalogos } from "../../lib/catalogos"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

type Props = {
  value?: number | null
  onChange?: (id: number | null) => void
  label?: boolean
  className?: string
}

export default function CarreraPicker({
  value,
  onChange,
  label = true,
  className,
}: Props) {
  const [list, setList] = useState<any[]>([])
  const { t, i18n } = useTranslation()

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

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await Catalogos.carreras()
      const arr = Array.isArray(res) ? res : res?.rows ?? res?.data ?? []
      if (!cancelled) setList(arr)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [i18n?.language])

  const handleFocus: React.FocusEventHandler<HTMLSelectElement> = () => {
    speak(
      t(
        "pickers.careerHelp",
        "Selector de carrera. Usa las flechas para elegir una carrera."
      )
    )
  }

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const v = e.target.value
    const selected =
      list.find((c) => String(c.id_carrera) === v) ?? null
    onChange?.(v === "" ? null : Number(v))
    if (selected) {
      speak(
        t("pickers.careerSelected", "Carrera seleccionada: {{label}}", {
          label: getCareerLabel(selected),
        })
      )
    }
  }

  const handleMouseMove: React.MouseEventHandler<HTMLSelectElement> = (e) => {
    const sel = e.currentTarget
    const opt = sel.options[sel.selectedIndex]
    if (opt) {
      speak(
        t("pickers.careerOption", "Opción: {{label}}", {
          label: opt.text,
        })
      )
    }
  }

  const selectEl = (
    <select
      className={`w-full truncate box-border ${className ?? ""}`}
      value={value ?? ""}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseMove={handleMouseMove}
      aria-label={t("pickers.careerLabel", "Carrera")}
      aria-describedby="career-help"
    >
      <option value="">{t("pickers.careerPlaceholder")}</option>
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
      <p id="career-help" className="sr-only">
        {t(
          "pickers.careerAriaHelp",
          "Abre la lista y usa flechas para escuchar cada carrera."
        )}
      </p>
    </div>
  )

  if (!label) return wrapped
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-600">
        {t("pickers.careerLabel")}
      </label>
      {wrapped}
    </div>
  )
}
