import express from 'express'
import pool from '../db.js'

const router = express.Router()

interface Inscripcion {
    id_inscripcion: number
    status: string
    id_estudiante: number
    no_control: string
    nombre: string
    ap_paterno: string
    ap_materno: string
}

interface Calificacion {
    id_inscripcion: number
    unidad: number
    calificacion: number
}

interface Asistencia {
    id_inscripcion: number
    unidad: number
    asistencia: number
}

// GET /inscripciones?grupo_id=X
router.get('/', async (req, res) => {
    try {
        const { grupo_id } = req.query
        if (!grupo_id) {
            return res.status(400).json({ message: 'grupo_id requerido' })
        }

        const grupoQuery = `
      SELECT 
        g.id_grupo,
        g.grupo_codigo,
        g.cupo,
        m.nombre as materia_nombre,
        m.unidades,
        m.clave as materia_clave,
        d.nombre as docente_nombre,
        t.periodo
      FROM grupo g
      JOIN materia m ON g.id_materia = m.id_materia
      JOIN docente d ON g.id_docente = d.id_docente
      JOIN termino t ON g.id_termino = t.id_termino
      WHERE g.id_grupo = $1
    `
        const grupoResult = await pool.query(grupoQuery, [grupo_id])
        if (grupoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Grupo no encontrado' })
        }
        const grupo = grupoResult.rows[0]

        const inscripcionesQuery = `
      SELECT 
        i.id_inscripcion,
        i.status,
        e.id_estudiante,
        e.no_control,
        e.nombre,
        e.ap_paterno,
        e.ap_materno
      FROM inscripcion i
      JOIN estudiante e ON i.id_estudiante = e.id_estudiante
      WHERE i.id_grupo = $1
      ORDER BY e.ap_paterno, e.ap_materno, e.nombre
    `
        const inscripciones = await pool.query<Inscripcion>(inscripcionesQuery, [grupo_id])
        const inscripcionIds = inscripciones.rows.map((r: Inscripcion) => r.id_inscripcion)

        const calificacionesQuery = `
      SELECT 
        ev.id_inscripcion,
        ev.unidad,
        ev.calificacion
      FROM evaluacion_unidad ev
      WHERE ev.id_inscripcion = ANY($1)
      ORDER BY ev.unidad
    `
        const calificaciones = inscripcionIds.length > 0
            ? await pool.query<Calificacion>(calificacionesQuery, [inscripcionIds])
            : { rows: [] }

        const asistenciasQuery = `
      SELECT 
        a.id_inscripcion,
        a.unidad,
        a.numero_asistencias as asistencia
      FROM asistencia a
      WHERE a.id_inscripcion = ANY($1)
      ORDER BY a.unidad
    `
        const asistencias = inscripcionIds.length > 0
            ? await pool.query<Asistencia>(asistenciasQuery, [inscripcionIds])
            : { rows: [] }

        const rows = inscripciones.rows.map((inscripcion: Inscripcion) => {
            const unidades = []

            for (let u = 1; u <= grupo.unidades; u++) {
                const cal = calificaciones.rows.find(
                    (c: Calificacion) => c.id_inscripcion === inscripcion.id_inscripcion && c.unidad === u
                )
                const asi = asistencias.rows.find(
                    (a: Asistencia) => a.id_inscripcion === inscripcion.id_inscripcion && a.unidad === u
                )

                unidades.push({
                    unidad: u,
                    calificacion: cal ? cal.calificacion : null,
                    asistencia: asi ? asi.asistencia : null
                })
            }

            return {
                id_inscripcion: inscripcion.id_inscripcion,
                status: inscripcion.status,
                estudiante: {
                    id_estudiante: inscripcion.id_estudiante,
                    no_control: inscripcion.no_control,
                    nombre: inscripcion.nombre,
                    ap_paterno: inscripcion.ap_paterno,
                    ap_materno: inscripcion.ap_materno
                },
                unidades
            }
        })

        const total = rows.length
        const activos = rows.filter((r: any) => r.status === 'ACTIVA' || r.status === 'APROBADA' || r.status === 'REPROBADA')
        const aprobados = rows.filter((r: any) => {
            if (r.status !== 'ACTIVA') return false
            const calificaciones = r.unidades
                .map((u: any) => u.calificacion)
                .filter((c: any) => c !== null && c !== undefined)
            if (calificaciones.length === 0) return false
            return calificaciones.every((c: number) => c >= 70)
        }).length

        const reprobados = activos.length - aprobados

        res.json({
            cupo: grupo.cupo,
            unidades: grupo.unidades,
            rows,
            grupo: {
                ...grupo,
                total,
                aprobados,
                reprobados
            }
        })

    } catch (error: any) {
        console.error('Error en GET /inscripciones:', error)
        res.status(500).json({ message: error.message })
    }
})

// PUT /inscripciones/:id/unidades
router.put('/:id/unidades', async (req, res) => {
    const client = await pool.connect()
    try {
        const { id } = req.params
        const { unidades } = req.body

        if (!Array.isArray(unidades)) {
            return res.status(400).json({ message: 'unidades debe ser un array' })
        }

        await client.query('BEGIN')

        for (const unidad of unidades) {
            const { unidad: numero, calificacion, asistencia } = unidad

            if (calificacion !== undefined && calificacion !== null) {
                await client.query(
                    `INSERT INTO evaluacion_unidad (id_inscripcion, unidad, calificacion)
           VALUES ($1, $2, $3)
           ON CONFLICT (id_inscripcion, unidad)
           DO UPDATE SET calificacion = $3`,
                    [id, numero, calificacion]
                )
            }

            if (asistencia !== undefined && asistencia !== null) {
                await client.query(
                    `INSERT INTO asistencia (id_inscripcion, unidad, numero_asistencias)
           VALUES ($1, $2, $3)
           ON CONFLICT (id_inscripcion, unidad)
           DO UPDATE SET numero_asistencias = $3`,
                    [id, numero, asistencia]
                )
            }
        }

        await client.query('COMMIT')
        res.json({ message: 'Unidades actualizadas' })

    } catch (error: any) {
        await client.query('ROLLBACK')
        console.error('Error actualizando unidades:', error)
        res.status(500).json({ message: error.message })
    } finally {
        client.release()
    }
})

// POST /inscripciones
router.post('/', async (req, res) => {
    try {
        const { id_estudiante, id_grupo } = req.body

        const grupoQuery = await pool.query(
            'SELECT cupo FROM grupo WHERE id_grupo = $1',
            [id_grupo]
        )
        if (grupoQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Grupo no encontrado' })
        }

        const inscritos = await pool.query(
            `SELECT COUNT(*) as count FROM inscripcion 
       WHERE id_grupo = $1 AND status != 'BAJA'`,
            [id_grupo]
        )

        if (parseInt(inscritos.rows[0].count) >= grupoQuery.rows[0].cupo) {
            return res.status(400).json({ message: 'Cupo lleno' })
        }

        const result = await pool.query(
            `INSERT INTO inscripcion (id_estudiante, id_grupo, status)
       VALUES ($1, $2, 'ACTIVA')
       RETURNING *`,
            [id_estudiante, id_grupo]
        )

        res.status(201).json(result.rows[0])

    } catch (error: any) {
        console.error('Error creando inscripción:', error)
        res.status(500).json({ message: error.message })
    }
})

// POST /inscripciones/bulk
router.post('/bulk', async (req, res) => {
    const client = await pool.connect()
    try {
        const { id_grupo, no_control } = req.body

        if (!Array.isArray(no_control) || no_control.length === 0) {
            return res.status(400).json({ message: 'no_control debe ser un array no vacío' })
        }

        await client.query('BEGIN')

        const inserted: string[] = []
        const errors: Array<{ no_control: string; error: string }> = []

        for (const nc of no_control) {
            try {
                const estudiante = await client.query(
                    'SELECT id_estudiante FROM estudiante WHERE no_control = $1',
                    [nc]
                )

                if (estudiante.rows.length === 0) {
                    errors.push({ no_control: nc, error: 'Estudiante no encontrado' })
                    continue
                }

                const result = await client.query(
                    `INSERT INTO inscripcion (id_estudiante, id_grupo, status)
           VALUES ($1, $2, 'ACTIVA')
           RETURNING *`,
                    [estudiante.rows[0].id_estudiante, id_grupo]
                )

                inserted.push(result.rows[0].no_control)

            } catch (error: any) {
                console.error('Error en bulk insert:', error)
                errors.push({ no_control: nc, error: error.message })
            }
        }

        await client.query('COMMIT')

        res.status(201).json({
            message: 'Inscripciones procesadas',
            inserted,
            errors
        })

    } catch (error: any) {
        await client.query('ROLLBACK')
        console.error('Error en bulk insert:', error)
        res.status(500).json({ message: error.message })
    } finally {
        client.release()
    }
})

// PUT /inscripciones/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const result = await pool.query(
            'UPDATE inscripcion SET status = $1 WHERE id_inscripcion = $2 RETURNING *',
            [status, id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inscripción no encontrada' })
        }

        res.json(result.rows[0])

    } catch (error: any) {
        console.error('Error actualizando inscripción:', error)
        res.status(500).json({ message: error.message })
    }
})

export default router
