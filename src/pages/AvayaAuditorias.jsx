import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { avayaApi } from '../api/avaya';
import AuditTable from '../components/AuditTable';
import StatusBadge from '../components/StatusBadge';
import { getMonday, formatDate, formatFileSize } from '../lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'selected', label: 'Pendiente' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completada' },
  { value: 'skipped', label: 'Omitida' },
];

function UploadModal({ agents, onClose, onUploaded }) {
  const [form, setForm] = useState({
    agent_id: agents[0]?.id || '',
    file_date: new Date().toISOString().slice(0, 10),
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Selecciona un archivo de audio'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('agent_id', form.agent_id);
      fd.append('file_date', form.file_date);
      await avayaApi.uploadRecording(fd);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Subir grabación Avaya</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Agente</label>
            <select
              value={form.agent_id}
              onChange={(e) => set('agent_id', e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre_completo} — {a.cedula}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de la grabación</label>
            <input
              type="date"
              value={form.file_date}
              onChange={(e) => set('file_date', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Archivo de audio</label>
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.m4a,.wma"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
            />
            {file && (
              <p className="text-xs text-slate-400 mt-1">{file.name} — {formatFileSize(file.size)}</p>
            )}
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={uploading || !file}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {uploading ? 'Subiendo...' : 'Subir y auditar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AvayaAuditorias() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [recordings, setRecordings] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const [weekStart, setWeekStart] = useState(searchParams.get('week') || getMonday());
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (weekStart && weekStart !== getMonday()) params.week = weekStart;
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    setSearchParams(params, { replace: true });
  }, [weekStart, statusFilter, search, setSearchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { week_start: weekStart };
      if (statusFilter) params.status = statusFilter;
      const [recRes, agentRes] = await Promise.all([
        avayaApi.getRecordings(params),
        avayaApi.getAgents(),
      ]);
      setRecordings(recRes.data.data);
      setAgents(agentRes.data.data.filter((a) => a.status === 'activo'));
    } catch {
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // Transform recordings into the format AuditTable expects
  const selections = recordings?.map((r) => ({
    id: r.selection_id,
    status: r.status,
    score: r.score,
    agent_id: r.agent_id,
    agent_name: r.agent_name,
    client_code: r.client_code,
    file_date: r.file_date,
    file_name: r.file_name,
    call_duration: r.call_duration,
    week_start: r.week_start,
  }));

  const filtered = selections?.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.agent_name || '').toLowerCase().includes(q) || (s.agent_id || '').toLowerCase().includes(q);
  });

  const counts = recordings ? {
    total: recordings.length,
    selected: recordings.filter((r) => r.status === 'selected').length,
    in_review: recordings.filter((r) => r.status === 'in_review').length,
    completed: recordings.filter((r) => r.status === 'completed').length,
    skipped: recordings.filter((r) => r.status === 'skipped').length,
  } : null;

  const activeAgents = agents.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Auditorías Avaya</h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de grabaciones manuales Avaya — Claro TYT</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          disabled={!activeAgents}
          title={!activeAgents ? 'Registra agentes primero en "Mis Agentes Avaya"' : ''}
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Subir grabación
        </button>
      </div>

      {/* Status pills */}
      {counts && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Total: {counts.total}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendientes: {counts.selected}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">En revisión: {counts.in_review}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Completadas: {counts.completed}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">Omitidas: {counts.skipped}</span>
        </div>
      )}

      {/* Filters */}
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
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <button onClick={() => changeWeek(-1)}
            className="text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-700">{weekStart} — {weekEnd}</span>
          <button onClick={() => changeWeek(1)}
            className="text-sm text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button onClick={() => setWeekStart(getMonday())}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-1 transition-colors">
            Semana actual
          </button>
        </div>
      </div>

      {/* Audit table */}
      <AuditTable
        selections={filtered}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* Upload modal */}
      {showUpload && agents.length > 0 && (
        <UploadModal
          agents={agents}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); fetchData(); }}
        />
      )}
    </div>
  );
}
