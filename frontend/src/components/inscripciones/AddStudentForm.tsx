import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import api from "../../lib/api"
import { Catalogos } from "../../lib/catalogos"

const schema = z.object({
  no_control: z.string().min(3, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  ap_paterno: z.string().min(1, "Requerido"),
  ap_materno: z.string().optional(),
  id_genero: z.coerce.number(),
  id_carrera: z.coerce.number(),
  fecha_nacimiento: z.string().optional(),
})

export default function AddStudentForm({
  defaultCarreraId,
}: {
  defaultCarreraId?: number
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { id_carrera: defaultCarreraId } as any,
  })
  const [generos, setGeneros] = useState<any[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    Catalogos.generos().then(setGeneros)
    Catalogos.carreras().then(setCarreras)
  }, [])

  const onSubmit = async (values: any) => {
    try {
      setLoading(true)
      setMsg(null)
      await api.post("/estudiantes", values)
      setMsg("✅ Estudiante creado")
      reset({ id_carrera: defaultCarreraId } as any)
    } catch (e: any) {
      setMsg("❌ " + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft space-y-3">
      <h4 className="font-medium">Agregar estudiante</h4>

      <div className="grid grid-cols-2 gap-3">
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="No. control*"
          {...register("no_control")}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Nombre(s)*"
          {...register("nombre")}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Apellido paterno*"
          {...register("ap_paterno")}
        />
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="Apellido materno"
          {...register("ap_materno")}
        />

        <select className="border rounded-xl px-3 py-2" {...register("id_genero")}>
          <option value="">Género</option>
          {generos.map((g) => (
            <option key={g.id_genero} value={g.id_genero}>
              {g.descripcion}
            </option>
          ))}
        </select>

        <select
          className="border rounded-xl px-3 py-2"
          {...register("id_carrera")}
          defaultValue={defaultCarreraId}
        >
          <option value="">Carrera</option>
          {carreras.map((c) => (
            <option key={c.id_carrera} value={c.id_carrera}>
              {c.nombre}
            </option>
          ))}
        </select>

        <input
          className="border rounded-xl px-3 py-2 col-span-2"
          type="date"
          placeholder="Fecha nacimiento"
          {...register("fecha_nacimiento")}
        />
      </div>

      {(errors.no_control || errors.nombre || errors.ap_paterno) && (
        <p className="text-sm text-red-600">Completa los campos obligatorios.</p>
      )}

      <button
        onClick={handleSubmit(onSubmit)}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2"
      >
        {loading ? "Guardando..." : "Guardar estudiante"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}
