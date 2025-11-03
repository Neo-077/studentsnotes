import { Router } from 'express';
import { logSistemaService } from '../services/logSistema.service.js';

const router = Router();

// Crear un nuevo log
router.post('/baja', async (req, res) => {
  try {
    const logData = {
      id_usuario: req.body.id_usuario,
      accion: req.body.accion || 'BAJA_MATERIA',
      detalle: req.body.detalle,
      ip: req.body.ip,
      tabla_afectada: req.body.tabla_afectada,
      id_registro_afectado: req.body.id_registro_afectado
    };

    const result = await logSistemaService.crearLog(logData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en /baja:', error);
    res.status(500).json({ error: 'Error al crear el registro de log' });
  }
});

// Obtener todos los logs
router.get('/', async (_req, res) => {
  try {
    const logs = await logSistemaService.obtenerLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: 'Error al obtener los registros de log' });
  }
});

export default router;
