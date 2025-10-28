// src/routes/grupos.route.ts
import { Router } from 'express'
import { listGrupos, createGrupo, bulkUpsertGrupos, checkDocenteHorarioConflict } from '../services/grupos.service.js'
import multer from 'multer'

const upload = multer()
const router = Router()

// GET /grupos  (lista + filtros)  — también sirve para validar conflictos
router.get('/', async (req, res, next) => {
  try {
    const termino_id  = req.query.termino_id  ? Number(req.query.termino_id)  : undefined
    const materia_id  = req.query.materia_id  ? Number(req.query.materia_id)  : undefined
    const carrera_id  = req.query.carrera_id  ? Number(req.query.carrera_id)  : undefined
    const docente_id  = req.query.docente_id  ? Number(req.query.docente_id)  : undefined
    const horario     = req.query.horario ? String(req.query.horario) : undefined

    // Si vienen los 3 para conflicto, responde rápidamente
    if (docente_id && termino_id && horario) {
      const conflict = await checkDocenteHorarioConflict({ id_docente: docente_id, id_termino: termino_id, horario })
      return res.json(conflict ? [{ conflict: true }] : [])
    }

    const data = await listGrupos({ termino_id, carrera_id, materia_id, docente_id, horario })
    res.json(data)
  } catch (e) { next(e) }
})

// POST /grupos  (crear)
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const payload = {
      id_materia: Number(body.id_materia),
      id_docente: Number(body.id_docente),
      id_termino: Number(body.id_termino),
      id_modalidad: Number(body.id_modalidad),
      grupo_codigo: body.grupo_codigo ?? null,
      horario: String(body.horario ?? ''),
      cupo: body.cupo != null ? Number(body.cupo) : null,
    }
    const data = await createGrupo(payload)
    res.status(201).json(data)
  } catch (e) { next(e) }
})

// POST /grupos/bulk  (importar CSV/XLSX)
router.post('/bulk', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'Archivo requerido' })
    const report = await bulkUpsertGrupos(req.file.buffer)
    res.json(report)
  } catch (e) { next(e) }
})

export default router
