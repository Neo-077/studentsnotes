import AddStudentForm from "../components/inscripciones/AddStudentForm"
import { useTranslation } from "react-i18next"

export default function Inscripciones() {
  const { t } = useTranslation()

  return (
    <div className="grid md:grid-cols-[1fr_420px] gap-6">
      <section className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            {t("enrollmentsPage.title")}
          </h2>

          <p className="text-sm text-slate-500">
            {t("enrollmentsPage.subtitle")}
          </p>

          <div className="mt-4">
            <AddStudentForm />
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">
            {t("enrollmentsPage.asideTitle")}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {t("enrollmentsPage.asideText")}{" "}
            <a
              href="/grupos"
              className="text-blue-600 hover:underline"
            >
              {t("enrollmentsPage.asideLink")}
            </a>
          </p>
        </div>
      </aside>
    </div>
  )
}