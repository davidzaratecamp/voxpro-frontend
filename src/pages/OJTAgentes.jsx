import { useState, useEffect, useCallback } from 'react';
import { ojtApi } from '../api/ojt';
import { useAuth } from '../context/AuthContext';

const CLIENT_CODES = [
  { value: 'obama',       label: 'Obama' },
  { value: 'claro_tyt',   label: 'Claro TyT' },
  { value: 'claro_hogar', label: 'Claro Hogar' },
  { value: 'claro_wcb',   label: 'Claro WCB' },
  { value: 'lv',          label: 'Vital Health' },
];

const STATUS_LABELS = {
  activo:   { label: 'Activo',    cls: 'bg-green-100 text-green-700' },
  graduado: { label: 'Graduado',  cls: 'bg-blue-100 text-blue-700' },
  inactivo: { label: 'Inactivo',  cls: 'bg-slate-100 text-slate-500' },
};

const EMPTY_FORM = {
  nombre_completo: '',
  cedula: '',
  aware_source_id: '',
  client_code: '',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  notas: '',
};

// ─── Modal agregar / editar agente ───────────────────────────────────────────

function AgentModal({ agent, awareSources, allowedClientCodes, onClose, onSaved }) {
  const isEdit = !!agent;
  const [form, setForm] = useState(
    isEdit
      ? {
          nombre_completo: agent.nombre_completo,
          cedula: agent.cedula,
          aware_source_id: String(agent.aware_source_id),
          client_code: agent.client_code,
          fecha_ingreso: agent.fecha_ingreso?.slice(0, 10) || '',
          notas: agent.notas || '',
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        aware_source_id: Number(form.aware_source_id),
      };
      if (isEdit) {
        await ojtApi.updateAgent(agent.id, payload);
      } else {
        await ojtApi.createAgent(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Editar agente OJT' : 'Agregar agente OJT'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre completo */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
              <input
                type="text"
                required
                value={form.nombre_completo}
                onChange={(e) => setField('nombre_completo', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Ej: Juan Carlos Pérez López"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de cédula</label>
              <input
                type="text"
                required
                value={form.cedula}
                onChange={(e) => setField('cedula', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Ej: 1234567890"
              />
            </div>

            {/* Fecha ingreso */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de ingreso a OJT</label>
              <input
                type="date"
                required
                value={form.fecha_ingreso}
                onChange={(e) => setField('fecha_ingreso', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Aware Source */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Servidor Aware</label>
              <select
                required
                value={form.aware_source_id}
                onChange={(e) => setField('aware_source_id', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="">Seleccionar servidor...</option>
                {awareSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.folder_name} — {s.client_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cliente / Campaña */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Campaña</label>
              <select
                required
                value={form.client_code}
                onChange={(e) => setField('client_code', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="">Seleccionar campaña...</option>
                {CLIENT_CODES.filter((c) => allowedClientCodes.includes(c.value)).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notas <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                rows={3}
                value={form.notas}
                onChange={(e) => setField('notas', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                placeholder="Observaciones sobre el agente..."
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar agente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal confirmar graduación ───────────────────────────────────────────────

function GraduateModal({ agent, onClose, onConfirm }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm(agent.id, fecha);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Graduar agente</h2>
        <p className="text-sm text-slate-500 mb-4">
          <span className="font-medium text-slate-700">{agent.nombre_completo}</span> pasará a operación regular.
          Sus auditorías OJT quedarán archivadas en el historial.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de graduación</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Guardando...' : 'Confirmar graduación'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OJTAgentes() {
  const { user } = useAuth();
  const allowedClientCodes = user?.client_codes || [];
  const [agents, setAgents]           = useState([]);
  const [awareSources, setAwareSources] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);
  const [tab, setTab]                 = useState('activos'); // 'activos' | 'historial'
  const [modal, setModal]             = useState(null);      // null | 'create' | agent obj (edit) | { graduate: agent }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [agentsRes, sourcesRes] = await Promise.all([
        ojtApi.getAgents(),
        ojtApi.getAwareSources(),
      ]);
      setAgents(agentsRes.data.data);
      setAwareSources(sourcesRes.data.data);
    } catch {
      setLoadError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGraduate(agentId, fecha) {
    try {
      await ojtApi.graduateAgent(agentId, fecha);
      setModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al graduar agente');
    }
  }

  function handleSaved() {
    setModal(null);
    load();
  }

  const activos    = agents.filter((a) => a.status === 'activo');
  const historial  = agents.filter((a) => a.status !== 'activo');
  const displayed  = tab === 'activos' ? activos : historial;

  const clientLabel = (code) => CLIENT_CODES.find((c) => c.value === code)?.label || code;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Agentes OJT</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activos.length} agente{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''} en formación
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar agente
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'activos',   label: `En formación (${activos.length})` },
          { key: 'historial', label: `Historial (${historial.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando agentes...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Cédula</th>
                <th className="px-4 py-3 text-left font-medium">Campaña</th>
                <th className="px-4 py-3 text-left font-medium">Servidor Aware</th>
                <th className="px-4 py-3 text-left font-medium">Ingreso</th>
                {tab === 'historial' && (
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                )}
                {tab === 'historial' && (
                  <th className="px-4 py-3 text-left font-medium">Graduación</th>
                )}
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    {tab === 'activos'
                      ? 'No hay agentes activos en formación. Agrega el primero.'
                      : 'Sin agentes en el historial todavía.'}
                  </td>
                </tr>
              )}
              {displayed.map((a) => {
                const st = STATUS_LABELS[a.status] || { label: a.status, cls: 'bg-slate-100 text-slate-500' };
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.nombre_completo}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{a.cedula}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {clientLabel(a.client_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{a.aware_folder}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {a.fecha_ingreso?.slice(0, 10)}
                    </td>
                    {tab === 'historial' && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    )}
                    {tab === 'historial' && (
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {a.fecha_graduacion?.slice(0, 10) || '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setModal(a)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Editar
                        </button>
                        {a.status === 'activo' && (
                          <button
                            onClick={() => setModal({ graduate: a })}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            Graduar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {(modal === 'create' || (modal && !modal.graduate)) && (
        <AgentModal
          agent={modal === 'create' ? null : modal}
          awareSources={awareSources}
          allowedClientCodes={allowedClientCodes}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {modal?.graduate && (
        <GraduateModal
          agent={modal.graduate}
          onClose={() => setModal(null)}
          onConfirm={handleGraduate}
        />
      )}
    </div>
  );
}
