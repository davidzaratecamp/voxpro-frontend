import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { CLIENT_LABELS, formatDuration, formatDate } from '../lib/utils';

const STATUS_LABELS = {
  selected: 'Seleccionado',
  in_review: 'En revisión',
  completed: 'Completado',
  skipped: 'Omitido',
};

const STATUS_STYLES = {
  selected:  'bg-yellow-50 text-yellow-700',
  in_review: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  skipped:   'bg-slate-100 text-slate-500',
};

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score < 60) return 'text-red-600 font-semibold';
  if (score < 80) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

export default function AgentDetail() {
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const clientCode = searchParams.get('client');
  const navigate = useNavigate();

  const [audits, setAudits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAudits = useCallback(async () => {
    if (!clientCode) return;
    setLoading(true);
    try {
      const res = await client.get(`/audit/agents/${encodeURIComponent(agentId)}/audits`, {
        params: { client: clientCode },
      });
      setAudits(res.data.data);
    } catch (err) {
      console.error('Error loading agent audits:', err);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, clientCode]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  // Derived stats from loaded audits
  const stats = audits
    ? (() => {
        const completed = audits.filter((a) => a.status === 'completed');
        const scores = completed.map((a) => Number(a.score)).filter((s) => !isNaN(s));
        return {
          total: audits.length,
          completed: completed.length,
          in_review: audits.filter((a) => a.status === 'in_review').length,
          skipped: audits.filter((a) => a.status === 'skipped').length,
          avg_score: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
          min_score: scores.length ? Math.min(...scores) : null,
          max_score: scores.length ? Math.max(...scores) : null,
        };
      })()
    : null;

  const agentName = audits?.[0]?.agent_name || decodeURIComponent(agentId);

  const filtered = audits?.filter((a) => !statusFilter || a.status === statusFilter);

  const riskLabel =
    stats?.avg_score == null
      ? { label: 'Sin evaluar', cls: 'bg-slate-100 text-slate-500' }
      : stats.avg_score < 60
      ? { label: 'En riesgo', cls: 'bg-red-50 text-red-700' }
      : stats.avg_score < 80
      ? { label: 'Atención', cls: 'bg-amber-50 text-amber-700' }
      : { label: 'Buen rendimiento', cls: 'bg-emerald-50 text-emerald-700' };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/agentes')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Volver a Agentes
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 truncate">{agentName}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${riskLabel.cls}`}>
              {riskLabel.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>ID: {decodeURIComponent(agentId)}</span>
            <span>·</span>
            <span>{CLIENT_LABELS[clientCode] || clientCode}</span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Total auditorías</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Completadas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Score promedio</p>
            <p className={`text-2xl font-bold mt-1 ${scoreColor(stats.avg_score)}`}>
              {stats.avg_score != null ? stats.avg_score : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Rango de score</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">
              {stats.min_score != null ? `${stats.min_score}–${stats.max_score}` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <label className="text-xs font-medium text-slate-500 shrink-0">Estado</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
        >
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {audits && (
          <span className="ml-auto text-xs text-slate-400">
            {filtered?.length ?? 0} de {audits.length} auditorías
          </span>
        )}
      </div>

      {/* Audits table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha llamada</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duración</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!filtered || filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      {statusFilter ? 'No hay auditorías con este estado' : 'No hay auditorías registradas'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((audit) => (
                    <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                        {audit.file_date ? formatDate(audit.file_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums">
                        {audit.call_duration ? formatDuration(audit.call_duration) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[audit.status] || 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABELS[audit.status] || audit.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center tabular-nums ${scoreColor(audit.score)}`}>
                        {audit.score != null ? audit.score : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                        {audit.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/audit/${audit.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver auditoría →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
