import { Router } from 'express';
import { z } from 'zod';
import { listGrupos } from '../services/grupos.service.js';

const schema = z.object({
  carrera_id: z.coerce.number().optional(),
  termino_id: z.coerce.number().optional(),
  materia_id: z.coerce.number().optional(),
});

const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const params = schema.parse(req.query);
    const data = await listGrupos(params);
    res.json(data);
  } catch (e) { next(e); }
});
export default router;
