import { Router } from 'express'
import { z } from 'zod'
import { searchEstudiantes, createEstudiante } from '../services/estudiantes.service.js'

const querySchema = z.object({
  carrera_id: z.coerce.number().optional(),
  q: z.string().optional()
})

const bodySchema = z.object({
  no_control: z.string().min(3),
  nombre: z.string().min(1),
  ap_paterno: z.string().min(1),
  ap_materno: z.string().optional(),
  id_genero: z.number().int().positive(),
  id_carrera: z.number().int().positive(),
  fecha_nacimiento: z.string().optional()
})

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const params = querySchema.parse(req.query)
    res.json(await searchEstudiantes(params))
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body)
    const data = await createEstudiante(body)
    res.status(201).json(data)
  } catch (e) { next(e) }
})

export default router
