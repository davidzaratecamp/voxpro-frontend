import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { voicebotApi } from '../api/voicebot';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CHART_FONT = { family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: 12 };
const BASE_TOOLTIP = {
  backgroundColor: '#1e293b',
  titleColor: '#f8fafc',
  bodyColor: '#cbd5e1',
  padding: 10,
  cornerRadius: 6,
};

const PROYECTO_COLOR = { 12: '#3b82f6', 13: '#8b5cf6' }; // Hogar azul, TyT violeta
const SCORE_COLOR = { high: '#10b981', mid: '#f59e0b', low: '#ef4444', none: '#cbd5e1' };

const DAY_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

function scoreColorFor(score) {
  if (score == null) return SCORE_COLOR.none;
  if (score >= 80) return SCORE_COLOR.high;
  if (score >= 60) return SCORE_COLOR.mid;
  return SCORE_COLOR.low;
}

// ─── KpiCard ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sublabel, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Chart builders ─────────────────────────────────────────────────────────

function buildVolumeChartData(byProyecto) {
  return {
    labels: byProyecto.map((p) => p.proyecto_name),
    datasets: [
      {
        label: 'Total llamadas',
        data: byProyecto.map((p) => p.total_calls),
        backgroundColor: 'rgba(59,130,246,0.35)',
        borderRadius: 6,
      },
      {
        label: 'Transferidas a asesor',
        data: byProyecto.map((p) => p.transferred),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
    ],
  };
}

const VOLUME_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { font: CHART_FONT, boxWidth: 12 } },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    y: { beginAtZero: true, ticks: { font: CHART_FONT, precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { ticks: { font: CHART_FONT }, grid: { display: false } },
  },
};

function buildAvgScoreChartData(byProyecto) {
  return {
    labels: byProyecto.map((p) => p.proyecto_name),
    datasets: [
      {
        label: 'Puntaje promedio',
        data: byProyecto.map((p) => p.avg_score ?? 0),
        backgroundColor: byProyecto.map((p) => scoreColorFor(p.avg_score)),
        borderRadius: 6,
      },
    ],
  };
}

const AVG_SCORE_OPTIONS = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    x: { min: 0, max: 100, ticks: { font: CHART_FONT }, grid: { color: '#f1f5f9' } },
    y: { ticks: { font: CHART_FONT } },
  },
};

function buildDistDoughnutData(bucket) {
  return {
    labels: ['Alto (≥80)', 'Medio (60-79)', 'Bajo (<60)'],
    datasets: [
      {
        data: [bucket.high, bucket.mid, bucket.low],
        backgroundColor: [SCORE_COLOR.high, SCORE_COLOR.mid, SCORE_COLOR.low],
        borderWidth: 0,
      },
    ],
  };
}

const DOUGHNUT_OPTIONS = {
  cutout: '68%',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { ...CHART_FONT, size: 11 }, boxWidth: 10, padding: 12 } },
    tooltip: BASE_TOOLTIP,
  },
};

function buildTrendChartData(trend, byProyecto) {
  const dates = [...new Set(trend.map((t) => t.date))].sort();
  return {
    labels: dates,
    datasets: byProyecto.map((p) => ({
      label: p.proyecto_name,
      data: dates.map((d) => {
        const row = trend.find((t) => t.date === d && t.proyecto_id === p.proyecto_id);
        return row ? row.avg_score : null;
      }),
      borderColor: PROYECTO_COLOR[p.proyecto_id],
      backgroundColor: PROYECTO_COLOR[p.proyecto_id],
      tension: 0.35,
      spanGaps: true,
      pointRadius: 3,
      pointHoverRadius: 5,
    })),
  };
}

const TREND_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { font: CHART_FONT, boxWidth: 12 } },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    y: { min: 0, max: 100, ticks: { font: CHART_FONT }, grid: { color: '#f1f5f9' } },
    x: { ticks: { font: CHART_FONT }, grid: { display: false } },
  },
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function IAAnalisis() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await voicebotApi.getStats(days);
      setStats(res.data.data);
    } catch {
      setError('No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const byProyecto = stats?.by_proyecto || [];
  const trend = stats?.trend || [];

  const totalCalls = byProyecto.reduce((s, p) => s + p.total_calls, 0);
  const totalTransferred = byProyecto.reduce((s, p) => s + p.transferred, 0);
  const totalAudited = byProyecto.reduce((s, p) => s + p.audited, 0);
  const overallAvg = totalAudited > 0
    ? Math.round(byProyecto.reduce((s, p) => s + (p.avg_score ?? 0) * p.audited, 0) / totalAudited)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis gráfico</h1>
          <p className="text-sm text-slate-500 mt-1">
            Panorama de las llamadas de IA de Claro y sus auditorías automáticas
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Llamadas totales"
          value={loading ? '—' : totalCalls.toLocaleString('es-CO')}
          color="blue"
          sublabel={`Últimos ${days} días`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          }
        />
        <KpiCard
          label="Transferidas a asesor"
          value={loading ? '—' : totalTransferred.toLocaleString('es-CO')}
          color="emerald"
          sublabel={totalCalls > 0 ? `${Math.round((totalTransferred / totalCalls) * 100)}% del total` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          }
        />
        <KpiCard
          label="Auditadas con IA"
          value={loading ? '—' : totalAudited.toLocaleString('es-CO')}
          color="violet"
          sublabel={totalCalls > 0 ? `${Math.round((totalAudited / totalCalls) * 100)}% del total` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.03 8.408-7.183 9.65-.339.1-.727.1-1.634 0C8.03 20.408 3 16.556 3 12c0-.556.048-1.098.14-1.626.196-1.13.32-2.335.32-3.552 0-1.24-.126-2.427-.32-3.535a1.5 1.5 0 011.26-1.73 20.5 20.5 0 018.98 0 1.5 1.5 0 011.26 1.73c-.194 1.108-.32 2.294-.32 3.535 0 1.217.124 2.421.32 3.552.092.528.14 1.07.14 1.626z" />
            </svg>
          }
        />
        <KpiCard
          label="Puntaje promedio"
          value={loading ? '—' : overallAvg != null ? `${overallAvg}/100` : '—'}
          color={overallAvg == null ? 'blue' : overallAvg >= 80 ? 'emerald' : overallAvg >= 60 ? 'amber' : 'blue'}
          sublabel="Todas las campañas"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
        />
      </div>

      {/* Row 1: Volumen + Puntaje promedio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Llamadas por campaña</h2>
          <p className="text-xs text-slate-400 mb-4">Total vs. transferidas a un asesor humano</p>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
            ) : totalCalls === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
            ) : (
              <Bar data={buildVolumeChartData(byProyecto)} options={VOLUME_OPTIONS} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Puntaje promedio por campaña</h2>
          <p className="text-xs text-slate-400 mb-4">Qué tan bien sigue cada bot su prompt operativo</p>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
            ) : totalAudited === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Aún no hay llamadas auditadas
              </div>
            ) : (
              <Bar data={buildAvgScoreChartData(byProyecto)} options={AVG_SCORE_OPTIONS} />
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Distribución de calidad por campaña */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {byProyecto.map((p) => (
          <div key={p.proyecto_id} className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Distribución de calidad — {p.proyecto_name}</h2>
            <p className="text-xs text-slate-400 mb-4">{p.audited} llamada{p.audited !== 1 ? 's' : ''} auditada{p.audited !== 1 ? 's' : ''}</p>
            <div className="h-56">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
              ) : p.audited === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  Sin auditorías todavía
                </div>
              ) : (
                <Doughnut data={buildDistDoughnutData(p)} options={DOUGHNUT_OPTIONS} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: Tendencia */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Tendencia de puntaje</h2>
        <p className="text-xs text-slate-400 mb-4">Puntaje promedio diario por campaña</p>
        <div className="h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
          ) : trend.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Aún no hay suficientes días auditados para mostrar una tendencia
            </div>
          ) : (
            <Line data={buildTrendChartData(trend, byProyecto)} options={TREND_OPTIONS} />
          )}
        </div>
      </div>
    </div>
  );
}
