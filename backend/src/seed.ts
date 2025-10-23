import { supabase } from './config/supabase.js'

async function step(name: string, fn: () => Promise<void>) {
  process.stdout.write(`→ ${name}... `)
  await fn()
  console.log('OK')
}

async function up() {
  // Ping
  await step('Ping Supabase', async () => {
    const { error } = await supabase.from('carrera').select('id_carrera').limit(1)
    if (error) throw new Error(`Supabase inaccesible o credenciales inválidas: ${error.message}`)
  })

  await step('Sembrar GENERO', async () => {
    const { error } = await supabase.from('genero').upsert([
      { id_genero: 1, clave: 'M', descripcion: 'Masculino' },
      { id_genero: 2, clave: 'F', descripcion: 'Femenino' },
      { id_genero: 3, clave: 'O', descripcion: 'Otro' },
    ])
    if (error) throw error
  })

  let carreras: any[] | null = null
  await step('Sembrar CARRERA', async () => {
    const { data, error } = await supabase
      .from('carrera')
      .upsert([
        { clave: 'SIS', nombre: 'Ing. Sistemas Computacionales' },
        { clave: 'INF', nombre: 'Lic. Informática' },
        { clave: 'IND', nombre: 'Ing. Industrial' },
      ])
      .select('*')
    if (error) throw error
    carreras = data
  })

  let docentes: any[] | null = null
  await step('Sembrar DOCENTE', async () => {
    const { data, error } = await supabase
      .from('docente')
      .upsert([
        { rfc: 'RFC001', nombre: 'Juan', ap_paterno: 'Pérez', ap_materno: 'Lopez', correo: 'maestro@example.com', activo: true },
        { rfc: 'RFC002', nombre: 'Ana', ap_paterno: 'García', ap_materno: 'Ruiz', correo: 'ana@example.com', activo: true },
      ])
      .select('*')
    if (error) throw error
    docentes = data
  })

  let terminos: any[] | null = null
  await step('Sembrar TERMINO', async () => {
    const { data, error } = await supabase
      .from('termino')
      .upsert([
        { anio: 2025, periodo: 'ENE-JUN', fecha_inicio: '2025-01-15', fecha_fin: '2025-06-30' },
        { anio: 2025, periodo: 'AGO-DIC', fecha_inicio: '2025-08-10', fecha_fin: '2025-12-15' },
      ])
      .select('*')
    if (error) throw error
    terminos = data
  })

  let modalidades: any[] | null = null
  await step('Sembrar MODALIDAD', async () => {
    const { data, error } = await supabase
      .from('modalidad')
      .upsert([{ nombre: 'Presencial' }, { nombre: 'Mixta' }])
      .select('*')
    if (error) throw error
    modalidades = data
  })

  let materias: any[] | null = null
  await step('Sembrar MATERIA', async () => {
    const { data, error } = await supabase
      .from('materia')
      .upsert([
        { clave: 'MAT1', nombre: 'Calidad de Software', unidades: 5, creditos: 8 },
        { clave: 'MAT2', nombre: 'Estructuras de Datos', unidades: 5, creditos: 8 },
        { clave: 'MAT3', nombre: 'Bases de Datos', unidades: 5, creditos: 8 },
        { clave: 'MAT4', nombre: 'Redes de Computadoras', unidades: 5, creditos: 8 },
        { clave: 'MAT5', nombre: 'Ingeniería de Software', unidades: 5, creditos: 8 },
      ])
      .select('*')
    if (error) throw error
    materias = data
  })

  await step('Sembrar ESTUDIANTE (20)', async () => {
    const ests = Array.from({ length: 20 }).map((_, i) => ({
      no_control: `NC${String(i + 1).padStart(3, '0')}`,
      nombre: `Alumno${i + 1}`,
      ap_paterno: `Ap${i + 1}`,
      ap_materno: `Am${i + 1}`,
      id_genero: ((i % 3) + 1),
      id_carrera: carreras?.[i % (carreras?.length || 1)]?.id_carrera,
      activo: true,
    }))
    const { error } = await supabase.from('estudiante').upsert(ests, { onConflict: 'no_control' })
    if (error) throw error
  })

  await step('Sembrar GRUPO (5)', async () => {
    const term = terminos?.[0]
    const mod = modalidades?.[0]
    const doc1 = docentes?.[0]
    const doc2 = docentes?.[1]
    const payload = [
      { id_materia: materias?.[0]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S1-A1', horario: 'Lu-Mi 9-11', cupo: 30 },
      { id_materia: materias?.[1]?.id_materia, id_docente: doc2?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S1-B1', horario: 'Ma-Ju 9-11', cupo: 25 },
      { id_materia: materias?.[2]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S3-A1', horario: 'Lu-Mi 11-13', cupo: 30 },
      { id_materia: materias?.[3]?.id_materia, id_docente: doc2?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S5-A1', horario: 'Ma-Ju 7-9', cupo: 25 },
      { id_materia: materias?.[4]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S5-B1', horario: 'Vi 9-12', cupo: 20 },
    ]
    const { error } = await supabase.from('grupo').upsert(payload)
    if (error) throw error
  })

  console.log('✓ Seed completo')
}

up().catch((e) => {
  console.error({
    message: (e as any)?.message ?? String(e),
    stack: (e as any)?.stack,
    hint: 'Revisa .env (URL y SERVICE_ROLE), conexión a internet, y que las tablas existan en Supabase.',
  })
  process.exit(1)
})
