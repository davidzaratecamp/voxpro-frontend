import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obamaVitalApi, OBAMA_VITAL_STATUS } from '../api/obamaVital';
import { formatDuration, formatDate } from '../lib/utils';
import QualityScoreDisplay from '../components/QualityScoreDisplay';
import QualificationForm from '../components/QualificationForm';

export default function ObamaVitalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const loadAudit = () => {
    setLoading(true);
    obamaVitalApi.getAudit(id)
      .then((res) => setAudit(res.data.data))
      .catch((err) => setLoadError(err.response?.data?.message || 'Error al cargar la auditoría'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAudit(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      await obamaVitalApi.analyze(id);
      loadAudit();
    } catch (err) {
      const httpStatus = err.response?.status;
      const unavailable = httpStatus === 503 || httpStatus === 429;
      setAnalyzeError(
        err.response?.data?.message ||
        (unavailable ? 'El análisis con IA no está disponible ahora mismo. Puedes calificar manualmente.' : 'Error al analizar la llamada'),
      );
      if (unavailable) setShowForm(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Acepta la precalificación de la IA tal cual y cierra la auditoría.
  const handleConfirm = async () => {
    setConfirming(true);
    setAnalyzeError('');
    try {
      await obamaVitalApi.saveScore(id, {
        criteria: { general: audit.criteria_general, highImpact: audit.criteria_high_impact },
        notes: audit.notes,
      });
      loadAudit();
    } catch (err) {
      setAnalyzeError(err.response?.data?.message || 'Error al confirmar la calificación');
    } finally {
      setConfirming(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await obamaVitalApi.updateAudit(id, { status: audit.status !== 'skipped' ? 'skipped' : audit.score != null ? 'in_review' : 'selected' });
      loadAudit();
    } finally {
      setSkipping(false);
    }
  };

  const handleLoadAudio = async () => {
    setAudioLoading(true);
    setAudioError('');
    try {
      const res = await obamaVitalApi.getAudio(id);
      setAudioUrl(URL.createObjectURL(res.data));
    } catch {
      setAudioError('No se pudo descargar la grabación.');
    } finally {
      setAudioLoading(false);
    }
  };

  if (loading && !audit) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{loadError || 'Auditoría no encontrada'}</p>
        <button onClick={() => navigate('/obama-vital')} className="mt-4 text-blue-600 hover:underline text-sm">Volver</button>
      </div>
    );
  }

  const status = OBAMA_VITAL_STATUS[audit.status];
  const hasScore = audit.score != null;
  const inReview = audit.status === 'in_review';
  const corrected = audit.status === 'completed' && audit.ai_score != null && audit.ai_score !== audit.score;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/obama-vital')} className="hover:text-slate-800 transition-colors">Obama Vital</button>
        <span>/</span>
        <span className="text-slate-800">#{id}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Llamada {audit.proyecto_nombre}</h3>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status?.style}`}>{status?.label}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Info label="Agente" value={audit.agente_nombre || audit.agente_id} />
          <Info label="Cédula" value={audit.agente_id} />
          <Info label="Campaña" value={audit.proyecto_nombre} />
          <Info label="Teléfono" value={audit.telefono} />
          <Info label="Fecha y hora" value={`${formatDate(audit.fecha)} ${audit.hora?.slice(0, 5) || ''}`} />
          <Info label="Duración" value={formatDuration(audit.duracion)} />
          <Info label="Auditor" value={audit.auditor_nombre} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          {!audioUrl ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLoadAudio}
                disabled={audioLoading}
                className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                {audioLoading ? 'Descargando audio...' : 'Escuchar grabación'}
              </button>
              {audioError && <span className="text-sm text-red-600">{audioError}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <audio controls src={audioUrl} className="flex-1 h-10 min-w-0" />
              <button
                onClick={() => { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Cerrar reproductor"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800">Calificación de calidad</h3>
          {!analyzing && !showForm && (
            <div className="flex flex-wrap items-center gap-2">
              {!hasScore && (
                <button
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Precalificar con IA
                </button>
              )}
              {inReview && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {confirming ? 'Confirmando...' : 'Confirmar calificación'}
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border bg-white text-slate-600 border-slate-300 hover:border-slate-400 transition-colors"
              >
                {inReview ? 'Corregir' : hasScore ? 'Editar calificación' : 'Calificar manualmente'}
              </button>
            </div>
          )}
        </div>

        {inReview && !showForm && !analyzing && (
          <div className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            Precalificada por IA. Escucha la llamada y confirma la calificación, o corrígela si no estás de acuerdo.
          </div>
        )}

        {corrected && !showForm && (
          <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            La IA propuso <span className="font-semibold">{audit.ai_score}/100</span> y el auditor la dejó en <span className="font-semibold">{audit.score}/100</span>.
          </div>
        )}

        {analyzeError && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">{analyzeError}</div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center py-8 text-slate-500 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm">Descargando audio y analizando con IA...</p>
            <p className="text-xs text-slate-400">Esto puede tomar 30-60 segundos</p>
          </div>
        )}

        {!analyzing && !showForm && hasScore && (
          <QualityScoreDisplay
            score={audit.score}
            highImpactFailed={audit.high_impact_failed}
            notes={audit.notes}
            general={audit.criteria_general || []}
            highImpact={audit.criteria_high_impact || []}
            transcription={audit.transcription}
          />
        )}

        {!analyzing && showForm && (
          <QualificationForm
            loadTemplate={() => obamaVitalApi.getCriteriaTemplate(audit.campaign).then((res) => res.data.data)}
            onSave={(payload) => obamaVitalApi.saveScore(id, payload)}
            initialGeneral={audit.criteria_general}
            initialHighImpact={audit.criteria_high_impact}
            initialNotes={audit.notes}
            saveLabel="Guardar y cerrar auditoría"
            onSaved={() => { setShowForm(false); loadAudit(); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!analyzing && !showForm && !hasScore && (
          <p className="text-sm text-slate-400 py-4 text-center">Esta llamada aún no ha sido calificada.</p>
        )}
      </div>

      {audit.status !== 'completed' && (
        <div className="flex justify-end">
          <button
            onClick={handleSkip}
            disabled={skipping}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            {audit.status === 'skipped' ? 'Reactivar auditoría' : 'Omitir esta llamada'}
          </button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5 break-all">{value || '—'}</p>
    </div>
  );
}
