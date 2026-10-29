import { useState, useEffect, useCallback, useMemo } from 'react';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';
import QualityScoreDisplay from '../components/QualityScoreDisplay';
import FeedbackPdfButton from '../components/FeedbackPdfButton';

const CLIENT_CODES = ['claro_tyt', 'claro_hogar'];
const CLIENT_LABELS = { claro_tyt: 'Claro TyT', claro_hogar: 'Claro Hogar' };
const WEEKS_BACK = 12;

function scoreBadge(score) {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Lunes (fecha local) de las últimas WEEKS_BACK semanas, la actual primero. */
function lastWeeks() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: WEEKS_BACK }, (_, i) => {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const label = `${formatShort(toIso(start))} – ${formatShort(toIso(end))}${i === 0 ? ' (actual)' : ''}`;
    return { value: toIso(start), label };
  });
}

function allowedClientCodes(user) {
  if (user?.role === 'gestor_usuarios') return CLIENT_CODES;
  return CLIENT_CODES.filter((c) => user?.client_codes?.includes(c));
}

async function blobErrorMessage(err, fallback) {
  try {
    const text = await err.response.data.text();
    return JSON.parse(text).message || fallback;
  } catch {
    return fallback;
  }
}

function Trend({ actual, anterior }) {
  if (actual == null || anterior == null) return <span className="text-slate-300">—</span>;
  const diff = Math.round((actual - anterior) * 10) / 10;
  if (diff === 0) return <span className="text-slate-400 text-xs">= {anterior}</span>;
  const up = diff > 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-600'}`} title={`Semana anterior: ${anterior}`}>
      {up ? '▲' : '▼'} {Math.abs(diff)}
    </span>
  );
}

function AuditDetail({ auditId }) {
  const [audit, setAudit] = useState(undefined);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);

  useEffect(() => {
    let alive = true;
    sofiaHumanApi.getContinuation(auditId)
      .then((res) => alive && setAudit(res.data.data))
      .catch(() => alive && setAudit(null));
    return () => { alive = false; };
  }, [auditId]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const loadAudio = async () => {
    setAudioLoading(true);
    setAudioError(null);
    try {
      const res = await sofiaHumanApi.getContinuationAudio(auditId);
      setAudioUrl(URL.createObjectURL(res.data));
    } catch {
      setAudioError('No se pudo cargar el audio.');
    } finally {
      setAudioLoading(false);
    }
  };

  if (audit === undefined) return <p className="text-xs text-slate-400 py-3">Cargando auditoría...</p>;
  if (!audit) return <p className="text-xs text-red-500 py-3">No se pudo cargar la auditoría.</p>;

  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!audioUrl ? (
          <button
            onClick={loadAudio}
            disabled={audioLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {audioLoading ? 'Cargando audio...' : 'Reproducir llamada'}
          </button>
        ) : (
          <audio controls src={audioUrl} className="w-full sm:w-auto sm:flex-1" />
        )}
        <FeedbackPdfButton continuation={audit} botCallId={audit.bot_call_id} />
      </div>
      {audioError && <p className="text-xs text-red-500">{audioError}</p>}
      <QualityScoreDisplay
        score={audit.score}
        highImpactFailed={audit.high_impact_failed}
        notes={audit.notes}
        general={audit.criteria_general || []}
        highImpact={audit.criteria_high_impact || []}
        transcription={audit.transcription}
      />
    </div>
  );
}

function AgentWeekModal({ agent, week, weekLabel, clientCode, onClose }) {
  const [audits, setAudits] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    sofiaHumanApi.getAgentWeekAudits(agent.agente_id, { week, client_code: clientCode })
      .then((res) => setAudits(res.data.data || []))
      .catch(() => setError('No se pudieron cargar las auditorías del agente.'));
  }, [agent.agente_id, week, clientCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{agent.agente_nombre || agent.agente_id}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cédula {agent.agente_id} · Semana {weekLabel} · {agent.auditorias} auditorías · promedio{' '}
              <span className={`inline-flex px-1.5 rounded font-semibold ${scoreBadge(agent.promedio)}`}>{agent.promedio}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && audits === null && <p className="text-sm text-slate-400 py-8 text-center">Cargando auditorías...</p>}
          {audits && audits.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">Sin auditorías en esta semana.</p>}
          {audits && audits.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium">Duración</th>
                    <th className="px-3 py-2 text-left font-medium">Tipificación</th>
                    <th className="px-3 py-2 text-left font-medium">Calificación</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.map((a) => (
                    <FragmentRow key={a.id} audit={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ audit, open, onToggle }) {
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer transition-colors ${open ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
        <td className="px-3 py-2 text-slate-600 text-xs whitespace-nowrap">{audit.fecha} {String(audit.hora || '').slice(0, 5)}</td>
        <td className="px-3 py-2 font-mono text-slate-600 text-xs">{audit.telefono}</td>
        <td className="px-3 py-2 text-slate-500 text-xs">{formatDuration(audit.duracion)}</td>
        <td className="px-3 py-2 text-slate-600 text-xs">{audit.nomenclatura_nombre || '—'}</td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(audit.score)}`}>
            {audit.score}/100
          </span>
          {!!audit.high_impact_failed && (
            <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Alto impacto</span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-slate-400 text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 bg-slate-50/60">
            <AuditDetail auditId={audit.id} />
          </td>
        </tr>
      )}
    </>
  );
}

const COLUMNS = [
  { key: 'agente_nombre', label: 'Agente', align: 'left' },
  { key: 'auditorias', label: 'Auditorías', align: 'right' },
  { key: 'promedio', label: 'Promedio', align: 'right' },
  { key: 'tendencia', label: 'vs. semana anterior', align: 'right' },
  { key: 'minimo', label: 'Mín', align: 'right' },
  { key: 'maximo', label: 'Máx', align: 'right' },
  { key: 'bajo_60', label: 'Bajo 60', align: 'right' },
  { key: 'criticos', label: 'Alto impacto', align: 'right' },
];

export default function CalificacionAgentes() {
  const { user } = useAuth();
  const weeks = useMemo(lastWeeks, []);
  const campaigns = allowedClientCodes(user);

  const [week, setWeek] = useState(weeks[1]?.value || weeks[0].value);
  const [clientCode, setClientCode] = useState(campaigns.includes('claro_tyt') ? 'claro_tyt' : campaigns[0] || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'promedio', dir: 'desc' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  const weekLabel = weeks.find((w) => w.value === week)?.label.replace(' (actual)', '') || week;

  const load = useCallback(async () => {
    if (!clientCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sofiaHumanApi.getAgentWeekly({ week, client_code: clientCode });
      setData(res.data.data);
    } catch {
      setError('No se pudo cargar la calificación de los agentes.');
    } finally {
      setLoading(false);
    }
  }, [week, clientCode]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await sofiaHumanApi.exportAgentWeekly({ week, client_code: clientCode });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Calificacion_agentes_${CLIENT_LABELS[clientCode].replace(' ', '_')}_semana_${week}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(await blobErrorMessage(err, 'No se pudo generar el Excel. Intenta de nuevo.'));
    } finally {
      setExporting(false);
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.agentes || []).filter((a) =>
      !q || (a.agente_nombre || '').toLowerCase().includes(q) || String(a.agente_id).includes(q));
    const value = (a) => (sort.key === 'tendencia'
      ? (a.promedio != null && a.promedio_anterior != null ? a.promedio - a.promedio_anterior : null)
      : a[sort.key]);
    return [...list].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sort]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'agente_nombre' ? 'asc' : 'desc' }));
  };

  const resumen = data?.resumen;
  const selectCls = 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calificación de agentes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Promedio semanal de cada asesor sobre las llamadas transferidas por SOFIA y calificadas automáticamente por la IA.
          Haz clic en un agente para ver todas sus auditorías de la semana.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <select value={week} onChange={(e) => setWeek(e.target.value)} className={selectCls}>
            {weeks.map((w) => <option key={w.value} value={w.value}>Semana {w.label}</option>)}
          </select>
          {campaigns.length > 1 && (
            <select value={clientCode} onChange={(e) => setClientCode(e.target.value)} className={selectCls}>
              {campaigns.map((c) => <option key={c} value={c}>{CLIENT_LABELS[c]}</option>)}
            </select>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar agente por nombre o cédula..."
            className="flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <button
            onClick={handleExport}
            disabled={!clientCode || loading || exporting || !data?.agentes?.length}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {!clientCode && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
          Tu usuario no tiene asignada ninguna campaña de Claro.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Agentes auditados', value: resumen.agentes },
            { label: 'Auditorías', value: resumen.auditorias.toLocaleString('es-CO') },
            { label: 'Promedio general', value: resumen.promedio ?? '—', badge: resumen.promedio },
            { label: 'Fallas de alto impacto', value: resumen.criticos.toLocaleString('es-CO') },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {k.badge !== undefined ? <span className={`px-2 rounded-lg ${scoreBadge(k.badge)}`}>{k.value}</span> : k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap hover:text-slate-700 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-slate-400">
                    No hay auditorías calificadas en esta semana.
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={`${a.client_code}|${a.agente_id}`} onClick={() => setSelected(a)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium">{a.agente_nombre || '—'}</div>
                    <div className="text-xs text-slate-400 font-mono">{a.agente_id}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{a.auditorias}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(a.promedio)}`}>{a.promedio}</span>
                  </td>
                  <td className="px-4 py-3 text-right"><Trend actual={a.promedio} anterior={a.promedio_anterior} /></td>
                  <td className="px-4 py-3 text-right text-slate-500">{a.minimo}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{a.maximo}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{a.bajo_60}</td>
                  <td className={`px-4 py-3 text-right ${a.criticos ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{a.criticos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <AgentWeekModal
          agent={selected}
          week={week}
          weekLabel={weekLabel}
          clientCode={clientCode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
