import { useState, useEffect, useCallback } from 'react';
import { avayaApi } from '../api/avaya';
import { useAuth } from '../context/AuthContext';
import { CLIENT_LABELS } from '../lib/utils';

const ALLOWED_CLIENT_CODES = ['claro_tyt'];

function AgentModal({ agent, onClose, onSaved }) {
  const { user } = useAuth();
  const allowedCodes = (user?.client_codes || []).filter((c) => ALLOWED_CLIENT_CODES.includes(c));
  const isEdit = !!agent;
  const [form, setForm] = useState({
    nombre_completo: agent?.nombre_completo || '',
    cedula: agent?.cedula || '',
    client_code: agent?.client_code || allowedCodes[0] || 'claro_tyt',
    notas: agent?.notas || '',
    status: agent?.status || 'activo',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await avayaApi.updateAgent(agent.id, form);
      } else {
        await avayaApi.createAgent(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isEdit ? 'Editar agente' : 'Nuevo agente Avaya'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={(e) => set('nombre_completo', e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número de cédula</label>
            <input
              type="text"
              value={form.cedula}
              onChange={(e) => set('cedula', e.target.value.replace(/\D/g, ''))}
              required
              placeholder="Solo dígitos"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Campaña</label>
            <select
              value={form.client_code}
              onChange={(e) => set('client_code', e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {allowedCodes.map((code) => (
                <option key={code} value={code}>{CLIENT_LABELS[code] || code}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional)</label>
            <textarea
              value={form.notas}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar agente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AvayaAgentes() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | agent object
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('activo');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await avayaApi.getAgents();
      setAgents(res.data.data);
    } catch {
      setError('No se pudieron cargar los agentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = agents.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.nombre_completo.toLowerCase().includes(q) || a.cedula.includes(q);
    }
    return true;
  });

  const activeCount = agents.filter((a) => a.status === 'activo').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agentes Avaya</h2>
          <p className="text-sm text-slate-500 mt-1">{activeCount} agentes activos registrados</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo agente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
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
            placeholder="Buscar por nombre o cédula..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando agentes...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-400">
            <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            {agents.length === 0 ? 'No hay agentes registrados. Crea el primero.' : 'No hay resultados con los filtros aplicados.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Agente</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cédula</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Campaña</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{agent.nombre_completo}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{agent.cedula}</td>
                  <td className="px-5 py-3 text-slate-600">{CLIENT_LABELS[agent.client_code] || agent.client_code}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      agent.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {agent.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setModal(agent)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <AgentModal
          agent={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
