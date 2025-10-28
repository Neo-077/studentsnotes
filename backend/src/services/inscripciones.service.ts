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
    return {
      id_inscripcion: r.id_inscripcion,
      status: r.status,
      estudiante: r.estudiante,
      unidades: unidadesArr,
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
