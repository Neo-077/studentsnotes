import { useEffect, useState } from "react"
import api from "../../lib/api"

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
        const data = await api.get(`/estudiantes?q=${encodeURIComponent(q)}`)
        setResults(data)
      } catch {
        /* noop */
      }
    }, 300)
    return () => clearTimeout(id)
  }, [q])

  async function inscribir() {
    if (!selectedStudent) {
      setMessage("❌ Selecciona un estudiante")
      return
    }
    if (!localGroup) {
      setMessage("❌ Selecciona un grupo")
      return
    }
    try {
      setLoading(true)
      setMessage(null)
      const res = await api.post("/inscripciones", {
        id_estudiante: selectedStudent.id_estudiante,
        id_grupo: localGroup,
      })
      setMessage("✅ Inscripción creada #" + res.id_inscripcion)
    } catch (e: any) {
      setMessage("❌ " + e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleGroupInput(val: number | null) {
    setLocalGroup(val)
    onChangeGroupId?.(val)
  }

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft space-y-3">
      <h4 className="font-medium">Inscribir estudiante</h4>

      <input
        className="w-full border rounded-xl px-3 py-2"
        placeholder="Buscar (no_control o nombre)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {results.length > 0 && (
        <div className="border rounded-xl max-h-40 overflow-auto">
          {results.map((s) => (
            <button
              key={s.id_estudiante}
              onClick={() => setSelectedStudent(s)}
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
      />

      <button
        onClick={inscribir}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2"
      >
        {loading ? "Inscribiendo..." : "Inscribir"}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}
