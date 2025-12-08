import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'
import { useTranslation } from 'react-i18next'
import SpeakOnClick from '../components/SpeakOnClick'
import { useAccessibility } from '../store/useAccessibility'
import { TTS } from '../lib/tts'

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
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const isAdmin = role === 'admin'

  // 🔊 Configuración de voz global
  const { voiceEnabled, voiceRate } = useAccessibility((s) => ({
    voiceEnabled: s.voiceEnabled,
    voiceRate: s.voiceRate,
  }))

  const speak = (textToSpeak?: string) => {
    if (!voiceEnabled) return
    if (!textToSpeak) return
    if (!TTS.isSupported()) return
    TTS.speak(textToSpeak, { rate: voiceRate })
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get('/dashboard')
        setData(response)
      } catch (e: any) {
        const baseError = t(
          'dashboard.errors.loadFailed',
          'Error al cargar datos del dashboard'
        )
        setError(`${baseError}${e?.message ? `: ${e.message}` : ''}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  async function exportToPDF() {
    if (!chartRef.current) return

    setExporting(true)

    try {
      const cardBg = getCssVar('--card', '#ffffff')

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
      const prefix = t(
        'dashboard.errors.exportPDF',
        'Error al exportar PDF'
      )
      alert(`${prefix}: ${e?.message || t('dashboard.errors.unknown', 'Error desconocido')}`)
    } finally {
      setExporting(false)
    }
  }

  // Colores basados en el tema (CSS variables) con fallback
  const primary = getCssVar('--primary', '#3b82f6')
  const danger = getCssVar('--danger-bg', '#ef4444')
  const warning = getCssVar('--warning-bg', '#f59e0b')
  const muted = getCssVar('--muted', '#64748b')
  const text = getCssVar('--text', '#1e293b')
  const border = getCssVar('--border', '#e2e8f0')

  const chartData = [
    {
      key: 'registered',
      name: t('dashboard.registered', 'Estudiantes registrados'),
      cantidad: data?.registrados ?? 0,
      fill: primary,
      iconBg: 'color-mix(in oklab, var(--primary), transparent 88%)',
      iconColor: 'var(--primary)',
      description: isAdmin
        ? t('dashboard.description_registered_admin')
        : t('dashboard.description_registered_teacher'),
    },
    {
      key: 'failed',
      name: t('dashboard.failed', 'Estudiantes reprobados'),
      cantidad: data?.reprobados ?? 0,
      fill: danger,
      iconBg: 'color-mix(in oklab, var(--danger-bg), transparent 88%)',
      iconColor: 'var(--danger-bg)',
      description: isAdmin
        ? t('dashboard.description_failed_admin')
        : t('dashboard.description_failed_teacher'),
    },
    {
      key: 'drops',
      name: t('dashboard.drops', 'Bajas'),
      cantidad: data?.bajas ?? 0,
      fill: warning,
      iconBg: 'color-mix(in oklab, var(--warning-bg, #f59e0b), transparent 88%)',
      iconColor: 'var(--warning-bg, #f59e0b)',
      description: isAdmin
        ? t('dashboard.description_drops_admin')
        : t('dashboard.description_drops_teacher'),
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
            {t('dashboard.tooltip.countLabel', 'Cantidad')}:{' '}
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
      <div
        className="py-10 text-sm text-slate-600 dark:text-[var(--muted)]"
        role="status"
        aria-live="polite"
      >
        {t('dashboard.loading', 'Cargando datos del dashboard…')}
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

  // 🔊 Resumen breve del gráfico
  const chartSummary = (() => {
    const registered = data?.registrados ?? 0
    const failed = data?.reprobados ?? 0
    const drops = data?.bajas ?? 0
    const total = registered + failed + drops

    if (total === 0) {
      return t(
        'dashboard.chart_summary_empty',
        'En este momento la gráfica no muestra datos: no hay estudiantes registrados, reprobados ni dados de baja.'
      )
    }

    return t(
      'dashboard.chart_summary_short',
      'La gráfica muestra {{registered}} estudiantes registrados, {{failed}} reprobados y {{drops}} bajas.',
      {
        registered,
        failed,
        drops,
      }
    )
  })()

  // 🔊 Explicación larga para el botón y aria-describedby
  const chartFullExplanation = (() => {
    const registered = data?.registrados ?? 0
    const failed = data?.reprobados ?? 0
    const drops = data?.bajas ?? 0
    const total = registered + failed + drops

    if (total === 0) {
      return t(
        'dashboard.chart_full_empty',
        'Esta es una gráfica de barras con tres categorías: estudiantes registrados, reprobados y bajas. En este momento todas las barras están en cero, por lo que no hay datos registrados.'
      )
    }

    const sorted = [...chartData].sort((a, b) => b.cantidad - a.cantidad)
    const top = sorted[0]

    return t(
      'dashboard.chart_full_explanation',
      'Esta es una gráfica de barras que compara tres categorías: estudiantes registrados, reprobados y bajas. Actualmente hay {{registered}} estudiantes registrados, {{failed}} reprobados y {{drops}} bajas, para un total de {{total}} registros. La barra más alta corresponde a {{topLabel}}, con {{topValue}} estudiantes. Usa esta gráfica para tener una vista rápida del estado general de la población estudiantil.',
      {
        registered,
        failed,
        drops,
        total,
        topLabel: top?.name ?? '',
        topValue: top?.cantidad ?? 0,
      }
    )
  })()

  const chartAriaDescription = chartFullExplanation

  // 🔊 Click en barra
  const handleBarClick = (entry: any) => {
    if (!entry || !entry.payload) return
    const name: string | undefined = entry.payload.name
    const value: number | undefined = entry.payload.cantidad
    if (!name || typeof value !== 'number') return

    const msg = t(
      'dashboard.bar_click_message',
      '{{name}}: {{value}} estudiantes.',
      { name, value }
    )
    speak(msg)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-[var(--text)]">
            {t('dashboard.title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)] mt-1">
            {isAdmin
              ? t('dashboard.subtitle_admin')
              : t('dashboard.subtitle_teacher')}
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={exporting}
          className="inline-flex items-center gap-2.5 rounded-lg bg-blue-600 dark:bg-[var(--primary)] hover:bg-blue-700 dark:hover:bg-[var(--primary)]/90 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          aria-label={
            exporting
              ? t(
                'dashboard.exporting_aria',
                'Exportando la gráfica del dashboard a PDF'
              )
              : t(
                'dashboard.exportPDF_aria',
                'Exportar la gráfica del dashboard a PDF'
              )
          }
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
          <span>
            {exporting
              ? t('dashboard.exporting')
              : t('dashboard.exportPDF')}
          </span>
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chartData.map((item, index) => {
          const cardVoiceText = t(
            'dashboard.card_voice',
            'Tarjeta {{name}}: {{value}} estudiantes. {{description}}',
            {
              name: item.name,
              value: item.cantidad,
              description: item.description,
            }
          )

          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[var(--card)] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-[var(--border)]"
            >
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  {/* 🔊 Botón de icono que lee la tarjeta completa */}
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={() => speak(cardVoiceText)}
                      className="p-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[var(--card)]"
                      style={{ backgroundColor: item.iconBg }}
                      aria-label={t(
                        'dashboard.readCardVoice_aria',
                        'Leer información de la tarjeta: {{name}}',
                        { name: item.name }
                      )}
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
                    </button>
                  )}

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
                    {/* Lee "Nombre indicador, cantidad" al hacer click en el número */}
                    <SpeakOnClick
                      text={`${item.name}, ${item.cantidad.toLocaleString()}`}
                    >
                      {item.cantidad.toLocaleString()}
                    </SpeakOnClick>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-[var(--muted)] mt-1">
                  {item.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Razón más común de baja */}
      {data?.motivoBajaMasComun && (
        <div className="rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-gradient-to-r dark:from-[var(--surface)] dark:to-[var(--card)] p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
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
                {t('dashboard.commonDropReason')}
              </div>
              <SpeakOnClick
                column={t('dashboard.commonDropReason')}
                className="text-lg font-bold text-slate-900 dark:text-[var(--text)] capitalize"
              >
                {data.motivoBajaMasComun}
              </SpeakOnClick>
            </div>
          </div>
        </div>
      )}

      {/* Gráfica */}
      <div
        ref={chartRef}
        className="rounded-2xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] p-8 shadow-lg"
        role="group"
        aria-label={t('dashboard.chart_title')}
        aria-describedby="dashboard-chart-desc"
      >
        <div className="mb-6 space-y-3">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-[var(--text)]">
            {t('dashboard.chart_title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-[var(--muted)]">
            {t('dashboard.chart_subtitle')}
          </p>

          {/* Resumen textual corto */}
          <p className="text-xs text-slate-600 dark:text-[var(--muted)] max-w-3xl">
            {chartSummary}
          </p>

          {/* 🔊 Botón para leer explicación completa de la gráfica */}
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(chartFullExplanation)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[var(--border)] bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
              aria-label={t(
                'dashboard.readChartExplanation_aria',
                'Escuchar una explicación completa de la gráfica'
              )}
            >
              <span aria-hidden="true">🔊</span>
              <span>
                {t(
                  'dashboard.readChartExplanation',
                  'Leer explicación completa de la gráfica'
                )}
              </span>
            </button>
          )}

          {/* Descripción oculta para lectores de pantalla */}
          <p id="dashboard-chart-desc" className="sr-only">
            {chartAriaDescription}
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
                onClick={handleBarClick} // 🔊 click en barra
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
