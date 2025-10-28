// src/routes/materiaCarrera.routes.ts
import { Router } from "express"
import { linkMateriaCarrera, listMateriaCarrera } from "../services/materiaCarrera.service.js"

const router = Router()

router.post("/", async (req, res, next) => {
  try {
    const data = await linkMateriaCarrera(req.body)
    res.json(data)
  } catch (e) { next(e) }
})

router.get("/", async (_req, res, next) => {
  try {
    const data = await listMateriaCarrera()
    res.json(data)
  } catch (e) { next(e) }
})

export default router
