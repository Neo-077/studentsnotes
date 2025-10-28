// src/routes/docentes.route.ts
import { Router } from "express"
import { createDocente, bulkDocentes } from "../services/docentes.service.js"
import multer from 'multer'

const upload = multer()
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

export default router
