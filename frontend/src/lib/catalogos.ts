// src/lib/catalogos.ts
import api from "./api"
import i18n from 'i18next'

type MateriasParams = {
  carrera_id?: number
  termino_id?: number
}

export const Catalogos = {
  carreras: () => {
    let path = "/catalogos/carreras"
    if (i18n?.language && String(i18n.language).startsWith("en")) path += "?lang=en"
    return api.get(path)
  },
  generos: () => {
    let path = "/catalogos/generos"
    if (i18n?.language && String(i18n.language).startsWith("en")) path += "?lang=en"
    return api.get(path)
  },
  terminos: () => {
    let path = "/catalogos/terminos"
    if (i18n?.language && String(i18n.language).startsWith("en")) path += "?lang=en"
    return api.get(path)
  },
  modalidades: () => {
    let path = "/catalogos/modalidades"
    if (i18n?.language && String(i18n.language).startsWith("en")) path += "?lang=en"
    return api.get(path)
  },
  docentes: () => {
    let path = "/catalogos/docentes"
    if (i18n?.language && String(i18n.language).startsWith("en")) path += "?lang=en"
    return api.get(path)
  },

  // ✅ acepta filtros opcionales
  materias: (params?: MateriasParams) => {
    const qs = new URLSearchParams()
    if (params?.carrera_id) qs.set("carrera_id", String(params.carrera_id))
    if (params?.termino_id) qs.set("termino_id", String(params.termino_id))
    let path = qs.toString() ? `/catalogos/materias?${qs.toString()}` : "/catalogos/materias"
    if (i18n?.language && String(i18n.language).startsWith("en")) {
      path += (path.includes("?") ? "&" : "?") + "lang=en"
    }
    return api.get(path)
  },

  // (opcionales) helpers para crear desde la UI de catálogos
  crearDocente: (body: any) => api.post("/docentes", body),
  crearMateria: (body: any) => api.post("/materias", body),
}
