import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { CLIENT_LABELS } from '../lib/utils';
import { useBrand } from '../lib/brand';

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Agent row with expandable calls ──────────────────────────────────────────

function AgentRow({ agentId, agentName, calls, search }) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search) return calls;
    const q = search.toLowerCase();
    return calls.filter((c) =>
      String(c.registro_llamada_id).includes(q) ||
      formatTime(c.duration).includes(q) ||
      String(c.proyecto_id || '').includes(q)
    );
  }, [calls, search]);

  const handleSelect = async (call) => {
    setSelecting(call.registro_llamada_id);
    try {
      const res = await client.post('/realtime/select', { call });
      navigate(`/audit/${res.data.data.selection_id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al seleccionar la llamada');
      setSelecting(null);
    }
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Agent header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
          {(agentName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{agentName || 'Sin nombre'}</div>
          <div className="text-xs text-slate-400">{agentId}</div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
          {calls.length} llamada{calls.length !== 1 ? 's' : ''}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Calls list */}
      {open && (
        <div className="bg-slate-50 border-t border-slate-100">
          {filtered.length === 0 ? (
            <p className="px-6 py-3 text-sm text-slate-400">Sin resultados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  <th className="px-6 py-2 text-left">ID</th>
                  <th className="px-6 py-2 text-left">Cliente</th>
                  <th className="px-6 py-2 text-left">Duración</th>
                  <th className="px-6 py-2 text-left">Proyecto</th>
                  <th className="px-6 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((call) => {
                  const isSelecting = selecting === call.registro_llamada_id;
                  return (
                    <tr key={call.registro_llamada_id} className="bg-white hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-2.5 text-slate-500 font-mono text-xs">{call.registro_llamada_id}</td>
                      <td className="px-6 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {call.clientName || CLIENT_LABELS[call.clientCode] || call.clientCode}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-slate-600">{formatTime(call.duration)}</td>
                      <td className="px-6 py-2.5 text-slate-400 text-xs">{call.proyecto_id || '—'}</td>
                      <td className="px-6 py-2.5 text-right">
                        <button
                          onClick={() => handleSelect(call)}
                          disabled={!!selecting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isSelecting ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Seleccionando…
                            </>
                          ) : (
                            'Auditar'
                          )}
                        </button>
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RealtimeMonitor() {
  const brand = useBrand();
  const serverLabel = brand?.serverLabel ?? 'Aware';
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [calls, setCalls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchCalls = useCallback(async (d) => {
    setLoading(true);
    setError('');
    setCalls(null);
    try {
      const res = await client.get('/realtime/calls', { params: { date: d } });
      setCalls(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al obtener llamadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls(date);
  }, [date, fetchCalls]);

  // Group by agent
  const agents = useMemo(() => {
    if (!calls) return [];
    const map = new Map();
    for (const call of calls) {
      const key = call.agent_id || 'sin-agente';
      if (!map.has(key)) {
        map.set(key, { agentId: call.agent_id, agentName: call.agent_name, calls: [] });
      }
      map.get(key).calls.push(call);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.agentName || '').localeCompare(b.agentName || '')
    );
  }, [calls]);

  const filteredAgents = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        (a.agentName || '').toLowerCase().includes(q) ||
        (a.agentId || '').toLowerCase().includes(q)
    );
  }, [agents, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Monitor en tiempo real</h1>
          <p className="text-sm text-slate-500 mt-0.5">Llamadas del día en {serverLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fetchCalls(date)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && calls !== null && calls.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
          </svg>
          <p className="text-slate-500 font-medium">No hay llamadas para esta fecha</p>
        </div>
      )}

      {/* Agents list */}
      {!loading && calls !== null && calls.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar agente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <span className="text-sm text-slate-500 shrink-0">
              {filteredAgents.length} agente{filteredAgents.length !== 1 ? 's' : ''} · {calls.length} llamadas
            </span>
          </div>

          {/* Agent rows */}
          {filteredAgents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">Sin resultados</p>
          ) : (
            filteredAgents.map((a) => (
              <AgentRow
                key={a.agentId || 'sin-agente'}
                agentId={a.agentId}
                agentName={a.agentName}
                calls={a.calls}
                search=""
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
