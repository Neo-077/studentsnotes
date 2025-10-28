// src/routes/materias.route.ts
import { Router } from "express"
import { createMateria, bulkMaterias } from "../services/materias.service.js"
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

export default router
