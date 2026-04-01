export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  let d;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    // ISO timestamp like "2026-02-09T05:00:00.000Z"
    d = new Date(dateStr);
  } else {
    // Plain date like "2026-02-09"
    d = new Date(dateStr + 'T00:00:00');
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatFileSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getMonday(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export const CLIENT_LABELS = {
  obama: 'Obama',
  lv: 'Vital Health',
  claro_tyt: 'Claro TYT',
  claro_hogar: 'Claro Hogar',
  claro_wcb: 'Claro WCB',
  reclutamiento: 'Reclutamiento',
};

export const CAMPAIGN_LABELS = {
  ventas: 'Ventas',
  customer: 'Customer',
};
