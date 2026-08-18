import { useState, useEffect, useCallback } from 'react';
import { voicebotApi } from '../api/voicebot';

const PROYECTOS = [
  { value: '', label: 'Todos los proyectos' },
  { value: '12', label: 'Claro Hogar' },
  { value: '13', label: 'Claro TyT' },
];

const HANGUP_LABELS = {
  call_transfer: { label: 'Transferida a asesor', cls: 'bg-emerald-100 text-emerald-700' },
  user_hangup:   { label: 'Colgó el cliente',      cls: 'bg-slate-100 text-slate-600' },
  agent_hangup:  { label: 'Colgó el bot',           cls: 'bg-slate-100 text-slate-600' },
  inactivity:    { label: 'Inactividad',            cls: 'bg-amber-100 text-amber-700' },
};

function hangupBadge(reason) {
  return HANGUP_LABELS[reason] || { label: reason || '—', cls: 'bg-slate-100 text-slate-500' };
}

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
  fromDate.setDate(fromDate.getDate() - 7);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

// ─── Modal de detalle ───────────────────────────────────────────────────────

function CallDetailModal({ callId, onClose }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [aiAudit, setAiAudit] = useState(undefined); // undefined = cargando, null = sin auditar

  useEffect(() => {
    setLoading(true);
    setError(null);
    voicebotApi.getCall(callId)
      .then((res) => setCall(res.data.data))
      .catch(() => setError('No se pudo cargar el detalle de la llamada.'))
      .finally(() => setLoading(false));

    setAiAudit(undefined);
    voicebotApi.getCallAudit(callId)
      .then((res) => setAiAudit(res.data.data))
      .catch(() => setAiAudit(null));

    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  const handleLoadAudio = async () => {
    setAudioLoading(true);
    setAudioError(null);
    try {
      const res = await voicebotApi.getAudio(callId);
      setAudioUrl(URL.createObjectURL(res.data));
    } catch {
      setAudioError('No se pudo cargar el audio de esta llamada.');
    } finally {
      setAudioLoading(false);
    }
  };

  const badge = call ? hangupBadge(call.hangup_reason) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Llamada IA</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {loading && <p className="text-sm text-slate-400 py-8 text-center">Cargando...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {call && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Fecha:</span> {call.fecha} {String(call.hora).slice(0, 8)}</div>
                <div><span className="text-slate-400">Teléfono:</span> {call.telefono}</div>
                <div><span className="text-slate-400">Proyecto:</span> {call.proyecto_name}</div>
                <div><span className="text-slate-400">Duración:</span> {formatDuration(call.duracion)}</div>
                <div><span className="text-slate-400">Servicio:</span> {call.tipo_servicio || '—'}</div>
                <div><span className="text-slate-400">Sentimiento:</span> {call.user_sentiment || '—'}</div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {call.call_summary && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Resumen de la IA</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{call.call_summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Auditoría de calidad IA</h3>
                {aiAudit === undefined ? (
                  <p className="text-xs text-slate-400">Cargando...</p>
                ) : aiAudit === null ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                    Aún no auditada — puede ser anterior a la activación de la auditoría automática, estar en cola, o el switch está desactivado.
                  </p>
                ) : (
                  <>
                  {aiAudit.missed_transfer && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Transferencia perdida</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          El cliente mostró intención de ser transferido, pero la llamada no terminó transferida.
                          {aiAudit.missed_transfer_reason && ` ${aiAudit.missed_transfer_reason}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Cumplimiento del prompt</p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${scoreBadge(aiAudit.score)}`}>
                        {aiAudit.score}/100
                      </span>
                      {aiAudit.summary && <p className="text-sm text-slate-700">{aiAudit.summary}</p>}
                      {aiAudit.strengths && (
                        <p className="text-xs text-emerald-700"><span className="font-semibold">Aciertos: </span>{aiAudit.strengths}</p>
                      )}
                      {aiAudit.issues && (
                        <p className="text-xs text-red-600"><span className="font-semibold">Fallas: </span>{aiAudit.issues}</p>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Coherencia del resumen para el agente humano</p>
                      {aiAudit.summary_score == null ? (
                        <p className="text-xs text-slate-400">No evaluado</p>
                      ) : (
                        <>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${scoreBadge(aiAudit.summary_score)}`}>
                            {aiAudit.summary_score}/100
                          </span>
                          {aiAudit.summary_issues ? (
                            <p className="text-xs text-red-600">{aiAudit.summary_issues}</p>
                          ) : (
                            <p className="text-xs text-emerald-700">El resumen es fiel a la conversación real.</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Audio</h3>
                {!audioUrl ? (
                  <button
                    onClick={handleLoadAudio}
                    disabled={audioLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {audioLoading ? 'Cargando audio...' : 'Reproducir'}
                  </button>
                ) : (
                  <audio controls src={audioUrl} className="w-full" />
                )}
                {audioError && <p className="text-xs text-red-500 mt-1">{audioError}</p>}
              </div>

              {call.transcript?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Transcripción</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto bg-slate-50 rounded-lg p-3">
                    {call.transcript.map((turn, i) => {
                      const isAgent = turn.role === 'agent';
                      return (
                        <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            isAgent ? 'bg-white border border-slate-200 text-slate-700' : 'bg-blue-600 text-white'
                          }`}>
                            <p className="text-[10px] uppercase font-semibold mb-0.5 opacity-60">
                              {isAgent ? 'IA' : 'Cliente'}
                            </p>
                            {turn.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SCORE_FILTERS = [
  { value: '',        label: 'Todos los puntajes' },
  { value: 'unaudited', label: 'Sin auditar' },
  { value: 'low',      label: 'Bajo (<60)' },
  { value: 'mid',      label: 'Medio (60-79)' },
  { value: 'high',     label: 'Alto (≥80)' },
];

function matchesScoreFilter(score, filter) {
  if (!filter) return true;
  if (filter === 'unaudited') return score == null;
  if (score == null) return false;
  if (filter === 'low') return score < 60;
  if (filter === 'mid') return score >= 60 && score < 80;
  if (filter === 'high') return score >= 80;
  return true;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function IAAuditorias() {
  const initialDates = defaultDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [proyecto, setProyecto] = useState('');
  const [onlyTransfer, setOnlyTransfer] = useState(false);
  const [missedTransferOnly, setMissedTransferOnly] = useState(false);
  const [phone, setPhone] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (proyecto) params.proyecto_id = proyecto;
      if (onlyTransfer) params.only_transfer = 'true';
      if (missedTransferOnly) params.missed_transfer = 'true';
      if (phone.trim()) params.phone = phone.trim();
      const res = await voicebotApi.getCalls(params);
      setCalls(res.data.data || []);
    } catch {
      setLoadError('No se pudieron cargar las llamadas.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, proyecto, onlyTransfer, missedTransferOnly, phone]);

  useEffect(() => { load(); }, [load]);

  const filteredCalls = calls.filter((c) => matchesScoreFilter(c.ai_score, scoreFilter));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auditoría IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Llamadas atendidas por el agente de IA de Claro — {filteredCalls.length} en el rango seleccionado
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
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {PROYECTOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Buscar por teléfono..."
            className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyTransfer}
              onChange={(e) => setOnlyTransfer(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
            />
            Solo transferidas
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={missedTransferOnly}
              onChange={(e) => setMissedTransferOnly(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-400"
            />
            Transferencia perdida
          </label>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {SCORE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando llamadas...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                <th className="px-4 py-3 text-left font-medium">Duración</th>
                <th className="px-4 py-3 text-left font-medium">Resultado</th>
                <th className="px-4 py-3 text-left font-medium">Puntaje</th>
                <th className="px-4 py-3 text-left font-medium">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No hay llamadas en el rango seleccionado.
                  </td>
                </tr>
              )}
              {filteredCalls.map((c) => {
                const badge = hangupBadge(c.hangup_reason);
                return (
                  <tr
                    key={c.call_id}
                    onClick={() => setSelectedCallId(c.call_id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {c.fecha} {String(c.hora).slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{c.telefono}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {c.proyecto_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDuration(c.duracion)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {c.missed_transfer && (
                          <span title="Transferencia perdida" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            ⚠
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.ai_score != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBadge(c.ai_score)}`}>
                          {c.ai_score}/100
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-md truncate">
                      {c.call_summary || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCallId && (
        <CallDetailModal callId={selectedCallId} onClose={() => setSelectedCallId(null)} />
      )}
    </div>
  );
}
