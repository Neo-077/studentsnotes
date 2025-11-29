import { Router } from 'express'
import {
  listCarreras, listGeneros, listMaterias, listDocentes, listTerminos, listModalidades
} from '../services/catalogos.service.js'
import { translateObjectFields, translateObjectFieldsAsync, detectLangFromReq } from '../utils/translate.js'

const router = Router()

router.get('/carreras', async (req, res, next) => { try { const data = await listCarreras(); const lang = detectLangFromReq(req); res.json(await translateObjectFieldsAsync(data, lang)); } catch (e) { next(e) } })
router.get('/generos', async (_req, res, next) => { try { res.json(await listGeneros()); } catch (e) { next(e) } })
router.get('/docentes', async (_req, res, next) => { try { res.json(await listDocentes()); } catch (e) { next(e) } })
router.get('/terminos', async (_req, res, next) => { try { res.json(await listTerminos()); } catch (e) { next(e) } })
router.get('/modalidades', async (req, res, next) => { try { const data = await listModalidades(); const lang = detectLangFromReq(req); res.json(await translateObjectFieldsAsync(data, lang)); } catch (e) { next(e) } })

// ⬇️ ahora acepta carrera_id/termino_id OPCIONALES y si no vienen regresa TODAS las materias
router.get('/materias', async (req, res, next) => {
  try {
    const carrera_id = req.query.carrera_id ? Number(req.query.carrera_id) : undefined
    const termino_id = req.query.termino_id ? Number(req.query.termino_id) : undefined
    const data = await listMaterias({ carrera_id, termino_id })
    const lang = detectLangFromReq(req)
    res.json(await translateObjectFieldsAsync(data, lang))
  } catch (e) { next(e) }
})

export default router
