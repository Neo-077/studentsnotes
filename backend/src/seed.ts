import { supabase } from './config/supabase.js';

async function up() {
  // === Catálogos ===
  await supabase.from('genero').upsert([
    { id_genero: 1, clave: 'M', descripcion: 'Masculino' },
    { id_genero: 2, clave: 'F', descripcion: 'Femenino' },
    { id_genero: 3, clave: 'O', descripcion: 'Otro' },
  ]);

  const { data: carreras, error: eCar } = await supabase
    .from('carrera')
    .upsert([
      { clave: 'SIS', nombre: 'Ing. Sistemas Computacionales' },
      { clave: 'INF', nombre: 'Lic. Informática' },
      { clave: 'IND', nombre: 'Ing. Industrial' },
    ])
    .select('*');
  if (eCar) throw eCar;

  const { data: docentes, error: eDoc } = await supabase
    .from('docente')
    .upsert([
      { rfc: 'RFC001', nombre: 'Juan', ap_paterno: 'Pérez', ap_materno: 'Lopez', correo: 'maestro@example.com' },
      { rfc: 'RFC002', nombre: 'Ana', ap_paterno: 'García', ap_materno: 'Ruiz', correo: 'ana@example.com' },
    ])
    .select('*');
  if (eDoc) throw eDoc;

  const { data: terminos, error: eTer } = await supabase
    .from('termino')
    .upsert([
      { anio: 2025, periodo: 'ENE-JUN', fecha_inicio: '2025-01-15', fecha_fin: '2025-06-30' },
      { anio: 2025, periodo: 'AGO-DIC', fecha_inicio: '2025-08-10', fecha_fin: '2025-12-15' },
    ])
    .select('*');
  if (eTer) throw eTer;

  const { data: modalidades, error: eMod } = await supabase
    .from('modalidad')
    .upsert([{ nombre: 'Presencial' }, { nombre: 'Mixta' }])
    .select('*');
  if (eMod) throw eMod;

  const { data: materias, error: eMat } = await supabase
    .from('materia')
    .upsert([
      { clave: 'MAT1', nombre: 'Calidad de Software', unidades: 5, creditos: 8 },
      { clave: 'MAT2', nombre: 'Estructuras de Datos', unidades: 5, creditos: 8 },
      { clave: 'MAT3', nombre: 'Bases de Datos', unidades: 5, creditos: 8 },
      { clave: 'MAT4', nombre: 'Redes de Computadoras', unidades: 5, creditos: 8 },
      { clave: 'MAT5', nombre: 'Ingeniería de Software', unidades: 5, creditos: 8 },
    ])
    .select('*');
  if (eMat) throw eMat;

  // === Estudiantes de prueba (20) distribuidos en carreras ===
  const estudiantes = Array.from({ length: 20 }).map((_, i) => ({
    no_control: `NC${String(i + 1).padStart(3, '0')}`,
    nombre: `Alumno${i + 1}`,
    ap_paterno: `Ap${i + 1}`,
    ap_materno: `Am${i + 1}`,
    id_genero: ((i % 3) + 1),
    id_carrera: carreras?.[i % (carreras?.length || 1)]?.id_carrera,
    activo: true,
  }));
  await supabase.from('estudiante').upsert(estudiantes, { onConflict: 'no_control' });

  // === Grupos (con "semestre" codificado en grupo_codigo S{n}-X) ===
  // Usamos el primer término y modalidad por simplicidad
  const term = terminos?.[0];
  const mod = modalidades?.[0];
  const doc1 = docentes?.[0];
  const doc2 = docentes?.[1];

  const gruposInsert = [
    // Semestre 1
    { id_materia: materias?.[0]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S1-A1', horario: 'Lu-Mi 9-11', cupo: 30 },
    { id_materia: materias?.[1]?.id_materia, id_docente: doc2?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S1-B1', horario: 'Ma-Ju 9-11', cupo: 25 },
    // Semestre 3
    { id_materia: materias?.[2]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S3-A1', horario: 'Lu-Mi 11-13', cupo: 30 },
    // Semestre 5
    { id_materia: materias?.[3]?.id_materia, id_docente: doc2?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S5-A1', horario: 'Ma-Ju 7-9', cupo: 25 },
    { id_materia: materias?.[4]?.id_materia, id_docente: doc1?.id_docente, id_termino: term?.id_termino, id_modalidad: mod?.id_modalidad, grupo_codigo: 'S5-B1', horario: 'Vi 9-12', cupo: 20 },
  ];

  const { error: eGrp } = await supabase.from('grupo').upsert(gruposInsert);
  if (eGrp) throw eGrp;

  console.log('Seed OK: carreras=3, materias=5, grupos=5, estudiantes=20');
}

up().catch((e) => {
  console.error(e);
  process.exit(1);
});
