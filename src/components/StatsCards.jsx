const cards = [
  { key: 'pending', label: 'Pendientes', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'in_review', label: 'En revisión', color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'completed', label: 'Completadas', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'avg_score', label: 'Score promedio', color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export default function StatsCards({ totals }) {
  if (!totals) return null;

  const values = {
    pending: totals.pending_review ?? 0,
    in_review: totals.in_review ?? 0,
    completed: totals.completed ?? 0,
    avg_score: totals.avg_score != null ? Math.round(totals.avg_score) : '—',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.key} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.color}`}>
            {values[c.key]}{c.key === 'avg_score' && typeof values[c.key] === 'number' ? '%' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}
