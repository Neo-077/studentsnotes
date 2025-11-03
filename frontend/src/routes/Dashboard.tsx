import KPIGrid from '../components/dashboard/KPIGrid'
import TrendTicker from '../components/dashboard/TrendTicker'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <button className="h-10 px-4 rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
          Importar / Exportar
        </button>
      </div>
      <KPIGrid />
      <TrendTicker />
    </div>
  )
}
