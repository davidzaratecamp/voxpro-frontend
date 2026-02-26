const STATUS_STYLES = {
  selected: 'bg-blue-50 text-blue-700',
  in_review: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  skipped: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  selected: 'Pendiente',
  in_review: 'En revisión',
  completed: 'Completada',
  skipped: 'Omitida',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
