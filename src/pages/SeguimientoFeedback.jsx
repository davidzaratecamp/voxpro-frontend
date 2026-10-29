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

function defaultDates() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  return { from: toIso(from), to: toIso(today) };
}

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

export default function SeguimientoFeedback() {
  const { user } = useAuth();
  const campaigns = allowedClientCodes(user);
  const hasCampaigns = campaigns.length > 0;
  const initial = defaultDates();

  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [clientCode, setClientCode] = useState('');
  const [auditorId, setAuditorId] = useState(null);
  const [agentSearch, setAgentSearch] = useState('');
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
  useEffect(() => { setAuditorId(null); }, [dateFrom, dateTo, clientCode]);

  const selectedAuditor = data?.auditores.find((a) => a.auditor_id === auditorId) || null;

  const detalle = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    return (data?.detalle || []).filter((r) =>
      (auditorId == null || r.delivered_by === auditorId) &&
      (!q || (r.agente_nombre || '').toLowerCase().includes(q) || String(r.agente_id || '').includes(q)));
  }, [data, auditorId, agentSearch]);

  const inputCls = 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all';
  const resumen = data?.resumen;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Seguimiento de feedback</h1>
        <p className="text-sm text-slate-500 mt-1">
          Qué auditores han entregado feedback a los agentes, cuántos y a quién. Las fechas filtran por el día en que se
          entregó el feedback (máximo {MAX_DAYS} días). Haz clic en un auditor para ver solo sus entregas.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
          {campaigns.length > 1 && (
            <select value={clientCode} onChange={(e) => setClientCode(e.target.value)} className={inputCls}>
              <option value="">Todas las campañas</option>
              {campaigns.map((c) => <option key={c} value={c}>{CLIENT_LABELS[c]}</option>)}
            </select>
          )}
          <input
            type="text"
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
            placeholder="Buscar agente por nombre o cédula..."
            className={`flex-1 min-w-[180px] placeholder-slate-400 ${inputCls}`}
          />
        </div>
      </div>

      {!campaigns.length && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
          Tu usuario no tiene asignada ninguna campaña de Claro.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Feedbacks entregados', value: resumen.feedbacks.toLocaleString('es-CO') },
            { label: 'Auditores que entregaron', value: resumen.auditores },
            { label: 'Agentes con feedback', value: resumen.agentes },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{k.value}</p>
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
                {data.auditores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Nadie ha entregado feedback en el rango seleccionado.
                    </td>
                  </tr>
                )}
                {data.auditores.map((a) => (
                  <tr
                    key={a.auditor_id}
                    onClick={() => setAuditorId(auditorId === a.auditor_id ? null : a.auditor_id)}
                    className={`cursor-pointer transition-colors ${auditorId === a.auditor_id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 text-slate-800 font-medium">{a.auditor_nombre}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{a.feedbacks}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{a.agentes}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(a.promedio_puntaje)}`}>{a.promedio_puntaje}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(a.ultimo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">
                Detalle de entregas{selectedAuditor ? ` — ${selectedAuditor.auditor_nombre}` : ''} ({detalle.length})
              </span>
              {selectedAuditor && (
                <button onClick={() => setAuditorId(null)} className="text-xs text-blue-600 hover:text-blue-800">
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
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin entregas para mostrar.</td>
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
