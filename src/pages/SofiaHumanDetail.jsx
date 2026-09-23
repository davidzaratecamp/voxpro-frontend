import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { formatDuration, CLIENT_LABELS } from '../lib/utils';
import QualityScoreDisplay from '../components/QualityScoreDisplay';
import QualificationForm from '../components/QualificationForm';

const STATUS_OPTIONS = ['selected', 'in_review', 'completed', 'skipped'];
const STATUS_LABELS = {
  selected: 'Pendiente',
  in_review: 'En revisión',
  completed: 'Completada',
  skipped: 'Omitida',
};

export default function SofiaHumanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const loadSelection = () => {
    setLoading(true);
    sofiaHumanApi.getSelection(id)
      .then((res) => {
        const data = res.data.data;
        setSelection(data);
        setStatus(data.status);
        setStatusNotes(data.notes || '');
      })
      .catch((err) => console.error('Error loading selection:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSelection(); }, [id]);

  const handleSaveStatus = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await sofiaHumanApi.updateSelection(id, { status, notes: statusNotes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      await sofiaHumanApi.analyze(id);
      loadSelection();
    } catch (err) {
      const httpStatus = err.response?.status;
      const msg = httpStatus === 503 || httpStatus === 429
        ? err.response?.data?.message || 'El análisis automático no está disponible ahora mismo. Puedes calificar manualmente mientras tanto.'
        : err.response?.data?.message || 'Error al analizar la llamada';
      setAnalyzeError(msg);
      if (httpStatus === 503 || httpStatus === 429) setShowForm(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadAudio = async () => {
    setAudioLoading(true);
    try {
      const res = await sofiaHumanApi.getAudio(id);
      setAudioUrl(URL.createObjectURL(res.data));
    } catch (err) {
      console.error('Error loading audio:', err);
    } finally {
      setAudioLoading(false);
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
        <button onClick={() => navigate('/sofia-ia')} className="mt-4 text-blue-600 hover:underline text-sm">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/sofia-ia')} className="hover:text-slate-800 transition-colors">Sofia IA</button>
        <span>/</span>
        <span className="text-slate-800">#{id}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Llamada transferida por SOFIA</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Info label="Agente" value={selection.agente_nombre || selection.agente_id} />
          {selection.agente_nombre && <Info label="Cédula" value={selection.agente_id} />}
          <Info label="Campaña" value={CLIENT_LABELS[selection.client_code] || selection.client_code} />
          <Info label="Teléfono" value={selection.telefono || '—'} />
          <Info label="Duración" value={formatDuration(selection.duracion)} />
          <Info label="Fecha" value={selection.fecha} />
          <Info label="Hora" value={selection.hora || '—'} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          {!audioUrl ? (
            <button
              onClick={handleLoadAudio}
              disabled={audioLoading}
              className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {audioLoading ? 'Descargando audio...' : 'Escuchar grabación'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <audio ref={audioRef} controls src={audioUrl} className="flex-1 h-10" />
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Calificación de calidad</h3>
          <div className="flex items-center gap-2">
            {!analyzing && (selection.score == null || !showForm) && (
              <button
                onClick={() => setShowForm((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${showForm
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
              >
                {showForm ? 'Cancelar' : selection.score != null ? 'Editar calificación' : 'Calificar Manualmente'}
              </button>
            )}
            {selection.score == null && !showForm && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {analyzing ? 'Analizando...' : 'Auditar con IA'}
              </button>
            )}
          </div>
        </div>

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

        {!analyzing && !showForm && selection.score != null && (
          <QualityScoreDisplay
            score={selection.score}
            highImpactFailed={selection.high_impact_failed}
            notes={selection.notes}
            general={selection.criteria_general}
            highImpact={selection.criteria_high_impact}
            transcription={selection.transcription}
          />
        )}

        {!analyzing && showForm && (
          <QualificationForm
            loadTemplate={() => sofiaHumanApi.getCriteriaTemplate(selection.client_code).then((res) => res.data.data)}
            onSave={(payload) => sofiaHumanApi.saveScore(id, payload)}
            initialGeneral={selection.criteria_general}
            initialHighImpact={selection.criteria_high_impact}
            onSaved={() => { setShowForm(false); loadSelection(); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!analyzing && !showForm && selection.score == null && (
          <p className="text-sm text-slate-400 py-4 text-center">Esta llamada aún no ha sido calificada.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
          <textarea
            rows={3}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Observaciones sobre la llamada..."
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveStatus}
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar estado'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Guardado correctamente</span>}
        </div>
      </div>
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
