// src/components/inscripciones/MateriaPicker.tsx
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Catalogos } from "../../lib/catalogos"
import { getSubjectLabel } from "../../lib/labels"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

type Props = {
  value?: number | null
  onChange?: (id: number | null) => void
  terminoId?: number
  carreraId?: number
  disabled?: boolean
  className?: string
}

export default function MateriaPicker({
  value,
  onChange,
  terminoId,
  carreraId,
  disabled,
  className,
}: Props) {
  const { t, i18n } = useTranslation()
  const [list, setList] = useState<any[]>([])

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
    async function load() {
      if (!carreraId && !terminoId) {
        setList([])
        return
      }
      const params: any = {}
      if (carreraId) params.carrera_id = carreraId
      if (terminoId) params.termino_id = terminoId
      const res = await Catalogos.materias(params)
      const arr = Array.isArray(res) ? res : res?.rows ?? res?.data ?? []
      setList(arr)
    }
    void load()
  }, [carreraId, terminoId, i18n?.language])

  const handleFocus: React.FocusEventHandler<HTMLSelectElement> = () => {
    speak(
      t(
        "pickers.subjectHelp",
        "Selector de materia. Primero elige una carrera si es necesario."
      )
    )
  }

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const v = e.target.value
    const selected = list.find((m) => String(m.id_materia) === v) ?? null
    onChange?.(v === "" ? null : Number(v))
    if (selected) {
      speak(
        t("pickers.subjectSelected", "Materia seleccionada: {{label}}", {
          label: getSubjectLabel(selected),
        })
      )
    }
  }

  const handleMouseMove: React.MouseEventHandler<HTMLSelectElement> = (e) => {
    const sel = e.currentTarget
    const opt = sel.options[sel.selectedIndex]
    if (opt) {
      speak(
        t("pickers.subjectOption", "Opción: {{label}}", {
          label: opt.text,
        })
      )
    }
  }

  return (
    <select
      className={`h-10 rounded-xl border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full ${className ?? ""
        }`}
      value={value ?? ""}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseMove={handleMouseMove}
      disabled={disabled}
      aria-label={t("pickers.subjectLabel", "Materia")}
    >
      <option value="">{t("pickers.subjectPlaceholder", "Selecciona materia")}</option>
      {list.map((m) => (
        <option key={m.id_materia} value={m.id_materia}>
          {getSubjectLabel(m)}
        </option>
      ))}
    </select>
  )
}
