// src/components/inscripciones/QuickEnroll.tsx
import React, { useState } from "react"
import { FiPlus } from "react-icons/fi"
import api from "../../lib/api"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

type Props = any

export default function QuickEnroll(_props: Props) {
  const [noControl, setNoControl] = useState("")
  const [groupId, setGroupId] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  async function handleQuickEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!noControl.trim() || !groupId.trim()) {
      const m = "Debes escribir el número de control y el ID de grupo."
      setMessage(m)
      speak(m)
      return
    }

    try {
      setLoading(true)
      setMessage(null)

      const estudiantes = await api.get(
        `/estudiantes?no_control=${encodeURIComponent(noControl.trim())}`
      )
      const est =
        estudiantes?.rows?.[0] ??
        estudiantes?.[0] ??
        null

      if (!est) {
        const m = "No se encontró estudiante con ese número de control."
        setMessage(m)
        speak(m)
        return
      }

      const res = await api.post("/inscripciones", {
        id_estudiante: est.id_estudiante,
        id_grupo: Number(groupId),
      })

      const okMsg = `Inscripción rápida creada #${res.id_inscripcion}.`
      setMessage(okMsg)
      speak(okMsg)
    } catch (e: any) {
      const errMsg = e?.message || "No se pudo completar la inscripción rápida."
      setMessage(errMsg)
      speak(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleQuickEnroll} className="space-y-2">
      <h4 className="font-medium text-sm">Inscripción rápida</h4>

      <input
        className="w-full rounded-xl border px-3 py-2 text-sm shadow-sm"
        placeholder="No. de control"
        value={noControl}
        onChange={(e) => setNoControl(e.target.value)}
        onFocus={() =>
          speak(
            "Campo para escribir el número de control del estudiante a inscribir rápidamente."
          )
        }
      />

      <input
        className="w-full rounded-xl border px-3 py-2 text-sm shadow-sm"
        placeholder="ID de grupo"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        onFocus={() =>
          speak("Campo para escribir el ID del grupo destino.")
        }
      />

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        onMouseEnter={() =>
          speak(
            "Botón para inscribir de forma rápida al estudiante en el grupo indicado."
          )
        }
      >
        <FiPlus className="mr-2" size={16} />
        {loading ? "Inscribiendo..." : "Inscribir rápido"}
      </button>

      {message && <p className="text-xs mt-1">{message}</p>}
    </form>
  )
}
