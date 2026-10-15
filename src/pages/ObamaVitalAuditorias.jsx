import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { obamaVitalApi, OBAMA_VITAL_CAMPAIGNS, OBAMA_VITAL_STATUS, FUENTES } from '../api/obamaVital';
import { formatDuration, formatDate } from '../lib/utils';
import { exportarHistorialAsiste } from '../lib/asisteExcel';

const INPUT = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const TABS = [
  { key: 'seleccionar', label: 'Seleccionar llamadas' },
  { key: 'historial',   label: 'Historial de auditorías' },
  { key: 'resumen',     label: 'Resumen por agente' },
];

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score < 60) return 'text-red-600 font-semibold';
  if (score < 80) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function CampaignSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      <option value="">Todas</option>
      {OBAMA_VITAL_CAMPAIGNS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}

function Card({ loading, error, empty, emptyText, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 text-center py-6">{error}</p>
      ) : empty ? (
        <p className="text-sm text-slate-400 text-center py-6">{emptyText}</p>
      ) : children}
    </div>
  );
}

function FuenteBadge({ fuente }) {
  const zoom = fuente === 'zoom';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${zoom ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
      {zoom ? 'Zoom' : 'Aware'}
    </span>
  );
}

function FuenteSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      <option value="">Todas</option>
      {FUENTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
    </select>
  );
}

function AgentCell({ nombre, cedula }) {
  return (
    <td className="py-2 pr-4">
      <span className="font-medium text-slate-800">{nombre || cedula}</span>
      {nombre && <span className="block text-xs text-slate-400">{cedula}</span>}
    </td>
  );
}

export default function ObamaVitalAuditorias() {
  const [tab, setTab] = useState('seleccionar');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Obama Vital</h2>
        <p className="text-sm text-slate-500 mt-1">
          Llamadas de Bienvenida (outbound) y ObamaCus (inbound), por Aware y por Zoom. Selecciona una llamada, precalifícala con IA y confirma o corrige la calificación.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'seleccionar' && <SeleccionarTab />}
      {tab === 'historial' && <HistorialTab />}
      {tab === 'resumen' && <ResumenTab />}
    </div>
  );
}

function SeleccionarTab() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [campaign, setCampaign] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [calls, setCalls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState(null);
  const [fuente, setFuente] = useState('');
  const [zoomError, setZoomError] = useState('');

  const fetchCalls = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { date };
    if (campaign) params.campaign = campaign;
    if (phoneSearch) params.telefono = phoneSearch;
    obamaVitalApi
      .getCallsForDay(params)
      .then((res) => { setCalls(res.data.data); setZoomError(res.data.zoom_error || ''); })
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar las llamadas'))
      .finally(() => setLoading(false));
  }, [date, campaign, phoneSearch]);

  useEffect(() => {
    const t = setTimeout(fetchCalls, 300);
    return () => clearTimeout(t);
  }, [fetchCalls]);

  const handleAuditar = async (call) => {
    setSelectingId(call.uniqueid);
    setError('');
    try {
      const res = await obamaVitalApi.selectOne(call.uniqueid, call.fecha);
      navigate(`/obama-vital/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al seleccionar la llamada');
      setSelectingId(null);
    }
  };

  const filteredCalls = calls?.filter((c) => {
    if (fuente && c.fuente !== fuente) return false;
    if (!agentSearch) return true;
    const needle = agentSearch.toLowerCase();
    return (c.agente_nombre || '').toLowerCase().includes(needle) || (c.agente_id || '').includes(agentSearch);
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
          </Field>
          <Field label="Campaña">
            <CampaignSelect value={campaign} onChange={setCampaign} />
          </Field>
          <Field label="Fuente">
            <FuenteSelect value={fuente} onChange={setFuente} />
          </Field>
          <Field label="Agente">
            <input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Nombre o cédula..." className={INPUT} />
          </Field>
          <Field label="Teléfono del cliente">
            <input type="text" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} placeholder="Número..." className={INPUT} />
          </Field>
          {calls && !loading && (
            <p className="text-xs text-slate-400 pb-2">{filteredCalls.length} llamadas</p>
          )}
        </div>
      </div>

      {zoomError && !loading && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">{zoomError}</div>
      )}

      <Card loading={loading} error={error} empty={!filteredCalls?.length} emptyText="No hay llamadas con grabación para ese filtro.">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 text-left pr-4">Agente</th>
              <th className="py-2 text-left pr-4">Campaña</th>
              <th className="py-2 text-left pr-4">Fuente</th>
              <th className="py-2 text-left pr-4">Teléfono</th>
              <th className="py-2 text-left pr-4">Hora</th>
              <th className="py-2 text-left pr-4">Duración</th>
              <th className="py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCalls?.map((call) => {
              const done = call.audit_status === 'completed';
              return (
                <tr key={call.uniqueid} className={done ? 'bg-emerald-50' : ''}>
                  <AgentCell nombre={call.agente_nombre} cedula={call.agente_id} />
                  <td className="py-2 pr-4 text-slate-600 text-xs">{call.proyecto_nombre}</td>
                  <td className="py-2 pr-4"><FuenteBadge fuente={call.fuente} /></td>
                  <td className="py-2 pr-4 text-slate-600">{call.telefono || '—'}</td>
                  <td className="py-2 pr-4 text-slate-500 text-xs">{call.hora || '—'}</td>
                  <td className="py-2 pr-4 font-medium text-slate-800">{formatDuration(call.duracion)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {call.audit_id ? (
                      <button
                        onClick={() => navigate(`/obama-vital/${call.audit_id}`)}
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${done ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                      >
                        {done ? `Auditada · ${call.audit_score}` : 'Continuar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAuditar(call)}
                        disabled={selectingId === call.uniqueid}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {selectingId === call.uniqueid ? 'Abriendo...' : 'Auditar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function HistorialTab() {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState('');
  const [status, setStatus] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fuente, setFuente] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (campaign) p.campaign = campaign;
    if (status) p.status = status;
    if (fuente) p.source = fuente;
    if (agentSearch) p.agente = agentSearch;
    if (phoneSearch) p.telefono = phoneSearch;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  }, [campaign, status, fuente, agentSearch, phoneSearch, dateFrom, dateTo]);

  const fetchRows = useCallback(() => {
    setLoading(true);
    setError('');
    obamaVitalApi
      .listAudits(params)
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el historial'))
      .finally(() => setLoading(false));
  }, [params]);

  // Exporta exactamente lo filtrado (con criterios y observaciones, sin transcripción).
  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await obamaVitalApi.exportAudits(params);
      const partes = [
        dateFrom || dateTo ? `Fechas: ${dateFrom ? formatDate(dateFrom) : 'inicio'} a ${dateTo ? formatDate(dateTo) : 'hoy'}` : 'Todas las fechas',
        campaign && `Campaña: ${OBAMA_VITAL_CAMPAIGNS.find((c) => c.value === campaign)?.label}`,
        fuente && `Fuente: ${FUENTES.find((f) => f.value === fuente)?.label}`,
        status && `Estado: ${OBAMA_VITAL_STATUS[status]?.label}`,
        agentSearch && `Agente: ${agentSearch}`,
        phoneSearch && `Teléfono: ${phoneSearch}`,
      ].filter(Boolean);
      await exportarHistorialAsiste(res.data.data, partes.join(' · '));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo exportar el Excel');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Agente">
            <input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Nombre o cédula..." className={INPUT} />
          </Field>
          <Field label="Teléfono del cliente">
            <input type="text" value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} placeholder="Número..." className={INPUT} />
          </Field>
          <Field label="Estado">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {Object.entries(OBAMA_VITAL_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Campaña">
            <CampaignSelect value={campaign} onChange={setCampaign} />
          </Field>
          <Field label="Fuente">
            <FuenteSelect value={fuente} onChange={setFuente} />
          </Field>
          <Field label="Desde">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={INPUT} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={INPUT} />
          </Field>
          <div className="ml-auto flex items-end gap-3">
            {rows && !loading && <p className="text-xs text-slate-400 pb-2">{rows.length} auditorías</p>}
            <button
              onClick={handleExport}
              disabled={exporting || loading || !rows?.length}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      <Card loading={loading} error={error} empty={!rows?.length} emptyText="No hay auditorías que coincidan con ese filtro.">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 text-left pr-4">Agente</th>
              <th className="py-2 text-left pr-4">Campaña</th>
              <th className="py-2 text-left pr-4">Fuente</th>
              <th className="py-2 text-left pr-4">Fecha</th>
              <th className="py-2 text-left pr-4">Estado</th>
              <th className="py-2 text-left pr-4">Puntaje</th>
              <th className="py-2 text-left pr-4">IA</th>
              <th className="py-2 text-left pr-4">Auditor</th>
              <th className="py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.map((row) => (
              <tr key={row.id}>
                <AgentCell nombre={row.agente_nombre} cedula={row.agente_id} />
                <td className="py-2 pr-4 text-slate-600 text-xs">{row.proyecto_nombre}</td>
                <td className="py-2 pr-4"><FuenteBadge fuente={row.source} /></td>
                <td className="py-2 pr-4 text-slate-500 text-xs whitespace-nowrap">{formatDate(row.fecha)} {row.hora?.slice(0, 5)}</td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${OBAMA_VITAL_STATUS[row.status]?.style}`}>
                    {OBAMA_VITAL_STATUS[row.status]?.label}
                  </span>
                </td>
                <td className={`py-2 pr-4 ${scoreColor(row.score)}`}>{row.score != null ? `${row.score}/100` : '—'}</td>
                <td className="py-2 pr-4 text-xs text-slate-500">{row.ai_score != null ? row.ai_score : '—'}</td>
                <td className="py-2 pr-4 text-xs text-slate-500">{row.auditor_nombre || '—'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => navigate(`/obama-vital/${row.id}`)} className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors">Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ResumenTab() {
  const [campaign, setCampaign] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRows = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (campaign) params.campaign = campaign;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    obamaVitalApi
      .getSummary(params)
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el resumen'))
      .finally(() => setLoading(false));
  }, [campaign, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 300);
    return () => clearTimeout(t);
  }, [fetchRows]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Campaña">
            <CampaignSelect value={campaign} onChange={setCampaign} />
          </Field>
          <Field label="Desde">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={INPUT} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={INPUT} />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-3">Solo auditorías completadas. Ordenado del puntaje más bajo al más alto.</p>
      </div>

      <Card loading={loading} error={error} empty={!rows?.length} emptyText="Todavía no hay auditorías completadas en ese rango.">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 text-left pr-4">Agente</th>
              <th className="py-2 text-right pr-4">Auditorías</th>
              <th className="py-2 text-right pr-4">Puntaje promedio</th>
              <th className="py-2 text-right">Fallas de alto impacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.map((row) => (
              <tr key={row.agente_id}>
                <AgentCell nombre={row.agente_nombre} cedula={row.agente_id} />
                <td className="py-2 pr-4 text-right text-slate-700 tabular-nums">{row.auditorias}</td>
                <td className={`py-2 pr-4 text-right tabular-nums ${scoreColor(row.score_promedio)}`}>{row.score_promedio ?? '—'}</td>
                <td className="py-2 text-right text-slate-700 tabular-nums">{row.fallas_alto_impacto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
