import { supabaseAdmin } from '../utils/supabaseClient.js'

export type DashboardData = {
    registrados: number
    reprobados: number
    bajas: number
    motivoBajaMasComun: string | null
}

/**
 * Obtiene datos del dashboard
 * @param id_docente - Si se proporciona, filtra solo los grupos de ese docente. Si es null, obtiene todos los datos (admin)
 */
export async function getDashboardData(id_docente: number | null): Promise<DashboardData> {
    // 1. Obtener IDs de grupos relevantes
    let gruposQuery = supabaseAdmin
        .from('grupo')
        .select('id_grupo')

    if (id_docente !== null) {
        gruposQuery = gruposQuery.eq('id_docente', id_docente)
    }

    const { data: grupos, error: errGrupos } = await gruposQuery
    if (errGrupos) throw new Error(`Error al obtener grupos: ${errGrupos.message}`)

    const idGrupos = (grupos ?? []).map(g => g.id_grupo)
    if (idGrupos.length === 0) {
        return {
            registrados: 0,
            reprobados: 0,
            bajas: 0,
            motivoBajaMasComun: null
        }
    }

    // 2. Obtener inscripciones de esos grupos
    const { data: inscripciones, error: errInsc } = await supabaseAdmin
        .from('inscripcion')
        .select('id_inscripcion, id_estudiante, status')
        .in('id_grupo', idGrupos)

    if (errInsc) throw new Error(`Error al obtener inscripciones: ${errInsc.message}`)

    const idInscripciones = (inscripciones ?? []).map(i => i.id_inscripcion)
    const idEstudiantes = Array.from(new Set((inscripciones ?? []).map(i => i.id_estudiante)))

    // 3. ESTUDIANTES REGISTRADOS (sin repetir)
    const registrados = idEstudiantes.length

    // 4. ESTUDIANTES REPROBADOS
    // Un estudiante está reprobado si:
    // - Tiene al menos una calificación < 70 en alguna unidad
    // - Y ya no tiene más unidades por calificar (o el promedio final < 70)
    let reprobados = 0
    if (idInscripciones.length > 0) {
        // Obtener todas las evaluaciones
        const { data: evaluaciones, error: errEval } = await supabaseAdmin
            .from('evaluacion_unidad')
            .select('id_inscripcion, unidad, calificacion')
            .in('id_inscripcion', idInscripciones)

        if (errEval) throw new Error(`Error al obtener evaluaciones: ${errEval.message}`)

        // Obtener unidades máximas por materia
        const { data: gruposConUnidades, error: errGruposUnidades } = await supabaseAdmin
            .from('grupo')
            .select('id_grupo, id_materia, materia:id_materia(unidades)')
            .in('id_grupo', idGrupos)

        if (errGruposUnidades) throw new Error(`Error al obtener unidades: ${errGruposUnidades.message}`)

        // Mapear grupos a unidades máximas
        const unidadesPorGrupo = new Map<number, number>()
        const gruposPorInscripcion = new Map<number, number>()
        for (const insc of inscripciones ?? []) {
            gruposPorInscripcion.set(insc.id_inscripcion, insc.id_grupo)
        }

        for (const g of gruposConUnidades ?? []) {
            const unidades = (g as any).materia?.unidades ?? 5
            unidadesPorGrupo.set(g.id_grupo, unidades)
        }

        // Evaluar cada estudiante
        const estudiantesReprobados = new Set<number>()
        const evaluacionesPorInscripcion = new Map<number, Array<{ unidad: number; calificacion: number }>>()

        for (const evaluacion of evaluaciones ?? []) {
            const arr = evaluacionesPorInscripcion.get(evaluacion.id_inscripcion) || []
            arr.push({ unidad: evaluacion.unidad, calificacion: Number(evaluacion.calificacion) })
            evaluacionesPorInscripcion.set(evaluacion.id_inscripcion, arr)
        }

        for (const insc of inscripciones ?? []) {
            const idEstudiante = insc.id_estudiante
            const idGrupo = gruposPorInscripcion.get(insc.id_inscripcion)
            if (!idGrupo) continue

            const unidadesMaximas = unidadesPorGrupo.get(idGrupo) ?? 5
            const evals = evaluacionesPorInscripcion.get(insc.id_inscripcion) || []

            // Si ya completó todas las unidades, evaluar si reprobó
            if (evals.length >= unidadesMaximas) {
                // Calcular promedio
                const promedio = evals.reduce((sum, e) => sum + e.calificacion, 0) / evals.length

                // Si el promedio es < 70, está reprobado
                if (promedio < 70) {
                    estudiantesReprobados.add(idEstudiante)
                }
            }
        }

        reprobados = estudiantesReprobados.size
    }

    // 5. ESTUDIANTES DADOS DE BAJA DEFINITIVAMENTE
    // Para admin: todos los estudiantes con activo = false
    // Para docente: solo los que están en sus grupos (aunque estén activos, si tienen inscripciones con status BAJA)
    let bajas = 0
    let motivoBajaMasComun: string | null = null

    if (id_docente === null) {
        // Admin: contar todos los estudiantes con activo = false
        const { data: estudiantesBaja, error: errBaja } = await supabaseAdmin
            .from('estudiante')
            .select('id_estudiante')
            .eq('activo', false)

        if (errBaja) throw new Error(`Error al obtener bajas: ${errBaja.message}`)
        bajas = estudiantesBaja?.length ?? 0

        // Obtener motivo más común de las bajas registradas en log_sistema
        const { data: logsBaja, error: errLogs } = await supabaseAdmin
            .from('log_sistema')
            .select('detalle')
            .eq('accion', 'BAJA_ESTUDIANTE')
            .order('creado_en', { ascending: false })
            .limit(1000)

        if (!errLogs && logsBaja && logsBaja.length > 0) {
            // Extraer motivos del detalle (formato: "Baja de estudiante X: motivo")
            const motivos = logsBaja
                .map(log => {
                    const match = log.detalle?.match(/:\s*(.+)$/)
                    return match ? match[1] : null
                })
                .filter((m): m is string => m !== null)

            if (motivos.length > 0) {
                // Contar frecuencia
                const frecuencia = new Map<string, number>()
                for (const motivo of motivos) {
                    frecuencia.set(motivo, (frecuencia.get(motivo) || 0) + 1)
                }

                // Encontrar el más común
                let maxCount = 0
                let motivoMasComun = null
                for (const [motivo, count] of frecuencia.entries()) {
                    if (count > maxCount) {
                        maxCount = count
                        motivoMasComun = motivo
                    }
                }
                motivoBajaMasComun = motivoMasComun
            }
        }
    } else {
        // Docente: contar estudiantes con inscripciones en BAJA en sus grupos
        const { data: inscripcionesBaja, error: errInscBaja } = await supabaseAdmin
            .from('inscripcion')
            .select('id_estudiante')
            .in('id_grupo', idGrupos)
            .eq('status', 'BAJA')

        if (errInscBaja) throw new Error(`Error al obtener inscripciones en baja: ${errInscBaja.message}`)

        const estudiantesConBaja = Array.from(new Set((inscripcionesBaja ?? []).map(i => i.id_estudiante)))
        bajas = estudiantesConBaja.length

        // Obtener motivo más común de las bajas de materia en sus grupos
        const { data: bajasMateria, error: errBajasMateria } = await supabaseAdmin
            .from('baja_materia')
            .select('motivo_adicional')
            .in('id_inscripcion', idInscripciones)
            .not('motivo_adicional', 'is', null)
            .limit(1000)

        if (!errBajasMateria && bajasMateria && bajasMateria.length > 0) {
            const motivos = (bajasMateria ?? [])
                .map(b => b.motivo_adicional)
                .filter((m): m is string => m !== null && m !== '')

            if (motivos.length > 0) {
                const frecuencia = new Map<string, number>()
                for (const motivo of motivos) {
                    frecuencia.set(motivo, (frecuencia.get(motivo) || 0) + 1)
                }

                let maxCount = 0
                let motivoMasComun = null
                for (const [motivo, count] of frecuencia.entries()) {
                    if (count > maxCount) {
                        maxCount = count
                        motivoMasComun = motivo
                    }
                }
                motivoBajaMasComun = motivoMasComun
            }
        }
    }

    return {
        registrados,
        reprobados,
        bajas,
        motivoBajaMasComun
    }
}

