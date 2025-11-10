import express from 'express'
import pool from '../db.js' // CAMBIADO: con .js para NodeNext

const router = express.Router()

// GET /dashboard - Estadísticas principales
router.get('/', async (req, res) => {
    // ...existing code...
})

// GET /dashboard/reprobados - Lista de reprobados (SOLO ADMIN)
router.get('/reprobados', async (req, res) => {
    try {
        // Verificar que el usuario sea admin
        const user = (req as any).user
        if (!user || user.rol !== 'admin') {
            return res.status(403).json({
                message: 'Acceso denegado. Solo administradores pueden ver esta información.'
            })
        }

        const query = `
      SELECT DISTINCT
        e.no_control,
        e.nombre,
        e.ap_paterno,
        e.ap_materno,
        c.nombre as carrera,
        m.nombre as materia,
        g.grupo_codigo as grupo,
        (
          SELECT AVG(eu.calificacion)
          FROM evaluacion_unidad eu
          WHERE eu.id_inscripcion = i.id_inscripcion
        ) as promedio
      FROM inscripcion i
      JOIN estudiante e ON i.id_estudiante = e.id_estudiante
      JOIN carrera c ON e.id_carrera = c.id_carrera
      JOIN grupo g ON i.id_grupo = g.id_grupo
      JOIN materia m ON g.id_materia = m.id_materia
      WHERE i.status IN ('ACTIVA', 'REPROBADA')
        AND EXISTS (
          SELECT 1 
          FROM evaluacion_unidad eu
          WHERE eu.id_inscripcion = i.id_inscripcion
          HAVING AVG(eu.calificacion) < 70
        )
      ORDER BY c.nombre, e.ap_paterno, e.ap_materno, e.nombre
    `

        const result = await pool.query(query)

        const reprobados = result.rows.map((row: any) => ({
            no_control: row.no_control,
            nombre: row.nombre,
            ap_paterno: row.ap_paterno,
            ap_materno: row.ap_materno,
            carrera: row.carrera,
            materia: row.materia,
            grupo: row.grupo,
            promedio: parseFloat(row.promedio || '0')
        }))

        res.json({ reprobados })
    } catch (error: any) {
        console.error('Error obteniendo reprobados:', error)
        res.status(500).json({ message: error.message })
    }
})

export default router