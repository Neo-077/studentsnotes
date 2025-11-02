import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { createEstudiante, listEstudiantes, bulkUpsertEstudiantes, deleteEstudiante } from '../services/estudiantes.service.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = Router()

const bodySchema = z.object({
  nombre: z.string().min(1),
  ap_paterno: z.string().min(1),
  ap_materno: z.string().optional().nullable(),
  id_genero: z.number().int().positive(),
  id_carrera: z.number().int().positive(),
  fecha_nacimiento: z.string().optional().nullable(),
})

router.post('/', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body)
    const data = await createEstudiante(body)
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const data = await listEstudiantes({
      q: req.query.q?.toString(),
      id_carrera: req.query.id_carrera ? Number(req.query.id_carrera) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

router.post('/bulk', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: { message: 'Archivo requerido (.xlsx, .xls, .csv)' } })
    const report = await bulkUpsertEstudiantes(req.file.buffer)
    res.json(report)
  } catch (e) {
    next(e)
  }
})

// DELETE /estudiantes/:id — elimina por id_estudiante
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    await deleteEstudiante(id)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
});

//router.get();

export default router
