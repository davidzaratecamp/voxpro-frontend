import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { getMonday } from '../lib/utils';

function AgentBadge({ agent, onRemove }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      agent.active_this_week
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-slate-100 text-slate-500'
    }`}>
      {agent.agent_name || agent.agent_id}
      {agent.active_this_week && (
        <span className="text-emerald-500 font-semibold">·{agent.recording_count}</span>
      )}
      {onRemove && (
        <button
          onClick={() => onRemove(agent.agent_id)}
          className="ml-0.5 hover:text-red-500 transition-colors"
          title="Quitar agente"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

function CoordinatorCard({ coord, onRemoveAgent, onAddAgents, onDeactivate, saving }) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = coord.agents.filter((a) => a.active_this_week).length;
  const isInactive = !coord.active;

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${isInactive ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${isInactive ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
            {coord.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold ${isInactive ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{coord.name}</p>
              {isInactive && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-200">
                  Inactivo — pendiente eliminar
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {coord.agents.length} agentes asignados
              {activeCount > 0 && (
                <span className="ml-1 text-emerald-600">· {activeCount} activos esta semana</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3">
          {isInactive ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 leading-relaxed">
              <p className="font-semibold mb-1">Coordinador desactivado</p>
              <p>
                Para eliminar este usuario del sistema,{' '}
                <a
                  href={`https://10.255.255.11/?view=compose&to=hanny.poloche@asisteing.com&subject=${encodeURIComponent('Solicitud eliminación de usuario VoxPro')}&body=${encodeURIComponent(`Buen día Hanny,\n\nSolicito la eliminación del usuario "${coord.name}" de la plataforma VoxPro.\n\nGracias.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:text-red-900"
                >
                  envía un correo por Zimbra
                </a>{' '}
                a <span className="font-semibold">hanny.poloche@asisteing.com</span> indicando
                el nombre <span className="font-semibold">{coord.name}</span> y solicitando
                la eliminación de la cuenta.
              </p>
            </div>
          ) : (
            <>
              {coord.agents.length === 0 ? (
                <p className="text-sm text-slate-400 mb-3">Sin agentes asignados</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {coord.agents.map((agent) => (
                    <AgentBadge
                      key={agent.agent_id}
                      agent={agent}
                      onRemove={(id) => onRemoveAgent(coord.id, id)}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onAddAgents(coord)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Asignar agentes sin coordinador
                </button>
                <button
                  onClick={() => onDeactivate(coord)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                  Desactivar coordinador
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AssignModal({ coordinator, unassigned, onConfirm, onClose }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">
            Asignar agentes a {coordinator.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {unassigned.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay agentes sin coordinador esta semana
            </p>
          ) : (
            <div className="space-y-2">
              {unassigned.map((agent) => (
                <label
                  key={agent.agent_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(agent.agent_id)}
                    onChange={() => toggle(agent.agent_id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {agent.agent_name || agent.agent_id}
                    </p>
                    {agent.agent_name && (
                      <p className="text-xs text-slate-400">{agent.agent_id}</p>
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 font-medium flex-shrink-0">
                    {agent.recording_count} grabaciones
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Asignar {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HC() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(getMonday());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // coordinator id being saved
  const [assignTarget, setAssignTarget] = useState(null); // coordinator to assign to

  const load = useCallback(async (week) => {
    setLoading(true);
    try {
      const res = await client.get('/hc/overview', { params: { week_start: week } });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

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

  const patchCoordinator = async (coordId, newAgentIds) => {
    setSaving(coordId);
    try {
      await client.patch(`/hc/coordinator/${coordId}/agents`, { agent_ids: newAgentIds });
      await load(weekStart);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveAgent = (coordId, agentId) => {
    const coord = data.data.find((c) => c.id === coordId);
    if (!coord) return;
    const newIds = coord.agents
      .filter((a) => a.agent_id !== agentId)
      .map((a) => a.agent_id);
    patchCoordinator(coordId, newIds);
  };

  const handleDeactivate = async (coord) => {
    const agentCount = coord.agents.length;
    const msg = agentCount > 0
      ? `¿Desactivar a ${coord.name}? Sus ${agentCount} agentes quedarán sin coordinador.`
      : `¿Desactivar a ${coord.name}?`;
    if (!window.confirm(msg)) return;
    setSaving(coord.id);
    try {
      await client.delete(`/hc/coordinator/${coord.id}`);
      await load(weekStart);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al desactivar');
    } finally {
      setSaving(null);
    }
  };

  const handleAssignConfirm = async (selectedIds) => {
    if (!assignTarget || selectedIds.length === 0) return;
    const coord = data.data.find((c) => c.id === assignTarget.id);
    if (!coord) return;
    const currentIds = coord.agents.map((a) => a.agent_id);
    const newIds = [...new Set([...currentIds, ...selectedIds])];
    setAssignTarget(null);
    await patchCoordinator(assignTarget.id, newIds);
  };

  const activeCoords = data?.data.filter((c) => c.active) ?? [];
  const totalAssigned = activeCoords.reduce((sum, c) => sum + c.agents.length, 0);
  const totalUnassigned = data?.unassigned.length ?? 0;
  const totalActive = activeCoords.reduce(
    (sum, c) => sum + c.agents.filter((a) => a.active_this_week).length, 0
  );
  const totalInactive = (data?.data.length ?? 0) - activeCoords.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Head Count</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gestión de agentes por coordinador — {user?.client_codes?.join(', ')}
        </p>
      </div>

      {/* Semana y stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => changeWeek(-1)}
            className="text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-700">{weekStart} — {weekEnd}</span>
          <button
            onClick={() => changeWeek(1)}
            className="text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
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
        </div>

        {data && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {activeCoords.length} coordinadores activos
            </span>
            {totalInactive > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                {totalInactive} pendiente{totalInactive > 1 ? 's' : ''} eliminar
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {totalAssigned} agentes asignados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {totalActive} activos esta semana
            </span>
            {totalUnassigned > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {totalUnassigned} sin coordinador
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : !data ? (
        <p className="text-center text-sm text-slate-400 py-12">Error al cargar datos</p>
      ) : (
        <>
          {/* Coordinadores */}
          <div className="space-y-3">
            {data.data.map((coord) => (
              <CoordinatorCard
                key={coord.id}
                coord={coord}
                onRemoveAgent={handleRemoveAgent}
                onAddAgents={setAssignTarget}
                onDeactivate={handleDeactivate}
                saving={saving === coord.id}
              />
            ))}
          </div>

          {/* Agentes sin coordinador */}
          {data.unassigned.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-100 bg-amber-50">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-sm font-semibold text-amber-800">
                  Agentes sin coordinador — {data.unassigned.length} agentes con grabaciones esta semana
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {data.unassigned.map((agent) => (
                    <span
                      key={agent.agent_id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                    >
                      {agent.agent_name || agent.agent_id}
                      <span className="text-amber-500">·{agent.recording_count}</span>
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Expande un coordinador y usa "Asignar agentes sin coordinador" para asignarlos.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de asignación */}
      {assignTarget && (
        <AssignModal
          coordinator={assignTarget}
          unassigned={data?.unassigned || []}
          onConfirm={handleAssignConfirm}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
