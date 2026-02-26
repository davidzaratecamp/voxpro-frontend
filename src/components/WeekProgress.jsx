export default function WeekProgress({ totals }) {
  if (!totals) return null;

  const total = totals.total_selections ?? 0;
  const completed = (totals.completed ?? 0) + (totals.skipped ?? 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-700">Progreso semanal</p>
        <p className="text-sm text-slate-500">
          {completed} / {total} auditorías
        </p>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% completado</p>
    </div>
  );
}
