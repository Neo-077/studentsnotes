// src/components/inscripciones/FieldWithVoice.tsx
import React from "react"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"
import { useTranslation } from "react-i18next"

type FieldWithVoiceProps = {
  /** id único del campo */
  id: string
  /** Etiqueta que describe el campo (se va a leer al enfocar) */
  label: string
  /** Texto que explica qué se debe hacer en el campo (para el botón 🔊) */
  instructions?: string
  /** Texto extra de ayuda debajo del label */
  description?: string
  /** El input / select / textarea que quieras envolver */
  children: React.ReactElement
}

export const FieldWithVoice: React.FC<FieldWithVoiceProps> = ({
  id,
  label,
  instructions,
  description,
  children,
}) => {
  const { t } = useTranslation()
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    TTS.speak(text, { rate: voiceRate })
  }

  // Clonamos el input para agregarle onFocus + aria
  const handleFocus: React.FocusEventHandler<HTMLElement> = (e) => {
    // Primero leemos el nombre del campo
    speak(label)

    // Respetamos cualquier onFocus que el input ya tuviera
    const originalOnFocus = (children.props as any).onFocus
    if (originalOnFocus) {
      originalOnFocus(e)
    }
  }

  const existingDescribedBy = (children.props as any)["aria-describedby"] as
    | string
    | undefined

  const describedBy = [
    existingDescribedBy,
    description ? `${id}-help` : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  const enhancedChild = React.cloneElement(children, {
    id,
    "aria-label": label,
    "aria-describedby": describedBy || undefined,
    onFocus: handleFocus,
  })

  const instructionsText =
    instructions ||
    t(
      "enrollmentsPage.defaultFieldInstructions",
      "En este campo debes escribir: {{label}}.",
      { label }
    )

  const ariaButtonLabel = t(
    "enrollmentsPage.fieldInstructionsButtonAria",
    "Escuchar instrucciones del campo {{label}}",
    { label }
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-xs font-medium text-slate-700"
        >
          {label}
        </label>

        {/* Botón 🔊 para leer qué se debe hacer en el campo */}
        <button
          type="button"
          onClick={() => speak(instructionsText)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={ariaButtonLabel}
        >
          <span aria-hidden="true">🔊</span>
          <span>
            {t("enrollmentsPage.fieldHelpButton", "¿Qué debo escribir?")}
          </span>
        </button>
      </div>

      {description && (
        <p id={`${id}-help`} className="text-[11px] text-slate-500">
          {description}
        </p>
      )}

      <div>{enhancedChild}</div>
    </div>
  )
}

export default FieldWithVoice
