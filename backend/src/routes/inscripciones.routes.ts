import { Router } from 'express';
import { z } from 'zod';
import { crearInscripcion } from '../services/inscripciones.service.js';

const router = Router();
const bodySchema = z.object({ id_estudiante: z.number(), id_grupo: z.number() });

router.post('/', async (req, res, next)=>{
  try{
    const body = bodySchema.parse(req.body);
    const data = await crearInscripcion(body);
    res.status(201).json(data);
  }catch(e){ next(e); }
});

export default router;
