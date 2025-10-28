// src/lib/catalogos.ts
import api from "./api"

type MateriasParams = {
  carrera_id?: number
  termino_id?: number
}

export const Catalogos = {
  carreras: () => api.get("/catalogos/carreras"),
  generos: () => api.get("/catalogos/generos"),
  terminos: () => api.get("/catalogos/terminos"),
  modalidades: () => api.get("/catalogos/modalidades"),
  docentes: () => api.get("/catalogos/docentes"),

  // ✅ acepta filtros opcionales
  materias: (params?: MateriasParams) => {
    const qs = new URLSearchParams()
    if (params?.carrera_id) qs.set("carrera_id", String(params.carrera_id))
    if (params?.termino_id) qs.set("termino_id", String(params.termino_id))
    const path = qs.toString()
      ? `/catalogos/materias?${qs.toString()}`
      : "/catalogos/materias"
    return api.get(path)
  },

  // (opcionales) helpers para crear desde la UI de catálogos
  crearDocente: (body: any) => api.post("/docentes", body),
  crearMateria: (body: any) => api.post("/materias", body),
}
