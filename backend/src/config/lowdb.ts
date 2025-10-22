import { JSONFilePreset } from 'lowdb/node';

type DBSchema = {
  staging: { type: 'estudiante'|'inscripcion'|'grupo'|'materia'|'docente'|'carrera', rows: any[] }[]
}

export const db = await JSONFilePreset<DBSchema>('lowdb.json', { staging: [] });
