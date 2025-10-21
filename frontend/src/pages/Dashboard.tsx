import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// Ajusta estos strings si tus valores en BD son distintos
const ESTADO_APROBADO = "Aprobado";
const ESTADO_REPROBADO = "Reprobado";
const ESTADO_DESERTOR = "Desertor";

type Counts = {
  total: number;
  aprobados: number;
  reprobados: number;
  desertores: number;
};

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    aprobados: 0,
    reprobados: 0,
    desertores: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [t, a, r, d] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("estado", ESTADO_APROBADO),
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("estado", ESTADO_REPROBADO),
          supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .or(`estado.eq.${ESTADO_DESERTOR},desertor.eq.true`),
        ]);

        setCounts({
          total: t.count ?? 0,
          aprobados: a.count ?? 0,
          reprobados: r.count ?? 0,
          desertores: d.count ?? 0,
        });
      } catch (e: any) {
        setErr(e?.message || "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reprobacionPromedio = useMemo(() => {
    if (counts.total === 0) return 0;
    return Math.round((counts.reprobados / counts.total) * 100);
  }, [counts]);

  const desercionEstimada = useMemo(() => {
    if (counts.total === 0) return 0;
    return Math.round((counts.desertores / counts.total) * 100);
  }, [counts]);

  const chartData = useMemo(
    () => [
      { key: "Aprobados", value: counts.aprobados },
      { key: "Reprobados", value: counts.reprobados },
      { key: "Deserción", value: counts.desertores },
    ],
    [counts]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Página principal</h2>

      {/* Tarjeta principal */}
      <section className="bg-white border rounded-xl shadow p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Bienvenido</h3>
            <p className="text-xs text-gray-500">Resumen rápido del periodo</p>
          </div>
          {loading && <span className="text-xs text-gray-400">Cargando…</span>}
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Kpi label="Total estudiantes" value={counts.total} loading={loading} />
          <Kpi
            label="Reprobación promedio"
            value={`${reprobacionPromedio}%`}
            loading={loading}
          />
          <Kpi
            label="Deserción estimada"
            value={`${desercionEstimada}%`}
            loading={loading}
          />
        </div>

        {/* Gráfica grande y visible */}
        <div className="mt-6">
          <ChartCard
            title="Distribución de resultados"
            subtitle="Aprobados, Reprobados y Deserción"
          >
            <BarsChart
              data={chartData}
              total={counts.total}
              loading={loading}
              height={260}
              barWidth={90}
              gap={40}
              padding={30}
            />
          </ChartCard>
        </div>
      </section>

      {/* Resumen inferior (opcional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Estudiantes" value={counts.total} loading={loading} />
        <Card title="Aprobados" value={counts.aprobados} loading={loading} />
        <Card title="Reprobados" value={counts.reprobados} loading={loading} />
      </div>
    </div>
  );
}

/* ——— Subcomponentes UI ——— */

function Kpi({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">
        {loading ? <Skeleton w="5rem" /> : value}
      </div>
    </div>
  );
}

function Skeleton({ w = "100%", h = "1rem" }: { w?: string; h?: string }) {
  return (
    <span
      className="inline-block animate-pulse rounded bg-gray-200"
      style={{ width: w, height: h }}
    />
  );
}

function Card({
  title,
  value,
  loading,
}: {
  title: string;
  value: any;
  loading?: boolean;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border shadow">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-bold">
        {loading ? <Skeleton w="3rem" /> : value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div>
        <div className="text-sm font-semibold text-gray-700">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-500">{subtitle}</div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ——— Gráfica SVG sin librerías ——— */

function BarsChart({
  data,
  total,
  loading,
  height = 240,
  barWidth = 80,
  gap = 32,
  padding = 24,
}: {
  data: { key: string; value: number }[];
  total: number;
  loading?: boolean;
  height?: number;
  barWidth?: number;
  gap?: number;
  padding?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = padding * 2 + data.length * barWidth + (data.length - 1) * gap;
  const chartHeight = height - 40; // espacio para etiquetas
  const axisY = height - 20;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        role="img"
        aria-label="Gráfica de barras"
        width={width}
        height={height}
      >
        {/* Eje X */}
        <line
          x1={padding - 6}
          y1={axisY}
          x2={width - padding + 6}
          y2={axisY}
          stroke="#CBD5E1"
        />

        {/* Rejas horizontales 0%, 25%, 50%, 75%, 100% del máximo */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = axisY - (chartHeight * p);
          return (
            <g key={i}>
              <line
                x1={padding - 6}
                y1={y}
                x2={width - padding + 6}
                y2={y}
                stroke="#F1F5F9"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94A3B8"
              >
                {Math.round(max * p)}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {data.map((d, i) => {
          const x = padding + i * (barWidth + gap);
          const h = max === 0 ? 0 : (d.value / max) * chartHeight;
          const y = axisY - h;
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;

          return (
            <g key={d.key}>
              <rect
                x={x}
                y={loading ? axisY : y}
                width={barWidth}
                height={loading ? 0 : h}
                rx={8}
                className="fill-gray-900/80"
              />
              {/* Valor arriba */}
              {!loading && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="12"
                  className="fill-gray-700"
                >
                  {d.value} ({pct}%)
                </text>
              )}
              {/* Etiqueta abajo */}
              <text
                x={x + barWidth / 2}
                y={axisY + 14}
                textAnchor="middle"
                fontSize="12"
                className="fill-gray-600"
              >
                {d.key}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Leyenda compacta */}
      <div className="mt-2 text-[11px] text-gray-500">
        Aprobados, Reprobados, Deserción.
      </div>
    </div>
  );
}
