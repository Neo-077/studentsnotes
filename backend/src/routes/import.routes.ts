import { Router } from 'express';
import multer from 'multer';
import { db } from '../config/lowdb.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/', upload.single('file'), async (req, res, next)=>{
  try{
    if(!req.file) return res.status(400).json({ error: { message: 'Archivo requerido' } });
    // Aquí podrías parsear CSV/Excel. Guardamos raw en staging.
    db.data.staging.push({ type: 'estudiante', rows: [{ raw: req.file.originalname }] });
    await db.write();
    res.json({ ok: true, staging_count: db.data.staging.length });
  }catch(e){ next(e);}
});

router.post('/commit', async (_req, res, next)=>{
  try{
    // Simular persistencia a Supabase (implementa según entidad)
    db.data.staging = [];
    await db.write();
    res.json({ ok: true });
  }catch(e){ next(e);}
});

export default router;
