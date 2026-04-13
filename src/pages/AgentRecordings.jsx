import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatDuration, formatDate } from '../lib/utils';

function SourceBadge({ sourceType }) {
  if (sourceType === 'zoom') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14.5 7.5l-4 2.667V9.833L18.5 12.5zM3 8v10h14V8H3z" />
        </svg>
        Zoom
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      Aware
    </span>
  );
}

function RecordingRow({ rec, index, onAudit, selectingId, navigate }) {
  const completed = rec.selection_status === 'completed';
  const inProgress = rec.selection_id && !completed;
  const key = rec._realtime_call ? rec._realtime_call.registro_llamada_id : rec.id;

  return (
    <tr className={`transition-colors ${completed ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`}>
      <td className="px-4 py-2.5 text-slate-400 text-xs">{index + 1}</td>
      <td className="px-4 py-2.5 font-semibold text-slate-800">{formatDuration(rec.call_duration)}</td>
      <td className="px-4 py-2.5 text-slate-600 text-xs">{rec.call_phone || '—'}</td>
      {rec.source_type !== undefined && (
        <td className="px-4 py-2.5 flex items-center gap-1.5">
          <SourceBadge sourceType={rec.source_type} />
          {rec._from_search && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">búsqueda</span>
          )}
        </td>
      )}
      <td className="px-4 py-2.5 w-px whitespace-nowrap">
        {completed ? (
          <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors">
            Auditada
          </button>
        ) : inProgress ? (
          <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center gap-1 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-600 transition-colors">
            Continuar
          </button>
        ) : (
          <button onClick={() => onAudit(rec)} disabled={selectingId === key} className="inline-flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {selectingId === key ? (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Auditar'}
          </button>
        )}
      </td>
    </tr>
  );
}

function RecordingsTable({ title, recordings, color, onAudit, selectingId, navigate, phoneFilter }) {
  const filtered = phoneFilter.trim()
    ? recordings.filter((r) => (r.call_phone || '').includes(phoneFilter.trim()))
    : recordings;

  const showSourceCol = recordings.some((r) => r.source_type !== undefined);

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${color === 'zoom' ? 'border-blue-200' : 'border-slate-200'} overflow-hidden`}>
      <div className={`px-5 py-3 border-b ${color === 'zoom' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {color === 'zoom' ? (
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14.5 7.5l-4 2.667V9.833L18.5 12.5zM3 8v10h14V8H3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          <span className={`text-sm font-semibold ${color === 'zoom' ? 'text-blue-700' : 'text-slate-700'}`}>{title}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color === 'zoom' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
          {recordings.length} grabaciones
        </span>
      </div>
      {recordings.length === 0 ? (
        <p className="px-5 py-10 text-center text-slate-400 text-sm">Sin grabaciones este día</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Duración</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Teléfono</th>
                {showSourceCol && <th className="px-4 py-2.5" />}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showSourceCol ? 5 : 4} className="px-5 py-8 text-center text-slate-400">
                    No hay llamadas al número {phoneFilter}
                  </td>
                </tr>
              ) : (
                filtered.map((rec, i) => (
                  <RecordingRow
                    key={rec.id}
                    rec={rec}
                    index={i}
                    onAudit={onAudit}
                    selectingId={selectingId}
                    navigate={navigate}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AgentRecordings() {
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date');
  const agentName = searchParams.get('name');
  const source = searchParams.get('source');
  const isRealtime = source === 'realtime';
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState(null);
  const [zoomRecordings, setZoomRecordings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneResults, setPhoneResults] = useState(null);
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [phoneSourceTab, setPhoneSourceTab] = useState('aware');

  useEffect(() => {
    if (!agentId || !date) return;
    const endpoint = isRealtime
      ? client.get('/realtime/agent-calls', { params: { agent_id: agentId, date } })
      : client.get('/recordings/by-agent', { params: { agent_id: agentId, date } });
    endpoint
      .then((res) => {
        setRecordings(res.data.data || []);
        setZoomRecordings(res.data.zoom_data ?? null); // null = no split mode
      })
      .catch(() => { setRecordings([]); setZoomRecordings(null); })
      .finally(() => setLoading(false));
  }, [agentId, date, isRealtime]);

  const handleAudit = async (recording, fromSearch = false) => {
    const key = recording._realtime_call ? recording._realtime_call.registro_llamada_id : recording.id;
    setSelectingId(key);
    try {
      if (recording._realtime_call) {
        const res = await client.post('/realtime/select', { call: recording._realtime_call });
        navigate(`/audit/${res.data.data.selection_id}`);
      } else {
        const res = await client.post('/audit/select-one', { recording_id: recording.id });
        // Si viene de búsqueda, inyectarlo en la columna correcta
        if (fromSearch) {
          const enriched = { ...recording, selection_id: res.data.data.id, selection_status: 'selected', _from_search: true };
          if (recording.source_type === 'zoom') {
            setZoomRecordings((prev) => prev ? [enriched, ...prev.filter((r) => r.id !== recording.id)] : prev);
          } else {
            setRecordings((prev) => prev ? [enriched, ...prev.filter((r) => r.id !== recording.id)] : prev);
          }
        }
        navigate(`/audit/${res.data.data.id}`);
      }
    } catch (err) {
      console.error('Error selecting recording:', err);
    } finally {
      setSelectingId(null);
    }
  };

  const handlePhoneSearch = async () => {
    if (!phoneSearch.trim()) return;
    if (isRealtime) {
      const q = phoneSearch.trim();
      setPhoneResults((recordings || []).filter((r) => (r.call_phone || '').includes(q)));
      return;
    }
    setSearchingPhone(true);
    setPhoneResults(null);
    try {
      const params = { agent_id: agentId, date, phone: phoneSearch.trim() };
      if (isSplitMode && phoneSourceTab === 'zoom') params.source = 'zoom';
      const res = await client.get('/recordings/by-agent-phone', { params });
      setPhoneResults(res.data.data);
    } catch (err) {
      console.error('Error buscando por teléfono:', err);
      setPhoneResults([]);
    } finally {
      setSearchingPhone(false);
    }
  };

  const allRecordings = zoomRecordings !== null
    ? [...(recordings || []), ...(zoomRecordings || [])]
    : (recordings || []);

  const totalDuration = allRecordings.reduce((sum, r) => sum + (r.call_duration || 0), 0);
  const auditedCount = allRecordings.filter((r) => r.selection_status === 'completed').length;
  const avgDuration = allRecordings.length > 0 ? Math.round(totalDuration / allRecordings.length) : 0;
  const isSplitMode = zoomRecordings !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{agentName || agentId}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {date ? formatDate(date) : date} · {agentId}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stats banner */}
        {!loading && allRecordings.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Llamadas</p>
              <p className="text-3xl font-bold text-slate-800">{allRecordings.length}</p>
              {isSplitMode ? (
                <p className="text-xs text-slate-400 mt-1">
                  {recordings.length} Aware · {zoomRecordings.length} Zoom
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">grabaciones del día</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Tiempo total</p>
              <p className="text-3xl font-bold text-slate-800">{formatDuration(totalDuration)}</p>
              <p className="text-xs text-slate-400 mt-1">en llamadas</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Promedio</p>
              <p className="text-3xl font-bold text-slate-800">{formatDuration(avgDuration)}</p>
              <p className="text-xs text-slate-400 mt-1">por llamada</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Auditadas</p>
              <p className="text-3xl font-bold text-emerald-600">{auditedCount}</p>
              <p className="text-xs text-slate-400 mt-1">de {allRecordings.length} grabaciones</p>
            </div>
          </div>
        )}

        {/* Phone number search */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Buscar llamadas por número</p>
            {isSplitMode && (
              <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => { setPhoneSourceTab('aware'); setPhoneResults(null); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${phoneSourceTab === 'aware' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Aware
                </button>
                <button
                  onClick={() => { setPhoneSourceTab('zoom'); setPhoneResults(null); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${phoneSourceTab === 'zoom' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14.5 7.5l-4 2.667V9.833L18.5 12.5zM3 8v10h14V8H3z" />
                  </svg>
                  Zoom
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                placeholder="Ej: 3164666954"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
              <button
                onClick={handlePhoneSearch}
                disabled={searchingPhone || !phoneSearch.trim()}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {searchingPhone ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                )}
                Buscar
              </button>
            </div>

            {phoneResults !== null && (
              <div className="mt-3">
                {phoneResults.length === 0 ? (
                  <p className="text-sm text-slate-400">No se encontraron grabaciones al número {phoneSearch}</p>
                ) : (
                  <table className="w-full text-sm mt-1">
                    <tbody className="divide-y divide-slate-100">
                      {phoneResults.map((rec, i) => {
                        const completed = rec.selection_status === 'completed';
                        const inProgress = rec.selection_id && !completed;
                        return (
                          <tr key={rec.id} className={`transition-colors ${completed ? 'bg-emerald-50' : ''}`}>
                            <td className="py-2 pr-4 text-slate-400 text-xs w-6">{i + 1}</td>
                            <td className="py-2 pr-4 font-semibold text-slate-800">{formatDuration(rec.call_duration)}</td>
                            <td className="py-2 pr-4 text-slate-600">{rec.call_phone}</td>
                            <td className="py-2 pr-4"><SourceBadge sourceType={rec.source_type} /></td>
                            <td className="py-2 w-px whitespace-nowrap">
                              {completed ? (
                                <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors">Auditada</button>
                              ) : inProgress ? (
                                <button onClick={() => navigate(`/audit/${rec.selection_id}`)} className="inline-flex items-center gap-1.5 bg-amber-500 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-amber-600 transition-colors">Continuar</button>
                              ) : (
                                <button onClick={() => handleAudit(rec, true)} disabled={selectingId === rec.id} className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                  {selectingId === rec.id ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : 'Auditar'}
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

        {/* Recordings */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : isSplitMode ? (
          /* Split mode: Aware (left) | Zoom (right) */
          <div>
            {/* Phone filter for split mode */}
            <div className="mb-3">
              <div className="relative max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  placeholder="Filtrar por número..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {phoneFilter && (
                  <button onClick={() => setPhoneFilter('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <RecordingsTable
                title="Grabaciones Aware"
                recordings={recordings}
                color="aware"
                onAudit={handleAudit}
                selectingId={selectingId}
                navigate={navigate}
                phoneFilter={phoneFilter}
              />
              <RecordingsTable
                title="Grabaciones Zoom"
                recordings={zoomRecordings}
                color="zoom"
                onAudit={handleAudit}
                selectingId={selectingId}
                navigate={navigate}
                phoneFilter={phoneFilter}
              />
            </div>
          </div>
        ) : (
          /* Normal mode: single table */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {!recordings || recordings.length === 0 ? (
              <p className="px-5 py-16 text-center text-slate-400">No hay grabaciones disponibles para esta fecha</p>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="relative max-w-xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={phoneFilter}
                      onChange={(e) => setPhoneFilter(e.target.value)}
                      placeholder="Buscar por número..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    />
                    {phoneFilter && (
                      <button onClick={() => setPhoneFilter('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
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
                      {(phoneFilter.trim() ? recordings.filter((r) => (r.call_phone || '').includes(phoneFilter.trim())) : recordings).map((rec, i) => (
                        <RecordingRow
                          key={rec.id}
                          rec={rec}
                          index={i}
                          onAudit={handleAudit}
                          selectingId={selectingId}
                          navigate={navigate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                  {recordings.length} {recordings.length === 1 ? 'grabación' : 'grabaciones'}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
