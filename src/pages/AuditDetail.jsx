import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatDuration, formatDate, formatFileSize, CLIENT_LABELS, CAMPAIGN_LABELS } from '../lib/utils';

const STATUS_OPTIONS = ['selected', 'in_review', 'completed', 'skipped'];
const STATUS_LABELS = {
  selected: 'Pendiente',
  in_review: 'En revisión',
  completed: 'Completada',
  skipped: 'Omitida',
};

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor_calidad';
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [status, setStatus] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  // AI Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  // Audio player state
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  // Cleanup audio blob on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    client
      .get(`/audit/selections/${id}`)
      .then((res) => {
        const data = res.data.data;
        setSelection(data);
        setStatus(data.status);
        setScore(data.score != null ? String(data.score) : '');
        setNotes(data.notes || '');
      })
      .catch((err) => {
        console.error('Error loading selection:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Load existing analysis
  const fetchAnalysis = useCallback(() => {
    setAnalysisLoading(true);
    client
      .get(`/audit/selections/${id}/analysis`)
      .then((res) => setAnalysis(res.data.data))
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [id]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { status };
      if (score !== '') payload.score = Number(score);
      if (notes) payload.notes = notes;

      await client.patch(`/audit/selections/${id}`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadAudio = async () => {
    setAudioLoading(true);
    try {
      const res = await client.get(`/audit/selections/${id}/audio`, {
        responseType: 'blob',
        timeout: 60000,
      });
      const url = URL.createObjectURL(res.data);
      setAudioUrl(url);
    } catch (err) {
      console.error('Error loading audio:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const seekAudio = (seconds) => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(() => { });
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const res = await client.post(`/audit/selections/${id}/analyze`, {}, { timeout: 300000 });
      const data = res.data.data;
      setScore(String(data.score));
      setNotes(data.summary);
      setStatus('completed');
      fetchAnalysis();
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 409
        ? err.response?.data?.message || 'Hay un análisis en curso. Espere a que termine antes de iniciar otro.'
        : status === 429
          ? err.response?.data?.message || 'Límite de Gemini alcanzado. Espere 1-2 minutos e inténtelo de nuevo.'
          : err.response?.data?.message || 'Error al analizar la llamada';
      setAnalyzeError(msg);
      console.error('Error analyzing:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!window.confirm('¿Seguro que quieres re-auditar? Esto borrará el análisis actual y generará uno nuevo desde cero.')) return;
    setReanalyzing(true);
    setAnalyzeError('');
    try {
      const res = await client.post(`/audit/selections/${id}/reanalyze`, {}, { timeout: 300000 });
      const data = res.data.data;
      setScore(String(data.score));
      setNotes(data.summary);
      setStatus('completed');
      fetchAnalysis();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al re-analizar la llamada';
      setAnalyzeError(msg);
      console.error('Error reanalyzing:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Selección no encontrada</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline text-sm">
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/')} className="hover:text-slate-800 transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => navigate(-1)} className="hover:text-slate-800 transition-colors">
          Auditorías
        </button>
        <span>/</span>
        <span className="text-slate-800">#{id}</span>
      </nav>

      {/* Recording Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Información de la grabación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Info label="Agente" value={selection.agent_name || selection.agent_id} />
          <Info label="ID Agente" value={selection.agent_id} />
          <div>
            <p className="text-xs text-slate-500">Cliente</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm text-slate-800 font-medium">{CLIENT_LABELS[selection.client_code] || selection.client_code}</span>
              {selection.campaign_type && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${selection.campaign_type === 'customer'
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-cyan-50 text-cyan-700'
                  }`}>
                  {CAMPAIGN_LABELS[selection.campaign_type]}
                </span>
              )}
            </div>
          </div>
          <Info label="Teléfono" value={selection.call_phone || '—'} />
          <Info label="Duración" value={formatDuration(selection.call_duration)} />
          <Info label="Tamaño" value={formatFileSize(selection.file_size)} />
          <Info label="Fecha" value={formatDate(selection.file_date)} />
          <Info label="Archivo" value={selection.file_name} />
          <Info label="ID Llamada (Aware)" value={selection.call_id || '—'} />
          <Info label="Extensión" value={selection.agent_extension || '—'} />
          <HangupInfo hangupBy={selection.hangup_by} />
        </div>

        {/* Audio Player */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          {!audioUrl ? (
            <button
              onClick={handleLoadAudio}
              disabled={audioLoading}
              className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {audioLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Descargando audio...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Escuchar grabación
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <audio ref={audioRef} controls src={audioUrl} className="flex-1 h-10" />
              <button
                onClick={() => { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Cerrar reproductor"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Análisis con IA</h3>















          {(!analysis || !analysis.criteria) && !analysisLoading && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analizando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Auditar
                </>
              )}
            </button>
          )}
        </div>

        {analyzeError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{analyzeError}</span>
          </div>
        )}

        {(analyzing || reanalyzing) && (
          <div className="flex flex-col items-center py-8 text-slate-500 gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm">{reanalyzing ? 'Borrando análisis anterior y re-auditando con Gemini...' : 'Descargando audio y analizando con Gemini...'}</p>
            <p className="text-xs text-slate-400">Esto puede tomar 30-60 segundos</p>
          </div>
        )}

        {analysisLoading && !analyzing && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        )}

        {analysis && analysis.criteria && !analyzing && (
          <AnalysisResults analysis={analysis} selectionId={id} onScoreUpdate={(s) => setScore(String(s))} onSeek={audioUrl ? seekAudio : null} />
        )}

        {(!analysis || !analysis.criteria) && !analysisLoading && !analyzing && (
          <p className="text-sm text-slate-400 py-4 text-center">
            No se ha realizado análisis con IA para esta auditoría.
          </p>
        )}
      </div>

      {/* Manual Evaluation Form — hidden for supervisor unless it's their own audit */}
      {(!isSupervisor || selection?.auditor_id === user?.id) && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">Evaluación manual</h3>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Score */}
        <div>
          <label htmlFor="score" className="block text-sm font-medium text-slate-700 mb-2">
            Score (0-100)
          </label>
          <div className="flex items-center gap-4">
            <input
              id="score"
              type="range"
              min="0"
              max="100"
              value={score || 0}
              onChange={(e) => setScore(e.target.value)}
              className="flex-1 h-2 bg-slate-200 rounded-full accent-blue-600"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="—"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
            Notas
          </label>
          {isSupervisor ? (
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Observaciones sobre la llamada..."
            />
          ) : (
            <p className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 min-h-[96px] whitespace-pre-wrap">
              {notes || <span className="text-slate-400">Sin observaciones</span>}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-5 py-2 transition-colors"
          >
            Volver
          </button>
          {saved && (
            <span className="text-sm text-emerald-600">Guardado correctamente</span>
          )}
        </div>
      </div>}
    </div>
  );
}

function fmtTime(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TimestampBtn({ seconds, onSeek }) {
  if (seconds == null || !onSeek) return null;
  return (
    <button
      onClick={() => onSeek(seconds)}
      className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 text-xs font-mono hover:underline transition-colors"
      title={`Ir a ${fmtTime(seconds)}`}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
      {fmtTime(seconds)}
    </button>
  );
}

function recalcScore(general, highImpact) {
  const hasFail = highImpact.some((i) => !i.cumple);
  if (hasFail) return { score: 0, highImpactFailed: true };
  let applicable = 0, earned = 0;
  for (const item of general) {
    if (item.na) continue;
    applicable += item.weight;
    if (item.cumple) earned += item.weight;
  }
  return { score: applicable > 0 ? Math.round((earned / applicable) * 100) : 0, highImpactFailed: false };
}

function AnalysisResults({ analysis, selectionId, onScoreUpdate, onSeek }) {
  const { criteria, score: originalScore, originalScore: aiScore, summary, transcription, engine, analyzedAt, changes: initialChanges, callUnintelligible } = analysis;
  const [general, setGeneral] = useState(criteria?.general || []);
  const [highImpact, setHighImpact] = useState(criteria?.highImpact || []);
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [savedOverride, setSavedOverride] = useState(false);
  const [changes, setChanges] = useState(initialChanges || []);

  const { score, highImpactFailed } = dirty
    ? recalcScore(general, highImpact)
    : { score: originalScore, highImpactFailed: criteria?.highImpactFailed || false };

  const toggleHighImpact = (idx) => {
    setHighImpact((prev) => prev.map((item, i) => i === idx ? { ...item, cumple: !item.cumple } : item));
    setDirty(true);
  };

  const toggleGeneral = (idx) => {
    setGeneral((prev) => prev.map((item, i) => {
      if (i !== idx || item.na) return item;
      return { ...item, cumple: !item.cumple };
    }));
    setDirty(true);
  };

  const handleSaveOverride = async () => {
    setSavingOverride(true);
    const { score: newScore, highImpactFailed: newFail } = recalcScore(general, highImpact);
    try {
      await client.patch(`/audit/selections/${selectionId}/analysis`, {
        criteria: { general, highImpact, highImpactFailed: newFail },
        score: newScore,
      });
      setSavedOverride(true);
      setDirty(false);
      onScoreUpdate(newScore);
      // Recargar historial de cambios
      const res = await client.get(`/audit/selections/${selectionId}/analysis`);
      setChanges(res.data.data.changes || []);
      setTimeout(() => setSavedOverride(false), 2000);
    } catch (err) {
      console.error('Error saving override:', err);
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Score banner */}
      <div className={`rounded-lg p-4 ${highImpactFailed ? 'bg-red-50 border border-red-200' : score >= 80 ? 'bg-emerald-50 border border-emerald-200' : score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Puntaje {dirty ? '(editado)' : 'IA'}</p>
            <p className={`text-3xl font-bold ${highImpactFailed ? 'text-red-600' : score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {score}/100
            </p>
          </div>
          <div className="flex items-center gap-2">
            {callUnintelligible && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                Grabación ininteligible
              </span>
            )}
            {highImpactFailed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Falla de alto impacto
              </span>
            )}
            {dirty && (
              <button
                onClick={handleSaveOverride}
                disabled={savingOverride}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingOverride ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
            {savedOverride && (
              <span className="text-xs text-emerald-600">Guardado</span>
            )}
          </div>
        </div>
        {summary && <p className="text-sm text-slate-600 mt-2">{summary}</p>}
      </div>

      {/* High Impact Items */}
      {highImpact.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Items de Alto Impacto</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {highImpact.map((item, idx) => (
              <div
                key={item.key}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${item.cumple ? 'bg-emerald-50' : 'bg-red-50'
                  }`}
              >
                <button
                  onClick={() => toggleHighImpact(idx)}
                  className="mt-0.5 shrink-0 focus:outline-none"
                  title="Clic para cambiar"
                >
                  {item.cumple ? (
                    <svg className="w-4 h-4 text-emerald-500 hover:text-emerald-700 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500 hover:text-red-700 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={item.cumple ? 'text-emerald-800' : 'text-red-800 font-medium'}>
                      {item.label}
                    </span>
                    <TimestampBtn seconds={item.timestamp} onSeek={onSeek} />
                  </div>
                  {item.observacion && (
                    <p className={`text-xs mt-0.5 ${item.cumple ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.observacion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Criteria */}
      {general.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800">Criterios Generales</h4>
            <button
              onClick={() => setEditingGeneral(!editingGeneral)}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${editingGeneral
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {editingGeneral ? 'Editando' : 'Editar'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">Criterio</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 w-16">Peso</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 w-20">Resultado</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-slate-500 w-14">Audio</th>
                  <th className="text-left py-2 pl-3 text-xs font-medium text-slate-500">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {general.map((item, idx) => (
                  <tr key={item.key}>
                    <td className="py-2 pr-4 text-slate-700">{item.label}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{item.weight}%</td>
                    <td className="py-2 px-3 text-center">
                      {editingGeneral && !item.na ? (
                        <button
                          onClick={() => toggleGeneral(idx)}
                          className="focus:outline-none"
                        >
                          {item.cumple ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer ring-1 ring-emerald-300">Cumple</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer ring-1 ring-red-300">No</span>
                          )}
                        </button>
                      ) : item.na ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">N/A</span>
                      ) : item.cumple ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Cumple</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">No</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <TimestampBtn seconds={item.timestamp} onSeek={onSeek} />
                    </td>
                    <td className="py-2 pl-3 text-xs text-slate-500">{item.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transcription */}
      {transcription && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Transcripción</h4>
          <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              <HighlightedTranscription
                text={transcription}
                general={general}
                highImpact={highImpact}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Generado por {engine || 'IA'}{analyzedAt ? ` — ${new Date(analyzedAt).toLocaleString('es-CO')}` : ''}
          </p>
        </div>
      )}

      {/* Change History */}
      {changes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Historial de ediciones</h4>
          <div className="space-y-2">
            {changes.map((entry) => (
              <div key={entry.id} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">
                      {entry.user_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm font-medium text-amber-900">{entry.user_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-amber-700">
                    <span>
                      Score: {entry.score_before} → {entry.score_after}
                    </span>
                    <span>{new Date(entry.created_at).toLocaleString('es-CO')}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {(entry.changes || []).map((ch, ci) => (
                    <div key={ci} className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${ch.type === 'high_impact' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {ch.type === 'high_impact' ? 'Alto Impacto' : 'General'}
                      </span>
                      <span className="text-slate-700 font-medium">{ch.label}</span>
                      <span className="text-slate-400">:</span>
                      <span className={`line-through ${ch.from === 'Cumple' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {ch.from}
                      </span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <span className={`font-medium ${ch.to === 'Cumple' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {ch.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedTranscription({ text, general, highImpact }) {
  // Collect all non-empty citations from failed criteria
  const citations = [];
  for (const item of general) {
    if (!item.cumple && !item.na && item.cita) {
      citations.push({ text: item.cita, label: item.label });
    }
  }
  for (const item of highImpact) {
    if (!item.cumple && item.cita) {
      citations.push({ text: item.cita, label: item.label });
    }
  }

  if (citations.length === 0) {
    return <>{text}</>;
  }

  // Sort citations by length descending to match longer phrases first
  citations.sort((a, b) => b.text.length - a.text.length);

  // Build segments: find all citation occurrences and mark them
  const marks = [];
  for (const citation of citations) {
    const needle = citation.text.toLowerCase();
    const haystack = text.toLowerCase();
    let startIdx = 0;
    while (true) {
      const idx = haystack.indexOf(needle, startIdx);
      if (idx === -1) break;
      marks.push({ start: idx, end: idx + citation.text.length, label: citation.label });
      startIdx = idx + 1;
    }
  }

  if (marks.length === 0) {
    return <>{text}</>;
  }

  // Merge overlapping marks
  marks.sort((a, b) => a.start - b.start);
  const merged = [marks[0]];
  for (let i = 1; i < marks.length; i++) {
    const prev = merged[merged.length - 1];
    if (marks[i].start <= prev.end) {
      prev.end = Math.max(prev.end, marks[i].end);
      prev.label = prev.label + ', ' + marks[i].label;
    } else {
      merged.push({ ...marks[i] });
    }
  }

  // Build React elements
  const parts = [];
  let cursor = 0;
  for (const mark of merged) {
    if (mark.start > cursor) {
      parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, mark.start)}</span>);
    }
    parts.push(
      <span
        key={`h-${mark.start}`}
        className="bg-red-100 text-red-800 rounded px-0.5 relative group cursor-help"
        title={mark.label}
      >
        {text.slice(mark.start, mark.end)}
        <span className="invisible group-hover:visible absolute bottom-full left-0 mb-1 bg-red-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
          {mark.label}
        </span>
      </span>
    );
    cursor = mark.end;
  }
  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5 break-all">{value || '—'}</p>
    </div>
  );
}

function HangupInfo({ hangupBy }) {
  if (!hangupBy) {
    return (
      <div>
        <p className="text-xs text-slate-500">Colgó</p>
        <p className="text-sm text-slate-400 font-medium mt-0.5">—</p>
      </div>
    );
  }

  const isCaller = hangupBy === 'caller';
  return (
    <div>
      <p className="text-xs text-slate-500">Colgó</p>
      <span className={`inline-flex items-center gap-1 mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCaller
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
        }`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d={
            isCaller
              ? 'M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5a11.955 11.955 0 01-8.618-3.684A11.953 11.953 0 017.5 9.75c0-1.252.192-2.457.547-3.585a.75.75 0 00-.416-.898c-.38-.17-.82-.063-1.056.267A13.44 13.44 0 004.5 12c0 7.456 6.044 13.5 13.5 13.5a13.44 13.44 0 006.466-1.575c.33-.236.437-.676.267-1.056a.75.75 0 00-.898-.416A11.88 11.88 0 0119.5 23.25'
              : 'M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5a11.955 11.955 0 01-8.618-3.684A11.953 11.953 0 017.5 9.75c0-1.252.192-2.457.547-3.585a.75.75 0 00-.416-.898c-.38-.17-.82-.063-1.056.267A13.44 13.44 0 004.5 12c0 7.456 6.044 13.5 13.5 13.5a13.44 13.44 0 006.466-1.575c.33-.236.437-.676.267-1.056a.75.75 0 00-.898-.416A11.88 11.88 0 0119.5 23.25'
          } />
        </svg>
        {isCaller ? 'Cliente' : 'Agente'}
      </span>
    </div>
  );
}
