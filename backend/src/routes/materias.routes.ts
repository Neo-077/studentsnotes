// src/routes/materias.route.ts
import { Router } from "express"
import { createMateria, bulkMaterias } from "../services/materias.service.js"

const router = Router()

router.post("/", async (req, res, next) => {
  try { res.json(await createMateria(req.body)) } catch (e) { next(e) }
})

router.post("/bulk", async (req: any, res, next) => {
  try {
    const file: any = (req.files && (req.files.file || req.files["file"])) || null
    if (!file?.data) throw new Error("Archivo no recibido")
    res.json(await bulkMaterias(file.data))
  } catch (e) { next(e) }
})

export default router
