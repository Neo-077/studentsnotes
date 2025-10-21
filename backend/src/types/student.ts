
export type Student = {
  id?: string
  nombre: string
  matricula: string
  carrera: string
  semestre: number
  materia1?: string
  materia2?: string
  materia3?: string
  cal_materia1?: number
  cal_materia2?: number
  cal_materia3?: number
  asistencia?: number
  conducta?: string
  factores_riesgo?: string[]
  promedio?: number
  estado?: string
  created_at?: string
}
