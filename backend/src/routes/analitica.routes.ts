import { Router } from 'express';
import { getKPIs, getPareto } from '../services/analitica.service.js';

const router = Router();
router.get('/kpis', async (_req, res, next)=>{ try{ res.json(await getKPIs()); }catch(e){ next(e);} });
router.get('/pareto', async (req, res, next)=>{ try{ res.json(await getPareto(String(req.query.scope||'materia'))); }catch(e){ next(e);} });
export default router;
