// Vista de solo lectura de un resultado de auditoría de calidad (score,
// alto impacto, criterios generales, transcripción con citas resaltadas).
// Compartido entre Sofia IA (SofiaHumanDetail.jsx) y la continuación humana
// dentro del modal de Auditoría IA (IAAuditorias.jsx) — misma estructura
// visual que usa "Auditorías" estándar.

export default function QualityScoreDisplay({ score, highImpactFailed, notes, general = [], highImpact = [], transcription }) {
  return (
    <div className="space-y-5">
      <div className={`rounded-lg p-4 ${highImpactFailed ? 'bg-red-50 border border-red-200' : score >= 80 ? 'bg-emerald-50 border border-emerald-200' : score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Puntaje</p>
            <p className={`text-3xl font-bold mt-0.5 ${highImpactFailed ? 'text-red-600' : score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {score}<span className="text-lg font-normal text-slate-400">/100</span>
            </p>
          </div>
          {highImpactFailed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              Falla de alto impacto
            </span>
          )}
        </div>
        {notes && <p className="text-sm text-slate-600 mt-2">{notes}</p>}
      </div>

      {highImpact.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Items de Alto Impacto</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {highImpact.map((item) => (
              <div key={item.key} className={`rounded-lg px-3 py-2 text-sm ${item.cumple ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <span className={item.cumple ? 'text-emerald-800' : 'text-red-800 font-medium'}>{item.label}</span>
                {item.observacion && (
                  <p className={`text-xs mt-0.5 ${item.cumple ? 'text-emerald-600' : 'text-red-600'}`}>{item.observacion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {general.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Criterios Generales</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">Criterio</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 w-16">Peso</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 w-20">Resultado</th>
                  <th className="text-left py-2 pl-3 text-xs font-medium text-slate-500">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {general.map((item) => (
                  <tr key={item.key}>
                    <td className="py-2 pr-4 text-slate-700">{item.label}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{item.weight}%</td>
                    <td className="py-2 px-3 text-center">
                      {item.na ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">N/A</span>
                      ) : item.cumple ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Cumple</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">No</span>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-xs text-slate-500">{item.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transcription && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Transcripción</h4>
          <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              <HighlightedTranscription text={transcription} general={general} highImpact={highImpact} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedTranscription({ text, general, highImpact }) {
  const citations = [];
  for (const item of general) {
    if (!item.cumple && !item.na && item.cita) citations.push({ text: item.cita, label: item.label });
  }
  for (const item of highImpact) {
    if (!item.cumple && item.cita) citations.push({ text: item.cita, label: item.label });
  }
  if (citations.length === 0) return <>{text}</>;

  citations.sort((a, b) => b.text.length - a.text.length);
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
  if (marks.length === 0) return <>{text}</>;

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

  const parts = [];
  let cursor = 0;
  for (const mark of merged) {
    if (mark.start > cursor) parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, mark.start)}</span>);
    parts.push(
      <span key={`h-${mark.start}`} className="bg-red-100 text-red-800 rounded px-0.5 relative group cursor-help" title={mark.label}>
        {text.slice(mark.start, mark.end)}
      </span>
    );
    cursor = mark.end;
  }
  if (cursor < text.length) parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}
