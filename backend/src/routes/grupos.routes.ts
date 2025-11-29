// src/routes/grupos.route.ts
import { Router } from 'express'
import { listGrupos, createGrupo, bulkUpsertGrupos, checkDocenteHorarioConflict, deleteGrupo } from '../services/grupos.service.js'
import { listEstudiantesElegiblesPorGrupo } from '../services/estudiantes.service.js'
import multer from 'multer'
import { requireAuth as requireSupabaseAuth } from '../middleware/auth.js'
import { translateObjectFields, translateObjectFieldsAsync, detectLangFromReq } from '../utils/translate.js'

const upload = multer()
const router = Router()

// GET /grupos  (lista + filtros)  — también sirve para validar conflictos
router.get('/', requireSupabaseAuth, async (req, res, next) => {
  try {
    const termino_id = req.query.termino_id ? Number(req.query.termino_id) : undefined
    const materia_id = req.query.materia_id ? Number(req.query.materia_id) : undefined
    const carrera_id = req.query.carrera_id ? Number(req.query.carrera_id) : undefined
    let docente_id = req.query.docente_id ? Number(req.query.docente_id) : undefined
    const horario = req.query.horario ? String(req.query.horario) : undefined

    // Si es maestro autenticado vía Supabase, limita a sus grupos
    const appUsuario = (req as any).appUsuario as { rol?: string, id_docente?: number } | null
    if (appUsuario && appUsuario.rol === 'maestro' && appUsuario.id_docente) {
      docente_id = appUsuario.id_docente
    }

    // Si vienen los 3 para conflicto, responde rápidamente
    if (docente_id && termino_id && horario) {
      const conflict = await checkDocenteHorarioConflict({ id_docente: docente_id, id_termino: termino_id, horario })
      return res.json(conflict ? [{ conflict: true }] : [])
    }

    const data = await listGrupos({ termino_id, carrera_id, materia_id, docente_id, horario })
    const lang = detectLangFromReq(req)
    const translated = await translateObjectFieldsAsync(data, lang)
    res.json(translated)
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
    const lang = detectLangFromReq(req)
    res.status(201).json(await translateObjectFieldsAsync(data, lang))
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

// DELETE /grupos/:id  (eliminar)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'id inválido' })
    await deleteGrupo(id)
    res.status(204).end()
  } catch (e) { next(e) }
})

// GET /grupos/:id/elegibles — estudiantes elegibles para un grupo
router.get('/:id/elegibles', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })

    const data = await listEstudiantesElegiblesPorGrupo(id, {
      q: req.query.q?.toString(),
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

export default router
