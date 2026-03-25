import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { CLIENT_LABELS } from '../lib/utils';

const RISK_LEVELS = {
  high:    { label: 'En riesgo',        bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  medium:  { label: 'Atención',         bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  good:    { label: 'Buen rendimiento', bg: 'bg-emerald-50',text: 'text-emerald-700', dot: 'bg-emerald-500' },
  unknown: { label: 'Sin evaluar',      bg: 'bg-slate-50',  text: 'text-slate-500',  dot: 'bg-slate-400' },
};

function getRisk(agent) {
  if (!agent.completed || agent.avg_score == null) return 'unknown';
  if (agent.avg_score < 60) return 'high';
  if (agent.avg_score < 80) return 'medium';
  return 'good';
}

const FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'high', label: 'En riesgo' },
  { value: 'medium', label: 'Atención' },
  { value: 'good', label: 'Buen rendimiento' },
  { value: 'unknown', label: 'Sin evaluar' },
];

export default function Agentes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (clientFilter) params.client = clientFilter;
      const res = await client.get('/audit/agents-performance', { params });
      setAgents(res.data.data);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientOptions = (user?.client_codes || []).map((code) => ({
    value: code,
    label: CLIENT_LABELS[code] || code,
  }));

  // Enrich with risk level + apply filters
  const enriched = agents?.map((a) => ({ ...a, risk: getRisk(a) }));

  const filtered = enriched?.filter((a) => {
    if (riskFilter && a.risk !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (a.agent_name || '').toLowerCase();
      const id = (a.agent_id || '').toLowerCase();
      if (!name.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  // Summary counts
  const counts = enriched
    ? {
        total: enriched.length,
        high: enriched.filter((a) => a.risk === 'high').length,
        medium: enriched.filter((a) => a.risk === 'medium').length,
        good: enriched.filter((a) => a.risk === 'good').length,
        unknown: enriched.filter((a) => a.risk === 'unknown').length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Agentes</h2>
        <p className="text-sm text-slate-500 mt-1">Rendimiento y nivel de riesgo por agente</p>
      </div>

      {/* Summary cards */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="En riesgo"
            count={counts.high}
            total={counts.total}
            color="red"
          />
          <SummaryCard
            label="Atención"
            count={counts.medium}
            total={counts.total}
            color="amber"
          />
          <SummaryCard
            label="Buen rendimiento"
            count={counts.good}
            total={counts.total}
            color="emerald"
          />
          <SummaryCard
            label="Sin evaluar"
            count={counts.unknown}
            total={counts.total}
            color="slate"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ID de agente..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Risk filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Client filter */}
          {clientOptions.length > 1 && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="">Todos los clientes</option>
              {clientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Agent list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Agente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  {user?.role === 'supervisor_calidad' && (
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Coordinador</th>
                  )}
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Score Prom.</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Auditorías</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Última semana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!filtered || filtered.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'supervisor_calidad' ? 7 : 6} className="px-5 py-12 text-center text-slate-400">
                      {search || riskFilter
                        ? 'No se encontraron agentes con los filtros aplicados'
                        : 'No hay datos de agentes disponibles'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((agent) => {
                    const risk = RISK_LEVELS[agent.risk];
                    return (
                      <tr
                        key={`${agent.agent_id}-${agent.client_code}`}
                        onClick={() => navigate(`/agentes/${encodeURIComponent(agent.agent_id)}?client=${agent.client_code}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {/* Agent */}
                        <td className="px-5 py-3">
                          <span className="text-slate-800 font-medium">{agent.agent_name || agent.agent_id}</span>
                          {agent.agent_name && (
                            <span className="block text-xs text-slate-400">{agent.agent_id}</span>
                          )}
                        </td>

                        {/* Client */}
                        <td className="px-5 py-3 text-slate-600">
                          {CLIENT_LABELS[agent.client_code] || agent.client_code}
                        </td>

                        {/* Coordinator (supervisor only) */}
                        {user?.role === 'supervisor_calidad' && (
                          <td className="px-5 py-3 text-slate-600 text-xs">
                            {agent.auditor_name || '—'}
                          </td>
                        )}

                        {/* Risk badge */}
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${risk.bg} ${risk.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                            {risk.label}
                          </span>
                        </td>

                        {/* Avg score */}
                        <td className="px-5 py-3 text-center">
                          {agent.avg_score != null ? (
                            <span className={`text-sm font-semibold ${
                              agent.avg_score < 60 ? 'text-red-600' :
                              agent.avg_score < 80 ? 'text-amber-600' :
                              'text-emerald-600'
                            }`}>
                              {agent.avg_score}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Audit counts */}
                        <td className="px-5 py-3 text-center">
                          <span className="text-slate-800 font-medium">{agent.completed}</span>
                          <span className="text-slate-400">/{agent.total_audits}</span>
                        </td>

                        {/* Last week */}
                        <td className="px-5 py-3 text-slate-600 text-xs">
                          {agent.last_audit_week || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'agente' : 'agentes'}
              {(search || riskFilter) && enriched && filtered.length !== enriched.length && (
                <span> de {enriched.length} total</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorMap = {
    red:     { bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   bar: 'bg-slate-400' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${c.bg}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${c.text}`}>{count}</p>
      <div className="mt-2 w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% del total</p>
    </div>
  );
}
