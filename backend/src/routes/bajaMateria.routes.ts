import { Router } from 'express';
import { createBajaMateriaSchema } from '../schemas/bajaMateria.schema.js';
import { bajaMateriaService } from '../services/bajaMateria.service.js';
import { logSistemaService } from '../services/logSistema.service.js';
import { translateObjectFields, translateObjectFieldsAsync, detectLangFromReq } from '../utils/translate.js'

const router = Router();

// POST /baja-materia - Crear un nuevo registro de baja de materia
router.post('/', async (req, res, next) => {
  try {
    // Validar los datos de entrada
    const input = createBajaMateriaSchema.parse(req.body);

    // Crear el registro de baja de materia
    const bajaMateria = await bajaMateriaService.createBajaMateria(input);

    // Registrar la acción en el log del sistema
    try {
      // Asegurarse de que registrado_por sea un número
      const userId = typeof input.registrado_por === 'string'
        ? parseInt(input.registrado_por, 10)
        : input.registrado_por;

      if (isNaN(userId)) {
        throw new Error('ID de usuario no válido');
      }

      await logSistemaService.crearLog({
        id_usuario: userId,
        accion: 'BAJA_MATERIA',
        detalle: `Baja de materia registrada para la inscripción ${input.id_inscripcion}`,
        ip: req.ip,
        tabla_afectada: 'baja_materia',
        id_registro_afectado: bajaMateria.id_baja,
      });
    } catch (logError) {
      console.error('Error al registrar en el log del sistema:', logError);
      // No fallamos la operación principal si falla el log
    }

    const lang = detectLangFromReq(req)
    res.status(201).json(await translateObjectFieldsAsync(bajaMateria, lang));
  } catch (error) {
    next(error);
  }
});

// GET /baja-materia/:id - Obtener un registro de baja por ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const bajaMateria = await bajaMateriaService.getBajaMateriaById(id);
    const lang = detectLangFromReq(req)
    res.json(await translateObjectFieldsAsync(bajaMateria, lang));
  } catch (error) {
    next(error);
  }
});

// GET /baja-materia - Obtener todos los registros de baja
router.get('/', async (req, res, next) => {
  try {
    const bajas = await bajaMateriaService.getAllBajas();
    const lang = detectLangFromReq(req)
    res.json(await translateObjectFieldsAsync(bajas, lang));
  } catch (error) {
    next(error);
  }
});

export default router;
