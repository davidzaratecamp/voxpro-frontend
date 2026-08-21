import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';
import { formatDuration, CLIENT_LABELS } from '../lib/utils';

const CLIENT_CODES = ['claro_hogar', 'claro_tyt'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function resolveUserClientCodes(user) {
  if (user?.role === 'gestor_usuarios') return CLIENT_CODES;
  return CLIENT_CODES.filter((c) => user?.client_codes?.includes(c));
}

export default function SofiaHumanAuditorias() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allowedClientCodes = resolveUserClientCodes(user);

  const [date, setDate] = useState(todayStr());
  const [clientCode, setClientCode] = useState(allowedClientCodes[0] || '');
  const [calls, setCalls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState(null);

  const fetchCalls = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { date };
    if (clientCode) params.client_code = clientCode;
    sofiaHumanApi
      .getCallsForDay(params)
      .then((res) => setCalls(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar las llamadas'))
      .finally(() => setLoading(false));
  }, [date, clientCode]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleAuditar = async (call) => {
    setSelectingId(call.registro_llamada_id);
    try {
      const res = await sofiaHumanApi.selectOne(call.registro_llamada_id, call.proyecto_id);
      navigate(`/sofia-ia/${res.data.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al seleccionar la llamada');
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Sofia IA</h2>
        <p className="text-sm text-slate-500 mt-1">
          Llamadas de clientes que SOFIA transfirió a un agente humano — auditadas con la misma matriz de calidad de Claro Hogar/TyT.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {allowedClientCodes.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Campaña</label>
              <select
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {allowedClientCodes.map((c) => (
                  <option key={c} value={c}>{CLIENT_LABELS[c] || c}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 text-center py-6">{error}</p>
        ) : !calls?.length ? (
          <p className="text-sm text-slate-400 text-center py-6">No hay llamadas transferidas por SOFIA para ese día.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="py-2 text-left pr-4">Agente</th>
                <th className="py-2 text-left pr-4">Campaña</th>
                <th className="py-2 text-left pr-4">Teléfono</th>
                <th className="py-2 text-left pr-4">Hora</th>
                <th className="py-2 text-left pr-4">Duración</th>
                <th className="py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calls.map((call) => {
                const done = call.selection_status === 'completed';
                const inProg = call.selection_id && !done;
                return (
                  <tr key={call.registro_llamada_id} className={done ? 'bg-emerald-50' : ''}>
                    <td className="py-2 pr-4">
                      <span className="font-medium text-slate-800">{call.agente_nombre || call.agente_id}</span>
                      {call.agente_nombre && <span className="block text-xs text-slate-400">{call.agente_id}</span>}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 text-xs">{CLIENT_LABELS[call.client_code] || call.client_code}</td>
                    <td className="py-2 pr-4 text-slate-600">{call.telefono || '—'}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{call.hora || '—'}</td>
                    <td className="py-2 pr-4 font-medium text-slate-800">{formatDuration(call.duracion)}</td>
                    <td className="py-2 text-right">
                      {done ? (
                        <button onClick={() => navigate(`/sofia-ia/${call.selection_id}`)} className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors">Auditada</button>
                      ) : inProg ? (
                        <button onClick={() => navigate(`/sofia-ia/${call.selection_id}`)} className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors">Continuar</button>
                      ) : (
                        <button
                          onClick={() => handleAuditar(call)}
                          disabled={selectingId === call.registro_llamada_id}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
    </div>
  );
}
