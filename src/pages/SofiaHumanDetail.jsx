import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { formatDuration, CLIENT_LABELS } from '../lib/utils';
import QualityScoreDisplay from '../components/QualityScoreDisplay';

const STATUS_OPTIONS = ['selected', 'in_review', 'completed', 'skipped'];
const STATUS_LABELS = {
  selected: 'Pendiente',
  in_review: 'En revisión',
  completed: 'Completada',
  skipped: 'Omitida',
};

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
            selectionId={id}
            clientCode={selection.client_code}
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

function QualificationForm({ selectionId, clientCode, initialGeneral, initialHighImpact, onSaved, onCancel }) {
  const [general, setGeneral] = useState(initialGeneral || []);
  const [highImpact, setHighImpact] = useState(initialHighImpact || []);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(!initialGeneral);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (initialGeneral) return;
    setLoading(true);
    sofiaHumanApi.getCriteriaTemplate(clientCode)
      .then((res) => {
        setGeneral(res.data.data.general);
        setHighImpact(res.data.data.highImpact);
      })
      .catch(() => setLoadError('No se pudieron cargar los criterios de evaluación.'))
      .finally(() => setLoading(false));
  }, [clientCode, initialGeneral]);

  const { score, highImpactFailed } = recalcScore(general, highImpact);

  const toggleHI = (idx) =>
    setHighImpact((prev) => prev.map((item, i) => i === idx ? { ...item, cumple: !item.cumple } : item));
  const setHIObs = (idx, value) =>
    setHighImpact((prev) => prev.map((item, i) => i === idx ? { ...item, observacion: value } : item));
  const setGeneralState = (idx, state) =>
    setGeneral((prev) => prev.map((item, i) => i !== idx ? item : { ...item, cumple: state === 'cumple', na: state === 'na' }));
  const setGeneralObs = (idx, value) =>
    setGeneral((prev) => prev.map((item, i) => i === idx ? { ...item, observacion: value } : item));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const { highImpactFailed: finalHIF } = recalcScore(general, highImpact);
    try {
      await sofiaHumanApi.saveScore(selectionId, {
        criteria: { general, highImpact, highImpactFailed: finalHIF },
        notes,
      });
      onSaved();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar la calificación.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-3">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-4 ${highImpactFailed ? 'bg-red-50 border border-red-200' : score >= 80 ? 'bg-emerald-50 border border-emerald-200' : score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Puntaje calculado</p>
            <p className={`text-4xl font-bold mt-0.5 ${highImpactFailed ? 'text-red-600' : score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {score}<span className="text-xl font-normal text-slate-400">/100</span>
            </p>
          </div>
          {highImpactFailed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              Falla de alto impacto — Score 0
            </span>
          )}
        </div>
      </div>

      {highImpact.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Items de Alto Impacto</h4>
          <p className="text-xs text-slate-400 mb-3">Si cualquiera no cumple, el puntaje final es 0.</p>
          <div className="space-y-2">
            {highImpact.map((item, idx) => (
              <div key={item.key} className={`rounded-lg border p-3 transition-colors ${item.cumple ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-medium flex-1 ${item.cumple ? 'text-emerald-800' : 'text-red-800'}`}>{item.label}</span>
                  <div className="flex shrink-0">
                    <button
                      onClick={() => !item.cumple && toggleHI(idx)}
                      className={`px-3 py-1 rounded-l-md text-xs font-medium border-y border-l transition-colors ${item.cumple ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'}`}
                    >Cumple</button>
                    <button
                      onClick={() => item.cumple && toggleHI(idx)}
                      className={`px-3 py-1 rounded-r-md text-xs font-medium border-y border-r transition-colors ${!item.cumple ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-300 hover:bg-red-50 hover:border-red-300'}`}
                    >No cumple</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={item.observacion || ''}
                  onChange={(e) => setHIObs(idx, e.target.value)}
                  placeholder="Observación (opcional)..."
                  className={`mt-2 w-full text-xs rounded px-2 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 border ${item.cumple ? 'border-emerald-200 bg-white' : 'border-red-200 bg-white'}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {general.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Criterios Generales</h4>
          <p className="text-xs text-slate-400 mb-3">Marcar N/A excluye el ítem del cálculo del puntaje.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Criterio</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 w-16">Peso</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-600 w-52">Estado</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Observación</th>
                </tr>
              </thead>
              <tbody>
                {general.map((item, idx) => {
                  const state = item.na ? 'na' : item.cumple ? 'cumple' : 'no_cumple';
                  return (
                    <tr key={item.key} className={`border-b border-slate-100 last:border-0 ${state === 'no_cumple' ? 'bg-red-50/40' : state === 'na' ? 'bg-slate-50/60' : ''}`}>
                      <td className="py-3 px-4 text-slate-700 font-medium text-sm">{item.label}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold ${state === 'na' ? 'text-slate-400' : 'text-slate-600'}`}>{item.weight}%</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setGeneralState(idx, 'cumple')} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${state === 'cumple' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'}`}>Cumple</button>
                          <button onClick={() => setGeneralState(idx, 'no_cumple')} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${state === 'no_cumple' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-red-50 hover:border-red-300'}`}>No cumple</button>
                          <button onClick={() => setGeneralState(idx, 'na')} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${state === 'na' ? 'bg-slate-400 text-white border-slate-400' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100 hover:border-slate-400'}`}>N/A</button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={item.observacion || ''}
                          onChange={(e) => setGeneralObs(idx, e.target.value)}
                          placeholder="Observación..."
                          className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones generales</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Resumen de la evaluación de la llamada..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {saveError && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">{saveError}</div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-amber-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar calificación'}
        </button>
        <button onClick={onCancel} className="text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-5 py-2.5 transition-colors">
          Cancelar
        </button>
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
