import { useState, useEffect } from 'react';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';

const CLIENT_CODES = ['claro_tyt', 'claro_hogar'];
const CLIENT_LABELS = { claro_tyt: 'Claro TyT', claro_hogar: 'Claro Hogar' };
const MAX_DAYS = 31; // mismo tope que el backend (EXPORT_MAX_DAYS)

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Semana pasada completa (lunes a domingo). */
function lastWeek() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) - 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: toIso(monday), to: toIso(sunday) };
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);
}

function allowedClientCodes(user) {
  if (user?.role === 'gestor_usuarios') return CLIENT_CODES;
  return CLIENT_CODES.filter((c) => user?.client_codes?.includes(c));
}

async function blobErrorMessage(err, fallback) {
  try {
    const text = await err.response.data.text();
    return JSON.parse(text).message || fallback;
  } catch {
    return fallback;
  }
}

export default function ExportarContinuidad() {
  const { user } = useAuth();
  const campaigns = allowedClientCodes(user);
  const initial = lastWeek();

  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [clientCode, setClientCode] = useState(campaigns.includes('claro_tyt') ? 'claro_tyt' : campaigns[0] || '');
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const days = dateFrom && dateTo ? daysBetween(dateFrom, dateTo) : null;
  const rangeError = !dateFrom || !dateTo
    ? 'Elige la fecha inicial y la final.'
    : days < 0
      ? 'La fecha inicial es posterior a la final.'
      : days >= MAX_DAYS
        ? `El rango máximo es de ${MAX_DAYS} días (un mes).`
        : null;

  useEffect(() => {
    setCount(null);
    setError(null);
    if (rangeError || !clientCode) return undefined;
    let alive = true;
    setCounting(true);
    const t = setTimeout(() => {
      sofiaHumanApi.countContinuationsExport({ date_from: dateFrom, date_to: dateTo, client_code: clientCode })
        .then((res) => alive && setCount(res.data.data.count))
        .catch(() => alive && setError('No se pudo consultar cuántas auditorías hay en el rango.'))
        .finally(() => alive && setCounting(false));
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [dateFrom, dateTo, clientCode, rangeError]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await sofiaHumanApi.exportContinuations({ date_from: dateFrom, date_to: dateTo, client_code: clientCode });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Continuidad_${CLIENT_LABELS[clientCode].replace(' ', '_')}_${dateFrom}_a_${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(await blobErrorMessage(err, 'No se pudo generar el Excel. Intenta de nuevo.'));
    } finally {
      setExporting(false);
    }
  };

  const inputCls = 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all';
  const canExport = !rangeError && clientCode && count > 0 && !exporting;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportar continuidad</h1>
        <p className="text-sm text-slate-500 mt-1">
          Excel con las llamadas que SOFIA transfirió a un asesor y que la IA auditó: agente, fecha, duración,
          tipificación del agente y transcripción Agente / Cliente.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Desde</span>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${inputCls} w-full mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Hasta</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${inputCls} w-full mt-1`} />
          </label>
          {campaigns.length > 1 && (
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Campaña</span>
              <select value={clientCode} onChange={(e) => setClientCode(e.target.value)} className={`${inputCls} w-full mt-1`}>
                {campaigns.map((c) => <option key={c} value={c}>{CLIENT_LABELS[c]}</option>)}
              </select>
            </label>
          )}
        </div>

        <p className="text-xs text-slate-400">Rango máximo: un mes ({MAX_DAYS} días).</p>

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
          {!clientCode ? (
            <span className="text-amber-700">Tu usuario no tiene asignada ninguna campaña de Claro.</span>
          ) : rangeError ? (
            <span className="text-amber-700">{rangeError}</span>
          ) : counting || count === null ? (
            <span className="text-slate-400">Contando auditorías del rango...</span>
          ) : count === 0 ? (
            <span className="text-slate-500">No hay auditorías con continuidad en este rango.</span>
          ) : (
            <span className="text-slate-700">
              <strong>{count.toLocaleString('es-CO')}</strong> auditorías de {CLIENT_LABELS[clientCode]} en {days + 1} {days === 0 ? 'día' : 'días'}.
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
          {exporting && <span className="text-xs text-slate-400">Un mes completo puede tardar alrededor de un minuto.</span>}
        </div>
      </div>
    </div>
  );
}
