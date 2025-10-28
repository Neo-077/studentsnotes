// src/routes/docentes.route.ts
import { Router } from "express"
import { createDocente, bulkDocentes } from "../services/docentes.service.js"

const router = Router()

router.post("/", async (req, res, next) => {
  try { res.json(await createDocente(req.body)) } catch (e) { next(e) }
})

router.post("/bulk", async (req: any, res, next) => {
  try {
    // el body debe venir como multipart con 'file' (ya lo haces en otros bulk)
    // si usas express-fileupload o multer, asegúrate de exponer req.files.file
    // aquí asumimos que ya tienes middleware que deja req.files?.file?.data (Buffer)
    const file: any = (req.files && (req.files.file || req.files["file"])) || null
    if (!file?.data) throw new Error("Archivo no recibido")
    const result = await bulkDocentes(file.data)
    res.json(result)
  } catch (e) { next(e) }
})

export default router
