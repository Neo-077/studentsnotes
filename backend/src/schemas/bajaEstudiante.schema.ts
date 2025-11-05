import { z } from 'zod';

export const createBajaEstudianteSchema = z.object({
    motivo_adicional: z.string({
        invalid_type_error: 'El motivo debe ser un texto',
    }).min(1, 'El motivo de baja es requerido'),
    fecha_baja: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'La fecha debe estar en formato YYYY-MM-DD',
    }).optional(),
    registrado_por: z.number({
        invalid_type_error: 'El id del usuario debe ser un número',
    }).optional(),
});

export type CreateBajaEstudianteInput = z.infer<typeof createBajaEstudianteSchema>;

