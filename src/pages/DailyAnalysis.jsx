import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-400 text-xs">—</span>;
  const color = score >= 85 ? 'bg-green-100 text-green-700' : score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{score}</span>;
}

function ContactabilityBar({ rate }) {
  const color = rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 w-9 text-right">{rate}%</span>
    </div>
  );
}

export default function DailyAnalysis() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMetrics = useCallback(async (d) => {
    setLoading(true);
    setError('');
    setAiSummary('');
    try {
      const res = await client.get(`/daily-analysis/metrics?date=${d}`);
      setMetrics(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(date);
  }, [date, fetchMetrics]);

  const handleGenerateAI = async () => {
    if (!metrics) return;
    setAiLoading(true);
    setAiSummary('');
    try {
      const res = await client.post('/daily-analysis/ai-summary', { date, metrics });
      setAiSummary(res.data.data.summary);
    } catch (err) {
      setAiSummary('Error al generar el análisis. Intenta de nuevo.');
    } finally {
      setAiLoading(false);
    }
  };

  const { summary, agents = [], top_errors = [] } = metrics || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análisis del día</h1>
          <p className="text-sm text-slate-500 mt-0.5">Contactabilidad, auditorías y errores frecuentes</p>
        </div>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && metrics && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Agentes activos', value: summary.total_agents, color: 'text-blue-600' },
              { label: 'Total llamadas', value: summary.total_calls, color: 'text-slate-800' },
              { label: 'Contactos efectivos', value: summary.total_effective, color: 'text-slate-800' },
              { label: 'Contactabilidad', value: `${summary.contactability_rate}%`, color: summary.contactability_rate >= 70 ? 'text-green-600' : summary.contactability_rate >= 50 ? 'text-amber-600' : 'text-red-600' },
              { label: 'Agentes auditados', value: summary.audited_agents, color: 'text-slate-800' },
              { label: 'Score promedio', value: summary.avg_score !== null ? summary.avg_score : '—', color: summary.avg_score >= 85 ? 'text-green-600' : summary.avg_score >= 70 ? 'text-amber-600' : 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight mb-2">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Agents table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Agentes</h2>
                <span className="text-xs text-slate-400">{agents.length} total</span>
              </div>
              {agents.length === 0 ? (
                <p className="px-4 py-8 text-sm text-slate-400 text-center">Sin datos para este día</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-medium text-slate-400 uppercase tracking-wide bg-slate-50">
                        <th className="px-4 py-2 text-left">Agente</th>
                        <th className="px-4 py-2 text-center">Llamadas</th>
                        <th className="px-4 py-2 text-center">Efectivas</th>
                        <th className="px-4 py-2 text-left">Contactabilidad</th>
                        <th className="px-4 py-2 text-center">Auditoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agents.map((a) => (
                        <tr key={a.agent_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800 truncate max-w-[160px]">{a.agent_name || a.agent_id}</div>
                            {(a.zoom_calls > 0) && (
                              <div className="text-xs text-slate-400">
                                {a.zoom_calls} Zoom + {a.total_calls} Aware
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{a.total_calls + a.zoom_calls}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{a.effective_calls + a.zoom_effective}</td>
                          <td className="px-4 py-2.5 w-40">
                            <ContactabilityBar rate={a.contactability_rate} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {a.audited ? <ScoreBadge score={a.audit_score} /> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right column: top errors + AI */}
            <div className="space-y-4">
              {/* Top errors */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-700">Errores frecuentes</h2>
                </div>
                {top_errors.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">Sin auditorías completadas</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {top_errors.map((e, i) => (
                      <li key={e.criterion} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-300 w-5 shrink-0">{i + 1}</span>
                          <span className="text-sm text-slate-700 truncate">{e.criterion}</span>
                        </div>
                        <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5 shrink-0">{e.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* AI Summary */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-slate-700">Análisis IA</h2>
                </div>
                <div className="p-4 space-y-3">
                  {aiSummary ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Genera un resumen ejecutivo del día con diagnóstico, mejores agentes, agentes que necesitan atención y acciones concretas.
                    </p>
                  )}
                  <button
                    onClick={handleGenerateAI}
                    disabled={aiLoading || !metrics}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Generando...
                      </>
                    ) : aiSummary ? 'Regenerar análisis' : 'Generar análisis IA'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
