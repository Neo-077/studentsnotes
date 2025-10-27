import { Router } from "express"
import { z } from "zod"
import { createEstudiante } from "../services/estudiantes.service.js"

const router = Router()

// Validación del body
const bodySchema = z.object({
  nombre: z.string().min(1),
  ap_paterno: z.string().min(1),
  ap_materno: z.string().optional(),
  id_genero: z.number().int().positive(),
  id_carrera: z.number().int().positive(),
  fecha_nacimiento: z.string().optional(), // formato 'YYYY-MM-DD'
})

// POST /estudiantes → insertar nuevo registro
router.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body)
    const data = await createEstudiante(body)
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

export default router
