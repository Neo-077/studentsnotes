
import { Request, Response } from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';

export async function listLogs(_req: Request, res: Response) {
  try {
    const { data, error } = await supabaseAdmin
      .from('log_sistema')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(500);
      
    if (error) {
      console.error('Error fetching logs:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Unexpected error in listLogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
