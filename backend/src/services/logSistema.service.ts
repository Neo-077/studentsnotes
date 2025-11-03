import { supabaseAdmin } from '../utils/supabaseClient.js';

export interface LogSistemaInput {
  id_usuario: number;
  accion: string;
  detalle: string;
  ip?: string;
  tabla_afectada?: string;
  id_registro_afectado?: number;
}

export const logSistemaService = {
  async crearLog(logData: LogSistemaInput) {
    const { data, error } = await supabaseAdmin
      .from('log_sistema')
      .insert([{
        id_usuario: logData.id_usuario,
        accion: logData.accion,
        detalle: logData.detalle,
        ip: logData.ip || null,
        tabla_afectada: logData.tabla_afectada || null,
        id_registro_afectado: logData.id_registro_afectado || null
      }])
      .select();

    if (error) {
      console.error('Error al crear el registro de log:', error);
      throw error;
    }

    return data?.[0];
  },

  async obtenerLogs() {
    const { data, error } = await supabaseAdmin
      .from('log_sistema')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al obtener los logs:', error);
      throw error;
    }

    return data;
  }
};
