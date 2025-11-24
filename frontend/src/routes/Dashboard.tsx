import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'

type DashboardData = {
  registrados: number
  reprobados: number
  bajas: number
  motivoBajaMasComun: string | null
}

function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name)
    const trimmed = value.trim()
    return trimmed || fallback
  } catch {
    return fallback
  }
}

export default function Dashboard() {
  const { role } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get('/dashboard')
        setData(response)
      } catch (e: any) {
        setError(e.message || 'Error al cargar datos del dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function exportToPDF() {
    if (!chartRef.current) return

    setExporting(true)

    try {
      // Tomar el fondo del tema (tarjeta) para usarlo en el PNG
      const cardBg = getCssVar('--card', '#ffffff')

      // Un pequeño delay para asegurarnos que todo está pintado
      await new Promise(resolve => setTimeout(resolve, 150))

      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: cardBg || '#ffffff',
        quality: 1.0,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      })

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15

      const img = new Image()
      img.src = dataUrl
      await new Promise(resolve => {
        img.onload = resolve
      })

      const imgWidth = img.width
      const imgHeight = img.height
      const ratio = imgHeight / imgWidth

      let pdfWidth = pageWidth - margin * 2
      let pdfHeight = pdfWidth * ratio

      if (pdfHeight > pageHeight - margin * 2) {
        pdfHeight = pageHeight - margin * 2
        pdfWidth = pdfHeight / ratio
      }

      const x = (pageWidth - pdfWidth) / 2
      const y = margin

      pdf.addImage(dataUrl, 'PNG', x, y, pdfWidth, pdfHeight)
      pdf.save('dashboard-grafica.pdf')
    } catch (e: any) {
      console.error('Error al exportar PDF:', e)
      alert('Error al exportar PDF: ' + (e.message || 'Error desconocido'))
    } finally {
      setExporting(false)
    }
  }

  const isAdmin = role === 'admin'

  // Colores basados en el tema (CSS variables) con fallback
  const primary = getCssVar('--primary', '#3b82f6')
  const danger = getCssVar('--danger-bg', '#ef4444')
  const warning = getCssVar('--warning-bg', '#f59e0b') // si no tienes --warning-bg usará el fallback
  const muted = getCssVar('--muted', '#64748b')
  const text = getCssVar('--text', '#1e293b')
  const border = getCssVar('--border', '#e2e8f0')

  const chartData = [
    {
      name: 'Registrados',
      cantidad: data?.registrados ?? 0,
      fill: primary,
      iconBg: 'color-mix(in oklab, var(--primary), transparent 88%)',
      iconColor: 'var(--primary)',
      description: isAdmin ? 'En toda la institución' : 'En tus grupos',
    },
    {
      name: 'Reprobados',
      cantidad: data?.reprobados ?? 0,
      fill: danger,
      iconBg: 'color-mix(in oklab, var(--danger-bg), transparent 88%)',
      iconColor: 'var(--danger-bg)',
      description: isAdmin ? 'Promedio < 70 en todas las unidades' : 'En tus grupos',
    },
    {
      name: 'Bajas',
      cantidad: data?.bajas ?? 0,
      fill: warning,
      iconBg: 'color-mix(in oklab, var(--warning-bg, #f59e0b), transparent 88%)',
      iconColor: 'var(--warning-bg, #f59e0b)',
      description: isAdmin ? 'Baja definitiva' : 'Inscripciones en baja',
    },
  ]

  const gridColor = border
  const textColor = muted
  const axisLineColor = border
  const legendColor = text

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div
          className="bg-white dark:bg-[var(--card)] p-3 rounded-lg shadow-lg border border-slate-200 dark:border-[var(--border)] text-xs"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold text-slate-900 dark:text-[var(--text)] mb-1">
            {item.name}
          </p>
          <p className="text-xs" style={{ color: item.fill }}>
            Cantidad:{' '}
            <span className="font-bold">
              {payload[0].value.toLocaleString()}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-600 dark:text-[var(--muted)]">
        Cargando datos del dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
        role="alert"
      >
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-[var(--text)]">
            Dashboard
          </h2>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)] mt-1">
            {isAdmin
              ? 'Vista general de toda la institución'
              : 'Vista de tus grupos'}
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={exporting}
          className="inline-flex items-center gap-2.5 rounded-lg bg-blue-600 dark:bg-[var(--primary)] hover:bg-blue-700 dark:hover:bg-[var(--primary)]/90 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <span>{exporting ? 'Exportando...' : 'Exportar PDF'}</span>
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[var(--card)] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-[var(--border)]"
          >
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <div style={{ color: item.iconColor }}>
                    {index === 0 && (
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    )}
                    {index === 1 && (
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    )}
                    {index === 2 && (
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-500 dark:text-[var(--muted)] uppercase tracking-wide">
                    {item.name}
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div
                  className="text-4xl font-bold"
                  style={{ color: item.fill }}
                >
                  {item.cantidad.toLocaleString()}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-[var(--muted)] mt-1">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Razón más común de baja */}
      {data?.motivoBajaMasComun && (
        <div className="rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-gradient-to-r dark:from-[var(--surface)] dark:to-[var(--card)] p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-slate-600 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-[var(--muted)] uppercase tracking-wide mb-1.5">
                Razón más común de baja
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-[var(--text)] capitalize">
                {data.motivoBajaMasComun}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfica */}
      <div
        ref={chartRef}
        className="rounded-2xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] p-8 shadow-lg"
        aria-label="Gráfica de resumen de estudiantes por categoría"
      >
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">
            Resumen de Estudiantes
          </h3>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)]">
            Distribución de estudiantes por categoría
          </p>
        </div>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                {chartData.map((item, index) => (
                  <linearGradient
                    key={index}
                    id={`color${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={item.fill}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={item.fill}
                      stopOpacity={0.7}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: textColor, fontSize: 14, fontWeight: 500 }}
                axisLine={{ stroke: axisLineColor }}
                tickLine={{ stroke: axisLineColor }}
              />
              <YAxis
                tick={{ fill: textColor, fontSize: 14 }}
                axisLine={{ stroke: axisLineColor }}
                tickLine={{ stroke: axisLineColor }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px', color: legendColor, fontSize: 12 }}
                iconType="circle"
              />
              <Bar
                dataKey="cantidad"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#color${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}