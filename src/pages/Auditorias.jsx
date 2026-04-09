import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';
import AuditTable from '../components/AuditTable';
import { formatDuration, formatDate, getMonday, CLIENT_LABELS, CAMPAIGN_LABELS } from '../lib/utils';

function PhoneSearch({ navigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 7) return;
    setSearching(true);
    setResults(null);
    try {
      const res = await client.get('/recordings/by-phone', { params: { phone: query.trim() } });
      setResults(res.data.data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          Buscar por número telefónico
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setResults(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ej: 3164666954"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={searching || query.trim().length < 7}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {searching ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Buscar'}
            </button>
          </div>

          {results !== null && (
            <div className="mt-4">
              {results.length === 0 ? (
                <p className="text-sm text-slate-400">No se encontraron grabaciones para ese número.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                      <th className="py-2 text-left pr-4">Agente</th>
                      <th className="py-2 text-left pr-4">Cliente</th>
                      <th className="py-2 text-left pr-4">Duración</th>
                      <th className="py-2 text-left pr-4">Fecha</th>
                      <th className="py-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((rec) => {
                      const done = rec.selection_status === 'completed';
                      const inProg = rec.selection_id && !done;
                      return (
                        <tr key={rec.id} className={done ? 'bg-emerald-50' : ''}>
                          <td className="py-2 pr-4">
                            <span className="font-medium text-slate-800">{rec.agent_name || rec.agent_id}</span>
                            {rec.agent_name && <span className="block text-xs text-slate-400">{rec.agent_id}</span>}
                          </td>
                          <td className="py-2 pr-4 text-slate-600 text-xs">{CLIENT_LABELS[rec.client_code] || rec.client_code}</td>
                          <td className="py-2 pr-4 font-medium text-slate-800">{formatDuration(rec.call_duration)}</td>
                          <td className="py-2 pr-4 text-slate-500 text-xs">{formatDate(rec.file_date)}</td>
                          <td className="py-2 text-right">
                            {done ? (
                              <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors">Auditada</button>
                            ) : inProg ? (
                              <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors">Continuar</button>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await client.post('/audit/select-one', { recording_id: rec.id });
                                    navigate(`/audit/${res.data.data.id}`);
                                  } catch (err) {
                                    alert(err.response?.data?.message || 'Error');
                                  }
                                }}
                                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                              >
                                Auditar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'selected', label: 'Pendiente' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completada' },
  { value: 'skipped', label: 'Omitida' },
];

export default function Auditorias() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selections, setSelections] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters from URL query params
  const [weekStart, setWeekStart] = useState(searchParams.get('week') || getMonday());
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '');
  const [campaignFilter, setCampaignFilter] = useState(searchParams.get('campaign') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanDate, setScanDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  // Agents panel state — keyed by date { "2026-03-05": [...agents] }
  const [scannedByDate, setScannedByDate] = useState({});
  const [scanError, setScanError] = useState(null);

  // Realtime agents (only for today)
  const today = new Date().toISOString().slice(0, 10);
  const [realtimeAgents, setRealtimeAgents] = useState(null);
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  // Load agents by date from the backend (shared across all PCs)
  const fetchWeekAgents = useCallback(async (week, clientCode = null, subcampaign = null) => {
    try {
      const params = { week_start: week };
      if (clientCode) params.client = clientCode;
      if (subcampaign) params.subcampaign = subcampaign;
      const res = await client.get('/scan/week-agents', { params });
      setScannedByDate(res.data.data || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchWeekAgents(weekStart, clientFilter || null, campaignFilter || null);
  }, [weekStart, clientFilter, campaignFilter, fetchWeekAgents]);

  // Load realtime agents when user filters by today
  useEffect(() => {
    if (dateFilter !== today) return;
    setRealtimeAgents(null);
    setRealtimeLoading(true);
    client.get('/realtime/agents', { params: { date: today } })
      .then((res) => setRealtimeAgents(res.data.data || []))
      .catch(() => setRealtimeAgents([]))
      .finally(() => setRealtimeLoading(false));
  }, [dateFilter, today]);


  // Sync filters to URL query params
  useEffect(() => {
    const params = {};
    if (weekStart && weekStart !== getMonday()) params.week = weekStart;
    if (statusFilter) params.status = statusFilter;
    if (clientFilter) params.client = clientFilter;
    if (dateFilter) params.date = dateFilter;
    if (campaignFilter) params.campaign = campaignFilter;
    if (search) params.search = search;
    setSearchParams(params, { replace: true });
  }, [weekStart, statusFilter, clientFilter, dateFilter, campaignFilter, search, setSearchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { week_start: weekStart };
      if (statusFilter) params.status = statusFilter;
      if (clientFilter) params.client = clientFilter;
      if (dateFilter) params.date = dateFilter;
      if (campaignFilter) params.campaign = campaignFilter;

      const res = await client.get('/audit/selections', { params });
      setSelections(res.data.data);
    } catch (err) {
      console.error('Error loading auditorías:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, statusFilter, clientFilter, dateFilter, campaignFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeWeek = (offset) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + offset * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const weekEnd = (() => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const weekDays = (() => {
    const days = [];
    const start = new Date(weekStart + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  })();

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await client.post('/scan/daily', { date: scanDate }, { timeout: 120000 });
      const { date: returnedDate } = res.data.data;
      const d = returnedDate || scanDate;
      await fetchWeekAgents(weekStart, clientFilter || null, campaignFilter || null);
      setDateFilter(d);
    } catch (err) {
      console.error('Error scanning:', err);
      setScanError(err.response?.data?.message || 'Error al escanear');
    } finally {
      setScanning(false);
    }
  };

  const handleAgentClick = (agent, date, source) => {
    const params = new URLSearchParams({ date, name: agent.agent_name || '' });
    if (source) params.set('source', source);
    navigate(`/agent-recordings/${agent.agent_id}?${params.toString()}`);
  };

  const clientOptions = (user?.client_codes || []).map((code) => ({
    value: code,
    label: CLIENT_LABELS[code] || code,
  }));

  const filtered = selections?.filter((sel) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (sel.agent_name || '').toLowerCase();
    const id = (sel.agent_id || '').toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  const counts = selections
    ? {
        total: selections.length,
        selected: selections.filter((s) => s.status === 'selected').length,
        in_review: selections.filter((s) => s.status === 'in_review').length,
        completed: selections.filter((s) => s.status === 'completed').length,
        skipped: selections.filter((s) => s.status === 'skipped').length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Auditorías</h2>
        <p className="text-sm text-slate-500 mt-1">Gestión y seguimiento de auditorías de calidad</p>
      </div>

      {/* Status summary pills */}
      {counts && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total: {counts.total}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Pendientes: {counts.selected}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            En revisión: {counts.in_review}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Completadas: {counts.completed}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            Omitidas: {counts.skipped}
          </span>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
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
              placeholder="Buscar por agente..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {clientOptions.length > 1 && (
            <select
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setCampaignFilter(''); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="">Todos los clientes</option>
              {clientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {clientFilter === 'claro_wcb' ? (
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="">Todas las sub-campañas</option>
              <option value="hogar">Hogar</option>
              <option value="movil">Móvil</option>
              <option value="pymes">Pymes</option>
            </select>
          ) : (user?.client_codes || []).some((c) => c === 'obama' || c === 'lv') && (
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="">Ventas y Customer</option>
              <option value="ventas">Ventas</option>
              <option value="customer">Customer</option>
            </select>
          )}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => changeWeek(-1)}
            className="text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-700">{weekStart} — {weekEnd}</span>
          <button
            onClick={() => changeWeek(1)}
            className="text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={() => setWeekStart(getMonday())}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-1 transition-colors"
          >
            Semana actual
          </button>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={scanDate}
              onChange={(e) => setScanDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
            <button
              onClick={handleScan}
              disabled={scanning || !scanDate}
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Escaneando...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                  </svg>
                  Escanear
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan error */}
        {scanError && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs bg-red-50 text-red-700">{scanError}</div>
        )}

        {/* Day filter */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setDateFilter('')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !dateFilter ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>
          {weekDays.map((day) => {
            const d = new Date(day + 'T00:00:00');
            const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
            const isActive = dateFilter === day;
            const isScanned = (scannedByDate[day]?.length ?? 0) > 0;
            return (
              <button
                key={day}
                onClick={() => setDateFilter(dateFilter === day ? '' : day)}
                className={`relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isScanned
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
                {isScanned && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global phone search */}
      <PhoneSearch navigate={navigate} userClientCodes={user?.client_codes || []} />

      {/* Audit selections list */}
      <AuditTable
        selections={filtered}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* Realtime agents panel — shown when filtering by today */}
      {dateFilter === today && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-800">
                Agentes con grabaciones — hoy (tiempo real)
              </span>
              {realtimeAgents && (
                <span className="ml-2 text-xs text-slate-500">{realtimeAgents.length} agentes</span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </span>
          </div>
          {realtimeLoading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : !realtimeAgents || realtimeAgents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No se encontraron llamadas para hoy
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Agente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Llamadas</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {realtimeAgents
                  .filter((agent) => {
                    if (clientFilter && agent.client_code !== clientFilter) return false;
                    if (search) {
                      const q = search.toLowerCase();
                      const name = (agent.agent_name || '').toLowerCase();
                      const id = (agent.agent_id || '').toLowerCase();
                      if (!name.includes(q) && !id.includes(q)) return false;
                    }
                    return true;
                  })
                  .map((agent) => (
                    <tr
                      key={agent.agent_id}
                      onClick={() => handleAgentClick(agent, today, 'realtime')}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-800">{agent.agent_name || agent.agent_id}</span>
                        {agent.agent_name && (
                          <span className="block text-xs text-slate-400">{agent.agent_id}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {agent.recording_count} llamadas
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <svg className="w-4 h-4 text-slate-400 inline" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Agents panel — shown for the selected day if scanned (not today, covered by realtime panel) */}
      {dateFilter && dateFilter !== today && scannedByDate[dateFilter] && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {(() => {
            const allAgents = scannedByDate[dateFilter];
            const filteredAgents = allAgents.filter((agent) => {
              if (clientFilter && agent.client_code !== clientFilter) return false;
              if (search) {
                const q = search.toLowerCase();
                const name = (agent.agent_name || '').toLowerCase();
                const id = (agent.agent_id || '').toLowerCase();
                if (!name.includes(q) && !id.includes(q)) return false;
              }
              return true;
            });
            return (
              <>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-800">
                Agentes con grabaciones — {dateFilter}
              </span>
              <span className="ml-2 text-xs text-slate-500">{filteredAgents.length} agentes</span>
            </div>
            </div>
          {filteredAgents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No se encontraron grabaciones para esta fecha
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Agente</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Llamadas</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    onClick={() => handleAgentClick(agent, dateFilter)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-800">{agent.agent_name || agent.agent_id}</span>
                      {agent.agent_name && (
                        <span className="block text-xs text-slate-400">{agent.agent_id}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {agent.recording_count} llamadas
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <svg className="w-4 h-4 text-slate-400 inline" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
}
