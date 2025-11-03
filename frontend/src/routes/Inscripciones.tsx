import AddStudentForm from "../components/inscripciones/AddStudentForm"

export default function Inscripciones() {
  return (
    <div className="grid md:grid-cols-[1fr_420px] gap-6">
      <section className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Registrar nuevo estudiante</h2>
          <p className="text-sm text-slate-500">
            Completa los datos del estudiante para darlo de alta en la universidad.
          </p>
          <div className="mt-4">
            <AddStudentForm />
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">¿Vas a inscribir a grupos?</h3>
          <p className="mt-1 text-xs text-slate-500">
            Una vez dado de alta el estudiante, ve a <a href="/grupos" className="text-blue-600 hover:underline">Grupos</a> para asignarlo
            a las materias correspondientes.
          </p>
        </div>
      </aside>
    </div>
  )
}
