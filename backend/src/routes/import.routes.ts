import { Router, Request } from 'express'
import multer from 'multer'
import { db } from '../config/lowdb.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = Router()

interface MulterRequest extends Request {
  file?: Express.Multer.File
}

type StagingType = 'estudiante' | 'carrera' | 'inscripcion' | 'grupo' | 'materia' | 'docente'

interface StagingItem {
  type: StagingType
  rows: any[]
  uploaded_at?: string
}

router.post('/', upload.single('file'), async (req: MulterRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { message: 'Archivo requerido' } })
    if (!db.data.staging) db.data.staging = []

    const item: StagingItem = {
      type: 'estudiante',
      rows: [
        {
          raw: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      ],
      uploaded_at: new Date().toISOString()
    }

    db.data.staging.push(item)
    await db.write()
    res.json({ ok: true, staging_count: db.data.staging.length })
  } catch (e) {
    next(e)
  }
})

router.post('/commit', async (_req, res, next) => {
  try {
    db.data.staging = []
    await db.write()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
