import { Router } from 'express';
import { listCarreras, listGeneros, listMaterias, listDocentes, listTerminos, listModalidades } from '../services/catalogos.service.js';

const router = Router();
router.get('/carreras', async (_req, res, next)=>{ try{ res.json(await listCarreras()); }catch(e){ next(e);} });
router.get('/generos', async (_req, res, next)=>{ try{ res.json(await listGeneros()); }catch(e){ next(e);} });
router.get('/materias', async (_req, res, next)=>{ try{ res.json(await listMaterias()); }catch(e){ next(e);} });
router.get('/docentes', async (_req, res, next)=>{ try{ res.json(await listDocentes()); }catch(e){ next(e);} });
router.get('/terminos', async (_req, res, next)=>{ try{ res.json(await listTerminos()); }catch(e){ next(e);} });
router.get('/modalidades', async (_req, res, next)=>{ try{ res.json(await listModalidades()); }catch(e){ next(e);} });
export default router;
