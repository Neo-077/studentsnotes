// src/components/inscripciones/EnrollPanel.tsx
import { useEffect, useRef, useState } from "react"
import api from "../../lib/api"
import i18n from "i18next"
import { FiPlus } from "react-icons/fi"
import { useAccessibility } from "../../store/useAccessibility"
import { TTS } from "../../lib/tts"

type Props = {
  groupId?: number | null
  onChangeGroupId?: (id: number | null) => void
}

export default function EnrollPanel({ groupId, onChangeGroupId }: Props) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [localGroup, setLocalGroup] = useState<number | null>(groupId ?? null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))
  const speakLock = useRef(false)

  const speak = (text?: string) => {
    if (!voiceEnabled) return
    if (!text) return
    if (!TTS.isSupported()) return
    TTS.speak(text, { rate: voiceRate })
  }

  // Sincroniza prop → estado local
  useEffect(() => {
    if (groupId !== undefined) setLocalGroup(groupId ?? null)
  }, [groupId])

  // Búsqueda de estudiantes
  useEffect(() => {
    if (q.length < 2) {
      setResults([])
      return
    }
    const id = setTimeout(async () => {
      try {
        let path = `/estudiantes?q=${encodeURIComponent(q)}&page=1&pageSize=10`
        if (i18n?.language && String(i18n.language).startsWith("en"))
          path += "&lang=en"
        const data = await api.get(path)
        setResults(data?.rows ?? [])
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(id)
  }, [q])

  async function inscribir() {
    if (!selectedStudent) {
      const msg = "❌ Selecciona un estudiante"
      setMessage(msg)
      speak(msg)
      return
    }
    if (!localGroup) {
      const msg = "❌ Selecciona un grupo"
      setMessage(msg)
      speak(msg)
      return
    }
    try {
      setLoading(true)
      setMessage(null)
      const res = await api.post("/inscripciones", {
        id_estudiante: selectedStudent.id_estudiante,
        id_grupo: localGroup,
      })
      const okMsg = "✅ Inscripción creada #" + res.id_inscripcion
      setMessage(okMsg)
      speak(okMsg)
    } catch (e: any) {
      const errMsg = "❌ " + e.message
      setMessage(errMsg)
      speak(errMsg)
    } finally {
      setLoading(false)
    }
  }

  function handleGroupInput(val: number | null) {
    setLocalGroup(val)
    onChangeGroupId?.(val)
  }

  const handleSearchFocus: React.FocusEventHandler<HTMLInputElement> = () => {
    if (speakLock.current) return
    speakLock.current = true
    speak(
      "Campo de búsqueda de estudiantes. Escribe número de control o nombre."
    )
    setTimeout(() => {
      speakLock.current = false
    }, 1500)
  }

  const handleGroupFocus: React.FocusEventHandler<HTMLInputElement> = () => {
    speak("Campo para escribir el ID de grupo donde se inscribirá.")
  }

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft space-y-3">
      <h4 className="font-medium">Inscribir estudiante</h4>

      <input
        className="w-full border rounded-xl px-3 py-2"
        placeholder="Buscar (no_control o nombre)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={handleSearchFocus}
        aria-label="Buscar estudiante por número de control o nombre"
      />

      {results.length > 0 && (
        <div className="border rounded-xl max-h-40 overflow-auto">
          {results.map((s) => (
            <button
              key={s.id_estudiante}
              onClick={() => {
                setSelectedStudent(s)
                speak(
                  `Estudiante seleccionado: ${s.no_control}, ${s.nombre} ${s.ap_paterno}`
                )
              }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                selectedStudent?.id_estudiante === s.id_estudiante
                  ? "bg-gray-100"
                  : ""
              }`}
            >
              {s.no_control} — {s.nombre} {s.ap_paterno}
            </button>
          ))}
        </div>
      )}

      <input
        className="w-full border rounded-xl px-3 py-2"
        placeholder="ID de grupo (ej. 1)"
        value={localGroup ?? ""}
        onChange={(e) =>
          handleGroupInput(e.target.value ? Number(e.target.value) : null)
        }
        onFocus={handleGroupFocus}
        aria-label="ID del grupo donde se inscribirá el estudiante"
      />

      <button
        onClick={inscribir}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2 inline-flex items-center justify-center"
        aria-label="Botón para crear la inscripción"
      >
        <FiPlus className="mr-2" size={16} />
        {loading ? "Inscribiendo..." : "Inscribir"}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}
