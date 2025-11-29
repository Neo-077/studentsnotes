// src/routes/materiaCarrera.routes.ts
import { Router } from "express"
import { linkMateriaCarrera, listMateriaCarrera } from "../services/materiaCarrera.service.js"
import { translateObjectFields, translateObjectFieldsAsync, detectLangFromReq } from '../utils/translate.js'

const router = Router()

router.post("/", async (req, res, next) => {
  try {
    const data = await linkMateriaCarrera(req.body)
    const lang = detectLangFromReq(req)
    res.json(await translateObjectFieldsAsync(data, lang))
  } catch (e) { next(e) }
})

router.get("/", async (req, res, next) => {
  try {
    const data = await listMateriaCarrera()
    const lang = detectLangFromReq(req)
    res.json(await translateObjectFieldsAsync(data, lang))
  } catch (e) { next(e) }
})

export default router
