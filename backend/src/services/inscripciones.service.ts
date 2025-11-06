import { supabaseAdmin } from '../utils/supabaseClient.js'

export async function crearInscripcion(input: { id_estudiante: number; id_grupo: number }) {
  const id_grupo = Number(input.id_grupo)
  const id_estudiante = Number(input.id_estudiante)

  const { data: g, error: e2 } = await supabaseAdmin
    .from('grupo')
    .select('id_grupo,cupo')
    .eq('id_grupo', id_grupo)
    .single()
  if (e2) throw e2

  const { count, error: e3 } = await supabaseAdmin
    .from('inscripcion')
    .select('id_inscripcion', { count: 'exact', head: true })
    .eq('id_grupo', id_grupo)
  if (e3) throw e3

  const usados = count ?? 0
  if (usados >= (g?.cupo ?? 0)) throw new Error('Cupo lleno')

  const { data, error } = await supabaseAdmin
    .from('inscripcion')
    .upsert(
      { id_grupo, id_estudiante, status: 'ACTIVA' },
      { onConflict: 'id_grupo,id_estudiante', ignoreDuplicates: true }
    )
    .select('id_inscripcion,id_grupo,id_estudiante')
    .single()
  if (error) throw error

  return data
}

export async function eliminarInscripcion(id_inscripcion: number) {
  const { error } = await supabaseAdmin
    .from('inscripcion')
    .delete()
    .eq('id_inscripcion', id_inscripcion)
  if (error) throw error
  return { success: true }
}

export async function actualizarInscripcion(id_inscripcion: number, updates: { status?: string }) {
  const id = Number(id_inscripcion)
  if (!id) throw new Error('id_inscripcion inválido')

  const updateData: { status?: string } = {}
  if (updates.status) {
    const status = String(updates.status).toUpperCase()
    // Validar que el status sea uno de los valores permitidos
    const statusPermitidos = ['ACTIVA', 'BAJA', 'APROBADA', 'REPROBADA']
    if (!statusPermitidos.includes(status)) {
      throw new Error(`Status inválido. Debe ser uno de: ${statusPermitidos.join(', ')}`)
    }
    updateData.status = status
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No se proporcionaron campos para actualizar')
  }

  const { data, error } = await supabaseAdmin
    .from('inscripcion')
    .update(updateData)
    .eq('id_inscripcion', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listarInscripcionesPorGrupo(id_grupo: number) {
  // obtener grupo + unidades de la materia
  const gq = await supabaseAdmin
    .from('grupo')
    .select('id_grupo,cupo,id_materia,materia: id_materia ( unidades )')
    .eq('id_grupo', id_grupo)
    .single()
  if (gq.error) throw gq.error
  const unidades = Number((gq.data as any)?.materia?.unidades || 5)

  // inscripciones con estudiante
  const { data: insc, error: eInsc } = await supabaseAdmin
    .from('inscripcion')
    .select('id_inscripcion,fecha_inscripcion,status,estudiante: id_estudiante ( id_estudiante,no_control,nombre,ap_paterno,ap_materno )')
    .eq('id_grupo', id_grupo)
  if (eInsc) throw eInsc

  const ids = (insc ?? []).map(r => r.id_inscripcion)
  let evals: any[] = []
  let asists: any[] = []
  if (ids.length) {
    const [e1, e2] = await Promise.all([
      supabaseAdmin.from('evaluacion_unidad').select('id_inscripcion,unidad,calificacion').in('id_inscripcion', ids),
      supabaseAdmin.from('asistencia').select('id_inscripcion,unidad,porcentaje').in('id_inscripcion', ids),
    ])
    if (e1.error) throw e1.error
    if (e2.error) throw e2.error
    evals = e1.data ?? []
    asists = e2.data ?? []
  }

  // indexar por inscripcion+unidad
  const calByKey = new Map<string, number>()
  for (const r of evals) calByKey.set(`${r.id_inscripcion}|${r.unidad}`, Number(r.calificacion))
  const asiByKey = new Map<string, number>()
  for (const r of asists) asiByKey.set(`${r.id_inscripcion}|${r.unidad}`, Number(r.porcentaje))

  const rows = (insc ?? []).map((r: any) => {
    const unidadesArr = [] as Array<{ unidad: number; calificacion: number | null; asistencia: number | null }>
    for (let u = 1; u <= unidades; u++) {
      unidadesArr.push({
        unidad: u,
        calificacion: (calByKey.get(`${r.id_inscripcion}|${u}`) ?? null) as any,
        asistencia: (asiByKey.get(`${r.id_inscripcion}|${u}`) ?? null) as any,
      })
    }

    // Calcular promedio de calificaciones
    const calificaciones = unidadesArr.map(u => u.calificacion).filter((cal): cal is number => cal != null)
    const promedio = calificaciones.length > 0
      ? calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length
      : 0

    // Calcular promedio de asistencia
    const asistencias = unidadesArr.map(u => u.asistencia).filter((asi): asi is number => asi != null)
    const promedioAsistencia = asistencias.length > 0
      ? asistencias.reduce((sum, asi) => sum + asi, 0) / asistencias.length
      : 0

    return {
      id_inscripcion: r.id_inscripcion,
      status: r.status,
      estudiante: r.estudiante,
      unidades: unidadesArr,
      asistencia: promedioAsistencia,
      promedio: promedio,
    }
  })

  return { cupo: Number((gq.data as any)?.cupo || 0), unidades, rows }
}

export async function actualizarUnidades(input: { id_inscripcion: number; unidades: Array<{ unidad: number; calificacion?: number | null; asistencia?: number | null }> }) {
  const id = Number(input.id_inscripcion)
  if (!id) throw new Error('id_inscripcion inválido')

  // obtener grupo y unidades máximas
  const gi = await supabaseAdmin
    .from('inscripcion')
    .select('id_grupo, grupo: id_grupo ( id_materia, materia: id_materia ( unidades ) )')
    .eq('id_inscripcion', id)
    .single()
  if (gi.error) throw gi.error
  const maxU = Number((gi.data as any)?.grupo?.materia?.unidades || 5)

  for (const u of input.unidades || []) {
    const unidad = Number(u.unidad)
    if (!Number.isFinite(unidad) || unidad < 1 || unidad > maxU) continue

    // calificación
    if (u.calificacion != null && u.calificacion !== undefined) {
      const cal = Number(u.calificacion)
      if (isFinite(cal) && cal >= 0 && cal <= 100) {
        // buscar existente
        const ex = await supabaseAdmin
          .from('evaluacion_unidad')
          .select('id_evaluacion')
          .eq('id_inscripcion', id)
          .eq('unidad', unidad)
          .maybeSingle()
        if (ex.error) throw ex.error
        if (ex.data) {
          const up = await supabaseAdmin
            .from('evaluacion_unidad')
            .update({ calificacion: cal })
            .eq('id_evaluacion', (ex.data as any).id_evaluacion)
          if (up.error) throw up.error
        } else {
          const ins = await supabaseAdmin
            .from('evaluacion_unidad')
            .insert({ id_inscripcion: id, unidad, calificacion: cal })
          if (ins.error) throw ins.error
        }
      }
    }

    // asistencia (porcentaje)
    if (u.asistencia != null && u.asistencia !== undefined) {
      const pct = Number(u.asistencia)
      if (isFinite(pct) && pct >= 0 && pct <= 100) {
        const exa = await supabaseAdmin
          .from('asistencia')
          .select('id_asistencia')
          .eq('id_inscripcion', id)
          .eq('unidad', unidad)
          .maybeSingle()
        if (exa.error) throw exa.error
        if (exa.data) {
          const upa = await supabaseAdmin
            .from('asistencia')
            .update({ porcentaje: pct })
            .eq('id_asistencia', (exa.data as any).id_asistencia)
          if (upa.error) throw upa.error
        } else {
          const insa = await supabaseAdmin
            .from('asistencia')
            .insert({ id_inscripcion: id, unidad, porcentaje: pct })
          if (insa.error) throw insa.error
        }
      }
    }
  }
  return { success: true }
}

// Importación masiva por números de control
export async function bulkInscribirPorNoControl(input: { id_grupo: number; no_control: string[] }) {
  const id_grupo = Number(input.id_grupo)
  const lista = Array.isArray(input.no_control) ? input.no_control.map(String).map(s => s.trim()).filter(Boolean) : []
  if (!id_grupo) throw new Error('id_grupo inválido')
  if (!lista.length) return { ok: true, created: 0, skipped: 0, not_found: [], duplicates: [], over_capacity: 0 }

  // Obtener cupo y usados actuales
  const gq = await supabaseAdmin
    .from('grupo')
    .select('id_grupo,cupo')
    .eq('id_grupo', id_grupo)
    .single()
  if (gq.error) throw gq.error
  const cupo = Number((gq.data as any)?.cupo || 0)

  const existCount = await supabaseAdmin
    .from('inscripcion')
    .select('id_inscripcion', { count: 'exact', head: true })
    .eq('id_grupo', id_grupo)
  if (existCount.error) throw existCount.error
  let usados = existCount.count ?? 0

  // Buscar estudiantes por no_control
  const { data: estudiantes, error: eEst } = await supabaseAdmin
    .from('estudiante')
    .select('id_estudiante,no_control')
    .in('no_control', lista)
  if (eEst) throw eEst

  const mapEst = new Map<string, number>()
  for (const e of estudiantes || []) mapEst.set(String((e as any).no_control), Number((e as any).id_estudiante))

  // Duplicados en entrada
  const seen = new Set<string>()
  const duplicates: string[] = []
  const unique = [] as string[]
  for (const nc of lista) {
    const key = String(nc)
    if (seen.has(key)) { duplicates.push(key); continue }
    seen.add(key); unique.push(key)
  }

  // Ver existentes ya inscritos
  const idsEst = unique.map(nc => mapEst.get(nc)).filter((x): x is number => Number.isFinite(x))
  let yaInscritos = new Set<number>()
  if (idsEst.length) {
    const q = await supabaseAdmin
      .from('inscripcion')
      .select('id_estudiante')
      .eq('id_grupo', id_grupo)
      .in('id_estudiante', idsEst)
    if (q.error) throw q.error
    yaInscritos = new Set((q.data || []).map((r: any) => Number(r.id_estudiante)))
  }

  const not_found: string[] = []
  let created = 0
  let over_capacity = 0
  for (const nc of unique) {
    const id_est = mapEst.get(nc)
    if (!id_est) { not_found.push(nc); continue }
    if (yaInscritos.has(id_est)) continue
    if (usados >= cupo) { over_capacity += 1; continue }
    const up = await supabaseAdmin
      .from('inscripcion')
      .upsert(
        { id_grupo, id_estudiante: id_est, status: 'ACTIVA' },
        { onConflict: 'id_grupo,id_estudiante', ignoreDuplicates: true }
      )
      .select('id_inscripcion')
      .single()
    if (up.error) throw up.error
    created += 1
    usados += 1
  }

  const skipped = duplicates.length + not_found.length + Array.from(yaInscritos).length + over_capacity
  return { ok: true, created, skipped, not_found, duplicates, over_capacity, cupo, usados_final: usados }
}

// Obtener reprobados y aprobados
export function obtenerReporteAprobadosReprobados(alumnos: any) {
  let aprobados: number = 0;
  let reprobados: number = 0;
  let desercion: number = 0;

  // Solo contar inscripciones activas (no BAJA)
  const alumnosActivos = (alumnos?.rows || []).filter((alumno: any) => {
    const status = String(alumno?.status || 'ACTIVA').toUpperCase();
    return status !== 'BAJA';
  });

  for (const alumno of alumnosActivos) {
    // Usar los promedios ya calculados en listarInscripcionesPorGrupo
    const promedio = Number(alumno.promedio) || 0;
    const promedioAsistencia = Number(alumno.asistencia) || 0;

    // Solo contar si tiene al menos una calificación registrada
    const tieneCalificaciones = alumno.unidades?.some((u: any) => u.calificacion != null);

    if (tieneCalificaciones) {
      if (promedio >= 70 && promedioAsistencia >= 85) {
        aprobados += 1;
      } else {
        reprobados += 1;
      }
    }

    if (promedioAsistencia < 85) {
      desercion += 1;
    }
  }

  return {
    aprobados,
    reprobados,
    desercion,
    total: alumnosActivos.length
  };
}

export function obtenerReportePromedioSemestre(alumnos: any) {
  const promediosPorUnidad = [];
  const numAlumnos = alumnos.length;
  const numUnidades = alumnos[0]?.unidades?.length;

  for (let i = 0; i < numUnidades; i++) {
    let sumaCalificacion = 0;
    let sumaAsistencia = 0;

    for (const alumno of alumnos) {
      const unidad = alumno?.unidades?.[i];
      sumaCalificacion += unidad?.calificacion || 0;
      sumaAsistencia += unidad?.asistencia || 0;
    }

    promediosPorUnidad.push({
      semestre: i + 1,
      calificacion: (sumaCalificacion / numAlumnos).toFixed(2),
      asistencia: (sumaAsistencia / numAlumnos).toFixed(2),
    });
  }
  return promediosPorUnidad;
}
