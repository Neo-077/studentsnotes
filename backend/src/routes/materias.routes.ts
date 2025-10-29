// src/routes/materias.route.ts
import { Router } from "express"
import { createMateria, bulkMaterias, deleteMateria, updateMateria } from "../services/materias.service.js"
import multer from 'multer'

const upload = multer()
const router = Router()

router.post("/", async (req, res, next) => {
  try { res.json(await createMateria(req.body)) } catch (e) { next(e) }
})

router.post("/bulk", upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file?.buffer) throw new Error("Archivo no recibido")
    res.json(await bulkMaterias(req.file.buffer))
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    await deleteMateria(id)
    res.status(204).end()
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    const { nombre, unidades, creditos } = req.body || {}
    const result = await updateMateria(id, { nombre, unidades, creditos })
    res.json(result)
  } catch (e) { next(e) }
})

export default router
