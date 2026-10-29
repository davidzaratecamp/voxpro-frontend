import { useState, useEffect, useCallback, useMemo } from 'react';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';

const CLIENT_CODES = ['claro_tyt', 'claro_hogar'];
const CLIENT_LABELS = { claro_tyt: 'Claro TyT', claro_hogar: 'Claro Hogar' };
const MAX_DAYS = 92;

function scoreBadge(score) {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Atajos de rango (fechas locales). La semana va de lunes a domingo. */
function presetRange(key) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const monday = new Date(y, m, d - ((today.getDay() + 6) % 7));
  switch (key) {
    case 'hoy': return { from: toIso(today), to: toIso(today) };
    case 'semana': return { from: toIso(monday), to: toIso(today) };
    case 'semana_pasada': {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
      const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
      return { from: toIso(start), to: toIso(end) };
    }
    case 'mes': return { from: toIso(new Date(y, m, 1)), to: toIso(today) };
    default: return { from: toIso(new Date(y, m, d - 29)), to: toIso(today) };
  }
}

const PRESETS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana_pasada', label: 'Semana pasada' },
  { key: 'mes', label: 'Este mes' },
  { key: '30d', label: 'Últimos 30 días' },
];

/** 'YYYY-MM-DD HH:MM:SS' → 'DD/MM/YYYY HH:MM' sin pasar por zona horaria. */
function formatDateTime(value) {
  if (!value) return '—';
  const [ymd, hms = ''] = value.split(' ');
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y} ${hms.slice(0, 5)}`.trim();
}

function allowedClientCodes(user) {
  if (user?.role === 'gestor_usuarios') return CLIENT_CODES;
  return CLIENT_CODES.filter((c) => user?.client_codes?.includes(c));
}

/** Resumen por auditor recalculado sobre las entregas ya filtradas. */
function summarizeByAuditor(auditores, entregas) {
  const stats = new Map();
  for (const r of entregas) {
    if (!stats.has(r.delivered_by)) stats.set(r.delivered_by, { feedbacks: 0, agentes: new Set(), suma: 0, ultimo: r.delivered_at });
    const s = stats.get(r.delivered_by);
    s.feedbacks++;
    s.agentes.add(r.agente_id);
    s.suma += Number(r.score) || 0;
  }
  return auditores
    .map((a) => {
      const s = stats.get(a.auditor_id);
      return s
        ? { ...a, feedbacks: s.feedbacks, agentes: s.agentes.size, promedio_puntaje: Math.round((s.suma / s.feedbacks) * 10) / 10, ultimo: s.ultimo }
        : { ...a, feedbacks: 0, agentes: 0, promedio_puntaje: null, ultimo: null };
    })
    .sort((a, b) => b.feedbacks - a.feedbacks || a.auditor_nombre.localeCompare(b.auditor_nombre, 'es'));
}

export default function SeguimientoFeedback() {
  const { user } = useAuth();
  const campaigns = allowedClientCodes(user);
  const hasCampaigns = campaigns.length > 0;
  const initial = presetRange('30d');

  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [clientCode, setClientCode] = useState('');
  const [auditorId, setAuditorId] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [onlyHighImpact, setOnlyHighImpact] = useState(false);
  const [showZero, setShowZero] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!hasCampaigns) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (clientCode) params.client_code = clientCode;
      const res = await sofiaHumanApi.getFeedbackMonitor(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el seguimiento de feedback.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, clientCode, hasCampaigns]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (key) => {
    const r = presetRange(key);
    setDateFrom(r.from);
    setDateTo(r.to);
  };
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === dateFrom && r.to === dateTo;
  })?.key;

  const clearFilters = () => {
    applyPreset('30d');
    setClientCode('');
    setAuditorId('');
    setAgentSearch('');
    setMinScore('');
    setMaxScore('');
    setOnlyHighImpact(false);
    setShowZero(true);
  };

  // Entregas que pasan todos los filtros salvo el de auditor (para la tabla por auditor).
  const entregasSinFiltroAuditor = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    return (data?.detalle || []).filter((r) =>
      (!q || (r.agente_nombre || '').toLowerCase().includes(q) || String(r.agente_id || '').includes(q)) &&
      (minScore === '' || Number(r.score) >= Number(minScore)) &&
      (maxScore === '' || Number(r.score) <= Number(maxScore)) &&
      (!onlyHighImpact || r.high_impact_failed));
  }, [data, agentSearch, minScore, maxScore, onlyHighImpact]);

  const detalle = useMemo(
    () => entregasSinFiltroAuditor.filter((r) => auditorId === '' || String(r.delivered_by) === auditorId),
    [entregasSinFiltroAuditor, auditorId],
  );

  const auditores = useMemo(() => {
    const list = summarizeByAuditor(data?.auditores || [], entregasSinFiltroAuditor);
    return showZero ? list : list.filter((a) => a.feedbacks > 0);
  }, [data, entregasSinFiltroAuditor, showZero]);

  const sinFeedback = auditores.filter((a) => a.feedbacks === 0).length;
  const selectedAuditor = (data?.auditores || []).find((a) => String(a.auditor_id) === auditorId) || null;

  const inputCls = 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all';
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Seguimiento de feedback</h1>
        <p className="text-sm text-slate-500 mt-1">
          Qué auditores han entregado feedback a los agentes, cuántos y a quién. Las fechas filtran por el día en que se
          entregó el feedback (máximo {MAX_DAYS} días). Haz clic en un auditor para ver solo sus entregas.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                activePreset === p.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Entregado desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>Entregado hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>Auditor</label>
            <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)} className={`w-full ${inputCls}`}>
              <option value="">Todos los auditores</option>
              {(data?.auditores || [])
                .slice()
                .sort((a, b) => a.auditor_nombre.localeCompare(b.auditor_nombre, 'es'))
                .map((a) => <option key={a.auditor_id} value={String(a.auditor_id)}>{a.auditor_nombre}</option>)}
            </select>
          </div>
          {campaigns.length > 1 ? (
            <div>
              <label className={labelCls}>Campaña</label>
              <select value={clientCode} onChange={(e) => setClientCode(e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">Todas las campañas</option>
                {campaigns.map((c) => <option key={c} value={c}>{CLIENT_LABELS[c]}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Campaña</label>
              <div className={`${inputCls} text-slate-500`}>{CLIENT_LABELS[campaigns[0]] || '—'}</div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelCls}>Agente</label>
            <input
              type="text"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder="Nombre o cédula del agente..."
              className={`w-full placeholder-slate-400 ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>Puntaje</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="mín" className={`w-full ${inputCls}`} />
              <span className="text-slate-300">–</span>
              <input type="number" min="0" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="máx" className={`w-full ${inputCls}`} />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={onlyHighImpact} onChange={(e) => setOnlyHighImpact(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300" />
              Solo con falla de alto impacto
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300" />
              Mostrar auditores sin feedback
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800">Limpiar filtros</button>
        </div>
      </div>

      {!hasCampaigns && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
          Tu usuario no tiene asignada ninguna campaña de Claro.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Feedbacks entregados', value: detalle.length.toLocaleString('es-CO') },
            { label: 'Auditores que entregaron', value: auditores.filter((a) => a.feedbacks > 0).length },
            { label: 'Auditores sin feedback', value: sinFeedback, warn: sinFeedback > 0 },
            { label: 'Agentes con feedback', value: new Set(detalle.map((r) => r.agente_id)).size },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.warn ? 'text-amber-600' : 'text-slate-900'}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando...</div>
      ) : data && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">Por auditor</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Auditor</th>
                  <th className="px-4 py-3 text-right font-medium">Feedbacks</th>
                  <th className="px-4 py-3 text-right font-medium">Agentes distintos</th>
                  <th className="px-4 py-3 text-right font-medium">Puntaje promedio</th>
                  <th className="px-4 py-3 text-left font-medium">Último feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Sin auditores para los filtros seleccionados.</td>
                  </tr>
                )}
                {auditores.map((a) => {
                  const id = String(a.auditor_id);
                  return (
                    <tr
                      key={id}
                      onClick={() => setAuditorId(auditorId === id ? '' : id)}
                      className={`cursor-pointer transition-colors ${auditorId === id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {a.auditor_nombre}
                        {a.feedbacks === 0 && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Sin feedback</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{a.feedbacks}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{a.agentes}</td>
                      <td className="px-4 py-3 text-right">
                        {a.promedio_puntaje == null
                          ? <span className="text-slate-300">—</span>
                          : <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(a.promedio_puntaje)}`}>{a.promedio_puntaje}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(a.ultimo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">
                Detalle de entregas{selectedAuditor ? ` — ${selectedAuditor.auditor_nombre}` : ''} ({detalle.length})
              </span>
              {selectedAuditor && (
                <button onClick={() => setAuditorId('')} className="text-xs text-blue-600 hover:text-blue-800">
                  Ver todos los auditores
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Entregado</th>
                  <th className="px-4 py-3 text-left font-medium">Auditor</th>
                  <th className="px-4 py-3 text-left font-medium">Agente</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha llamada</th>
                  <th className="px-4 py-3 text-left font-medium">Puntaje</th>
                  {campaigns.length > 1 && <th className="px-4 py-3 text-left font-medium">Campaña</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalle.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin entregas para los filtros seleccionados.</td>
                  </tr>
                )}
                {detalle.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(r.delivered_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.auditor_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{r.agente_nombre || '—'}</div>
                      <div className="text-xs text-slate-400 font-mono">{r.agente_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(`${r.fecha} ${r.hora || ''}`)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(r.score)}`}>{r.score}/100</span>
                      {r.high_impact_failed && (
                        <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Alto impacto</span>
                      )}
                    </td>
                    {campaigns.length > 1 && <td className="px-4 py-3 text-slate-500 text-xs">{CLIENT_LABELS[r.client_code] || r.client_code}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
