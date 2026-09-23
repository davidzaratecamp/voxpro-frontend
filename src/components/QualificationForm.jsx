import { useState, useEffect } from 'react';

// Formulario editable de la matriz de calidad (alto impacto + generales con
// Cumple / No cumple / N/A). Compartido entre Sofia IA (SofiaHumanDetail) y
// Obama Vital (ObamaVitalDetail): cada módulo inyecta cómo cargar la plantilla
// en blanco (`loadTemplate` → { general, highImpact }) y cómo guardar (`onSave`).

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

export default function QualificationForm({ loadTemplate, onSave, initialGeneral, initialHighImpact, initialNotes = '', onSaved, onCancel, saveLabel = 'Guardar calificación' }) {
  const [general, setGeneral] = useState(initialGeneral || []);
  const [highImpact, setHighImpact] = useState(initialHighImpact || []);
  const [notes, setNotes] = useState(initialNotes || '');
  const [loading, setLoading] = useState(!initialGeneral);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (initialGeneral) return;
    setLoading(true);
    loadTemplate()
      .then((template) => {
        setGeneral(template.general);
        setHighImpact(template.highImpact);
      })
      .catch(() => setLoadError('No se pudieron cargar los criterios de evaluación.'))
      .finally(() => setLoading(false));
  }, [initialGeneral]); // eslint-disable-line react-hooks/exhaustive-deps

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
      await onSave({
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
          {saving ? 'Guardando...' : saveLabel}
        </button>
        <button onClick={onCancel} className="text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-5 py-2.5 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
