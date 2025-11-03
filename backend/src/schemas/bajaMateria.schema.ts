import { z } from 'zod';

export const createBajaMateriaSchema = z.object({
  id_inscripcion: z.number({
    required_error: 'El id_inscripcion es requerido',
    invalid_type_error: 'El id_inscripcion debe ser un número',
  }),
  id_factor: z.number({
    invalid_type_error: 'El id_factor debe ser un número',
  }).optional().nullable(),
  fecha_baja: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe estar en formato YYYY-MM-DD',
  }).optional(),
  motivo_adicional: z.string({
    invalid_type_error: 'El motivo_adicional debe ser un texto',
  }).optional().nullable(),
  registrado_por: z.number({
    required_error: 'El id del usuario que registra es requerido',
    invalid_type_error: 'El id del usuario debe ser un número',
  }),
});

export type CreateBajaMateriaInput = z.infer<typeof createBajaMateriaSchema>;
