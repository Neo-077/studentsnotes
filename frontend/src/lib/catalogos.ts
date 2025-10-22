import api from "./api"
export const Catalogos = {
  carreras: () => api.get("/catalogos/carreras"),
  generos: () => api.get("/catalogos/generos"),
  terminos: () => api.get("/catalogos/terminos"),
  modalidades: () => api.get("/catalogos/modalidades"),
  materias: () => api.get("/catalogos/materias"),
  docentes: () => api.get("/catalogos/docentes"),
}
