import { Router } from 'express';
import { z } from 'zod';
import { 
  crearInscripcion,
  listarInscripcionesPorGrupo,
  actualizarUnidades,
  eliminarInscripcion,
  bulkInscribirPorNoControl,
  obtenerReporteAprobadosReprobados,
  obtenerReportePromedioSemestre,
} from '../services/inscripciones.service.js';

const router = Router();
const bodySchema = z.object({ id_estudiante: z.number(), id_grupo: z.number() });
const bulkSchema = z.object({ id_grupo: z.number(), no_control: z.array(z.string().min(1)) })

router.post('/', async (req, res, next)=>{
  try{
    const body = bodySchema.parse(req.body);
    const data = await crearInscripcion(body);
    res.status(201).json(data);
  }catch(e){ next(e); }
});

// POST /inscripciones/bulk  — inscribir por arreglo de no_control
router.post('/bulk', async (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body)
    const report = await bulkInscribirPorNoControl(body)
    res.json(report)
  } catch (e) { next(e) }
})

// GET /inscripciones?grupo_id=ID  — lista alumnos del grupo con unidades
router.get('/', async (req, res, next) => {
  try {
    const id = Number(req.query.grupo_id)
    if (!id) return res.status(400).json({ error: { message: 'grupo_id requerido' } })
    const data = await listarInscripcionesPorGrupo(id)
    const grupo = obtenerReporteAprobadosReprobados(data);
    const promedio = obtenerReportePromedioSemestre(data.rows);
    res.json({ ...data, grupo, promedio})
  } catch (e) { next(e) }
})

// PUT /inscripciones/:id/unidades  — actualizar calificación/asistencia por unidad
router.put('/:id/unidades', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    const unidades = Array.isArray(req.body?.unidades) ? req.body.unidades : []
    const data = await actualizarUnidades({ id_inscripcion: id, unidades })
    res.json(data)
  } catch (e) { next(e) }
})

// DELETE /inscripciones/:id  — dar de baja
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: { message: 'id inválido' } })
    await eliminarInscripcion(id)
    res.status(204).end()
  } catch (e) { next(e) }
})

export default router;
