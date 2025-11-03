import { supabaseAdmin } from '../utils/supabaseClient.js';
import { CreateBajaMateriaInput } from '../schemas/bajaMateria.schema.js';

export const bajaMateriaService = {
  async createBajaMateria(input: CreateBajaMateriaInput) {
    // Asegurarse de que registrado_por sea un número
    const registradoPor = typeof input.registrado_por === 'string' 
      ? parseInt(input.registrado_por, 10)
      : input.registrado_por;

    if (isNaN(registradoPor)) {
      throw new Error('El ID del usuario debe ser un número válido');
    }

    // Verificar que el usuario existe
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .eq('id_usuario', registradoPor)
      .single();

    if (userError || !usuario) {
      throw new Error('El usuario especificado no existe');
    }

    // Preparar los datos para la inserción
    const bajaMateriaData = {
      id_inscripcion: input.id_inscripcion,
      id_factor: input.id_factor || null,
      fecha_baja: input.fecha_baja ? new Date(input.fecha_baja).toISOString() : new Date().toISOString(),
      motivo_adicional: input.motivo_adicional || null,
      registrado_por: registradoPor,
    };

    // Insert the record into the database
    const { data, error } = await supabaseAdmin
      .from('baja_materia')
      .insert([bajaMateriaData])
      .select()
      .single();

    if (error) {
      console.error('Error al crear registro de baja de materia:', error);
      throw error;
    }

    return data;
  },

  async getBajaMateriaById(id: number) {
    const { data, error } = await supabaseAdmin
      .from('baja_materia')
      .select('*')
      .eq('id_baja', id)
      .single();

    if (error) {
      console.error('Error al obtener registro de baja de materia:', error);
      throw error;
    }

    return data;
  },

  async getAllBajas() {
    const { data, error } = await supabaseAdmin
      .from('baja_materia')
      .select('*')

    if (error) {
      console.error('Error al obtener los registros de baja de materia:', error);
      throw error;
    }

    return data;
  },
};
