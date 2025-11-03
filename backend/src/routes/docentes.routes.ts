// src/routes/docentes.route.ts
import { Router } from "express"
import { createDocente, bulkDocentes, updateDocente, deleteDocente } from "../services/docentes.service.js"
import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = Router()

router.post("/", async (req, res, next) => {
  try { res.json(await createDocente(req.body)) } catch (e) { next(e) }
})

router.post("/bulk", upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file?.buffer) throw new Error("Archivo no recibido")
    const result = await bulkDocentes(req.file.buffer)
    res.json(result)
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    const result = await updateDocente(id, req.body || {})
    res.json(result)
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    await deleteDocente(id)
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router
