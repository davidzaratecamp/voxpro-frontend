import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatDuration, formatDate, CLIENT_LABELS } from '../lib/utils';

export default function AuditTable({ selections, statusFilter, onStatusFilter }) {
  const navigate = useNavigate();

  if (!selections) return null;

  const statuses = ['', 'selected', 'in_review', 'completed', 'skipped'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Selecciones de auditoría</h3>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          {statuses.slice(1).map((s) => (
            <option key={s} value={s}>
              {s === 'selected' ? 'Pendiente' : s === 'in_review' ? 'En revisión' : s === 'completed' ? 'Completada' : 'Omitida'}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Agente</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Duración</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selections.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No hay selecciones para esta semana
                </td>
              </tr>
            ) : (
              selections.map((sel) => (
                <tr
                  key={sel.id}
                  onClick={() => navigate(`/audit/${sel.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 text-slate-800 font-medium">{sel.agent_name || sel.agent_id}</td>
                  <td className="px-5 py-3 text-slate-600">{CLIENT_LABELS[sel.client_code] || sel.client_code}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDuration(sel.call_duration)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(sel.file_date)}</td>
                  <td className="px-5 py-3"><StatusBadge status={sel.status} /></td>
                  <td className="px-5 py-3 text-slate-600">{sel.score != null ? sel.score : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
