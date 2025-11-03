import { useEffect, useState } from 'react'
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts'
import api from '../lib/api'

export default function ParetoChart() {
  const [bajas, setBajas] = useState<any[]>([])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const response = await api.get('/baja-materia')
        
        const responseData = response.data?.data || response.data || response
        
        if (!Array.isArray(responseData)) {
          throw new Error('La respuesta no es un array')
        }

        setBajas(responseData)
        
        const counts = new Map<string, number>()
        responseData.forEach((baja: any, index: number) => {
          if (baja?.motivo_adicional) {
            counts.set(baja.motivo_adicional, (counts.get(baja.motivo_adicional) || 0) + 1)
          } else {
            console.warn(`⚠️ Registro ${index + 1} sin motivo_adicional:`, baja)
          }
        })

        
        const arr = Array.from(counts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        const total = arr.reduce((sum, x) => sum + x.value, 0) || 1
        let cum = 0
        const final = arr.map(x => {
          cum += x.value
          return {
            ...x,
            cumPct: +(cum / total * 100).toFixed(2),
            motivo: traducirMotivo(x.name)
          }
        })

        console.log('📈 Datos finales para la gráfica:', final)
        setData(final)

      } catch (err: any) {
        console.error('Error completo:', err)
        console.error('Mensaje de error:', err.message)
        console.error('Respuesta del servidor:', err.response?.data)
        setError(`Error: ${err.message || 'Error desconocido al cargar los datos'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  function traducirMotivo(codigo: string): string {
    const motivos: Record<string, string> = {
      'academico': 'Académico',
      'conductual': 'Conductual',
      'salud': 'Problemas de salud',
      'personal': 'Situación personal/familiar',
      'economico': 'Problemas económicos',
      'otro': 'Otro'
    }
    return motivos[codigo] || codigo
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando datos...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  )

  if (data.length === 0) return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">No hay datos disponibles para mostrar la gráfica</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Distribución de Bajas por Motivo</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="motivo" />
              <YAxis yAxisId="left" label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]}
                label={{ value: 'Porcentaje %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value: any, name: any, props: any) => {
                  if (name === 'value') return [value, 'Cantidad']
                  if (name === 'cumPct') return [`${value}%`, 'Porcentaje acumulado']
                  return [value, name]
                }}
              />
              <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Cantidad" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumPct" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Porcentaje acumulado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
