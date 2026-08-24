import { useState, useEffect, useCallback } from 'react';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';
import QualityScoreDisplay from '../components/QualityScoreDisplay';
import FeedbackPdfButton from '../components/FeedbackPdfButton';

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

function defaultDates() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function FeedbackDetailModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Feedback — {item.agente_nombre || item.agente_id}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Fecha de la llamada:</span> {item.fecha} {String(item.hora || '').slice(0, 8)}</div>
            <div><span className="text-slate-400">Teléfono:</span> {item.telefono}</div>
            <div><span className="text-slate-400">Duración:</span> {formatDuration(item.duracion)}</div>
            <div><span className="text-slate-400">Entregado:</span> {item.delivered_at ? new Date(item.delivered_at).toLocaleString('es-CO') : '—'}</div>
            {item.delivered_by_name && (
              <div className="col-span-2"><span className="text-slate-400">Entregado por:</span> {item.delivered_by_name}</div>
            )}
          </div>

          <div className="flex justify-end">
            <FeedbackPdfButton continuation={item} />
          </div>

          <QualityScoreDisplay
            score={item.score}
            highImpactFailed={item.high_impact_failed}
            notes={item.notes}
            general={item.criteria_general}
            highImpact={item.criteria_high_impact}
            transcription={item.transcription}
          />
        </div>
      </div>
    </div>
  );
}

export default function Feedback() {
  const { user } = useAuth();
  const isGestor = user?.role === 'gestor_usuarios';

  const initialDates = defaultDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [agentSearch, setAgentSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (agentSearch.trim()) params.agente = agentSearch.trim();
      const res = await sofiaHumanApi.getFeedback(params);
      setItems(res.data.data || []);
    } catch {
      setLoadError('No se pudo cargar el historial de feedback.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, agentSearch]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = items.filter((item) => {
    if (minScore !== '' && (item.score == null || item.score < Number(minScore))) return false;
    if (maxScore !== '' && (item.score == null || item.score > Number(maxScore))) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isGestor
            ? `Historial de feedback entregado por todos los coordinadores — ${filteredItems.length} en el rango seleccionado`
            : `Feedback que has entregado a tus agentes — ${filteredItems.length} en el rango seleccionado`}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <input
            type="text"
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
            placeholder="Buscar por agente..."
            className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Puntaje</span>
            <input
              type="number"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="mín"
              className="w-16 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <span className="text-slate-300">–</span>
            <input
              type="number"
              min="0"
              max="100"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="máx"
              className="w-16 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Entregado</th>
                <th className="px-4 py-3 text-left font-medium">Agente</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium">Fecha llamada</th>
                <th className="px-4 py-3 text-left font-medium">Puntaje</th>
                {isGestor && <th className="px-4 py-3 text-left font-medium">Entregado por</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={isGestor ? 6 : 5} className="px-4 py-10 text-center text-slate-400">
                    No hay feedback entregado en el rango seleccionado.
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {item.delivered_at ? new Date(item.delivered_at).toLocaleString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.agente_nombre || item.agente_id || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{item.telefono}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {item.fecha} {String(item.hora || '').slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(item.score)}`}>
                      {item.score}/100
                    </span>
                  </td>
                  {isGestor && <td className="px-4 py-3 text-slate-500 text-xs">{item.delivered_by_name || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <FeedbackDetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
