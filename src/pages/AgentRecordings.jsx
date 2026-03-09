import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatDuration, formatDate } from '../lib/utils';

export default function AgentRecordings() {
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date');
  const agentName = searchParams.get('name');
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);

  useEffect(() => {
    if (!agentId || !date) return;
    client
      .get('/recordings/by-agent', { params: { agent_id: agentId, date } })
      .then((res) => setRecordings(res.data.data))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, [agentId, date]);

  const handleAudit = async (recording) => {
    setSelectingId(recording.id);
    try {
      const res = await client.post('/audit/select-one', { recording_id: recording.id });
      navigate(`/audit/${res.data.data.id}`);
    } catch (err) {
      console.error('Error selecting recording:', err);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{agentName || agentId}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Grabaciones del {date ? formatDate(date) : date} · {agentId}
          </p>
        </div>
      </div>

      {/* Recordings table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !recordings || recordings.length === 0 ? (
          <p className="px-5 py-16 text-center text-slate-400">No hay grabaciones disponibles para esta fecha</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Duración</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recordings.map((rec, i) => {
                    const completed = rec.selection_status === 'completed';
                    const inProgress = rec.selection_id && !completed;
                    return (
                    <tr key={rec.id} className={`transition-colors ${completed ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{formatDuration(rec.call_duration)}</td>
                      <td className="px-5 py-3 text-slate-600">{rec.call_phone || '—'}</td>
                      <td className="px-5 py-3 w-px whitespace-nowrap">
                        {completed ? (
                          <button
                            onClick={() => navigate(`/audit/${rec.selection_id}`)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors"
                          >
                            Ver auditoría
                          </button>
                        ) : inProgress ? (
                          <button
                            onClick={() => navigate(`/audit/${rec.selection_id}`)}
                            className="inline-flex items-center gap-1.5 bg-amber-500 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-amber-600 transition-colors"
                          >
                            Continuar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAudit(rec)}
                            disabled={selectingId === rec.id}
                            className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {selectingId === rec.id ? (
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : 'Auditar'}
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
              {recordings.length} {recordings.length === 1 ? 'grabación' : 'grabaciones'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
