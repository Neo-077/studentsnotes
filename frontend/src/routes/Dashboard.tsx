import KPIGrid from '../components/dashboard/KPIGrid'
import TrendTicker from '../components/dashboard/TrendTicker'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-2xl shadow">Importar / Exportar</button>
      </div>
      <KPIGrid />
      <TrendTicker />
    </div>
  )
}
