
import { useEffect, useState } from 'react'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function ScatterChartPage({ alumnos }: { alumnos: any }) {
  const [points, setPoints] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      setPoints((alumnos || []).map((alumno: { asistencia: number, promedio: number, estudiante: { nombre: string } }) => ({ x: alumno.asistencia, y: alumno.promedio, name: `${alumno?.estudiante?.nombre}` })))
    })()
  }, [alumnos])

  return (
    <>
      {alumnos && alumnos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Dispersión (Asistencia vs Promedio)</h3>
          <div className="h-80 bg-white p-4 rounded-xl border shadow">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="Asistencia" unit="%" />
                <YAxis type="number" dataKey="y" name="Promedio" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={points} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
