import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import useAuth from '../store/useAuth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'
import { isDark } from '../lib/theme'

type DashboardData = {
    registrados: number
    reprobados: number
    bajas: number
    motivoBajaMasComun: string | null
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

        // Guardar el tema actual
        const wasDark = document.documentElement.classList.contains('dark')
        const originalBodyFilter = document.body.style.filter

        try {
            // Forzar tema claro temporalmente removiendo la clase dark
            document.documentElement.classList.remove('dark')

            // Crear estilos para forzar modo claro en la exportación
            const style = document.createElement('style')
            style.setAttribute('data-export-theme', 'true')
            style.textContent = `
                :root {
                    --text: #1e293b !important;
                    --muted: #64748b !important;
                    --surface: #ffffff !important;
                    --card: #ffffff !important;
                    --border: #e2e8f0 !important;
                }
                .recharts-wrapper, .recharts-surface { 
                    background: #ffffff !important; 
                }
                .recharts-cartesian-axis-tick-value {
                    fill: #64748b !important;
                }
                .recharts-legend-item-text {
                    fill: #1e293b !important;
                }
                .recharts-cartesian-grid-horizontal line,
                .recharts-cartesian-grid-vertical line {
                    stroke: #e2e8f0 !important;
                }
                .recharts-cartesian-axis-line {
                    stroke: #cbd5e1 !important;
                }
                .recharts-cartesian-axis-tick-line {
                    stroke: #cbd5e1 !important;
                }
            `
            document.head.appendChild(style)

            // Remover cualquier filtro del body
            document.body.style.filter = 'none'

            // Esperar un momento para que los cambios se apliquen
            await new Promise(resolve => setTimeout(resolve, 300))

            // Convertir a imagen con fondo blanco
            const dataUrl = await toPng(chartRef.current, {
                backgroundColor: '#ffffff',
                quality: 1.0,
                pixelRatio: 2,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                }
            })

            // Crear PDF
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 15

            // Calcular dimensiones de la imagen
            const img = new Image()
            img.src = dataUrl
            await new Promise((resolve) => {
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
            // Restaurar tema original
            if (wasDark) {
                document.documentElement.classList.add('dark')
            }

            // Limpiar estilos
            const exportStyle = document.head.querySelector('style[data-export-theme="true"]')
            if (exportStyle) {
                document.head.removeChild(exportStyle)
            }

            // Restaurar filtro original del body
            document.body.style.filter = originalBodyFilter

            setExporting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Cargando datos del dashboard...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-red-700">{error}</div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="text-yellow-700">No hay datos disponibles</div>
            </div>
        )
    }

    const chartData = [
        {
            name: 'Registrados',
            cantidad: data.registrados,
            fill: '#3b82f6',
            gradientFrom: '#3b82f6',
            gradientTo: '#2563eb',
            bgGradient: 'rgba(59, 130, 246, 0.1)',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            name: 'Reprobados',
            cantidad: data.reprobados,
            fill: '#ef4444',
            gradientFrom: '#ef4444',
            gradientTo: '#dc2626',
            bgGradient: 'rgba(239, 68, 68, 0.1)',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        {
            name: 'Bajas',
            cantidad: data.bajas,
            fill: '#f59e0b',
            gradientFrom: '#f59e0b',
            gradientTo: '#ea580c',
            bgGradient: 'rgba(245, 158, 11, 0.1)',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            )
        }
    ]

    const isAdmin = role === 'admin'
    const darkMode = isDark()

    // Colores para modo oscuro
    const gridColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#e2e8f0'
    const textColor = darkMode ? '#B7C7D9' : '#64748b' // --muted en dark
    const axisLineColor = darkMode ? 'rgba(36, 52, 74, 0.8)' : '#cbd5e1'
    const legendColor = darkMode ? '#EAF2FB' : '#1e293b' // --text en dark

    // Custom tooltip para la gráfica
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-[var(--card)] p-3 rounded-lg shadow-lg border border-slate-200 dark:border-[var(--border)]">
                    <p className="font-semibold text-slate-900 dark:text-[var(--text)]">{payload[0].payload.name}</p>
                    <p className="text-sm" style={{ color: payload[0].payload.fill }}>
                        Cantidad: <span className="font-bold">{payload[0].value.toLocaleString()}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-[var(--text)]">Dashboard</h2>
                    <p className="text-sm text-slate-600 dark:text-[var(--muted)] mt-1">
                        {isAdmin
                            ? 'Vista general de toda la institución'
                            : 'Vista de tus grupos'}
                    </p>
                </div>
                <button
                    onClick={exportToPDF}
                    disabled={exporting}
                    className="inline-flex items-center gap-2.5 rounded-lg bg-slate-900 dark:bg-gradient-to-r dark:from-blue-500 dark:to-blue-600 hover:bg-slate-800 dark:hover:from-blue-600 dark:hover:to-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>{exporting ? 'Exportando...' : 'Exportar PDF'}</span>
                </button>
            </div>

            {/* Tarjetas de resumen mejoradas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {chartData.map((item, index) => (
                    <div
                        key={index}
                        className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[var(--card)] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-[var(--border)]"
                    >
                        {/* Gradiente de fondo sutil */}
                        <div
                            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-10"
                            style={{
                                background: `linear-gradient(to bottom right, ${item.gradientFrom}15, ${item.gradientTo}15)`,
                                opacity: 0.05
                            }}
                        />

                        {/* Contenido */}
                        <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: item.bgGradient }}
                                >
                                    <div style={{ color: item.fill }}>
                                        {item.icon}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-medium text-slate-500 dark:text-[var(--muted)] uppercase tracking-wide">
                                        {item.name}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-2">
                                <div className={`text-4xl font-bold`} style={{ color: item.fill }}>
                                    {item.cantidad.toLocaleString()}
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 dark:text-[var(--muted)] mt-1">
                                {index === 0 && (isAdmin ? 'En toda la institución' : 'En tus grupos')}
                                {index === 1 && 'Promedio < 70 en todas las unidades'}
                                {index === 2 && (isAdmin ? 'Baja definitiva' : 'Inscripciones en baja')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Razón más común de baja mejorada */}
            {data.motivoBajaMasComun && (
                <div className="rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-gradient-to-r dark:from-[var(--surface)] dark:to-[var(--card)] p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

            {/* Gráfica mejorada */}
            <div ref={chartRef} className="rounded-2xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] p-8 shadow-lg">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-[var(--text)] mb-1">Resumen de Estudiantes</h3>
                    <p className="text-sm text-slate-600 dark:text-[var(--muted)]">Distribución de estudiantes por categoría</p>
                </div>
                <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <defs>
                                {chartData.map((item, index) => (
                                    <linearGradient key={index} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={item.fill} stopOpacity={1} />
                                        <stop offset="100%" stopColor={item.fill} stopOpacity={0.7} />
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
                                wrapperStyle={{ paddingTop: '20px', color: legendColor }}
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

