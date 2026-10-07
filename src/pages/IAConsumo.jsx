import { useState, useEffect, useCallback } from 'react';
import { iaConsumoApi } from '../api/iaConsumo';

const FLOW_LABELS = {
  bot_sofia: 'Auditoría del bot SOFIA',
  continuacion_sofia: 'Continuación SOFIA (asesor)',
  sofia_manual: 'Sofia IA (manual)',
  auditoria: 'Auditorías estándar / Santiago',
  asiste: 'Asiste',
  analisis_dia: 'Análisis del día',
};

const cop = (n) => (n == null ? '—' : `$${Math.round(n).toLocaleString('es-CO')}`);
const usd = (n) => (n == null ? '—' : `US$${n.toFixed(2)}`);

export default function IAConsumo() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    iaConsumoApi.getSummary()
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar el consumo'));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Consumo IA</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gasto de Gemini por campaña frente a su presupuesto. Hogar incluye WCB; TyT incluye Asiste.
          El costo se calcula con los tokens reales de cada análisis y los precios públicos de Google;
          la factura de Google puede diferir levemente.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.filter((g) => g.presupuesto).map((g) => <GroupCard key={g.group} g={g} onSaved={load} />)}
        </div>
      )}

      {data?.filter((g) => !g.presupuesto && g.analisis > 0).map((g) => (
        <p key={g.group} className="text-xs text-slate-500">
          {g.label}: {g.analisis} análisis, {usd(g.gastado_usd)} (sin presupuesto asignado).
        </p>
      ))}
    </div>
  );
}

function GroupCard({ g, onSaved }) {
  const p = g.presupuesto;
  const pct = g.porcentaje ?? 0;
  const enAlerta = pct >= p.alert_percent;
  const bar = pct >= 100 ? 'bg-red-600' : enAlerta ? 'bg-amber-500' : 'bg-emerald-500';
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{g.label}</h3>
          <p className="text-xs text-slate-500">Desde {String(p.start_date).slice(0, 10)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${g.clave_propia ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {g.clave_propia ? 'Clave propia' : 'Usando la clave general'}
        </span>
      </div>

      {enAlerta && (
        <div className={`text-sm rounded-lg px-3 py-2 ${pct >= 100 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          {pct >= 100 ? 'Presupuesto agotado.' : `Ya se consumió el ${pct}% del presupuesto.`}
        </div>
      )}

      <div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-slate-800">{cop(g.gastado_cop)}</span>
          <span className="text-slate-500">de {cop(p.budget_cop)}</span>
        </div>
        <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{pct}% · {usd(g.gastado_usd)}</span>
          <span>Restante {cop(g.restante_cop)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Análisis" value={g.analisis.toLocaleString('es-CO')} />
        <Stat label="Promedio diario" value={cop(g.promedio_dia_cop)} />
        <Stat label="Alcanza para" value={g.dias_restantes != null ? `~${g.dias_restantes} días` : '—'} />
      </div>

      {g.por_flujo.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {g.por_flujo.map((f) => (
              <tr key={f.flow}>
                <td className="py-1.5 text-slate-600">{FLOW_LABELS[f.flow] || f.flow}</td>
                <td className="py-1.5 text-right text-slate-500 tabular-nums">{f.analisis.toLocaleString('es-CO')}</td>
                <td className="py-1.5 text-right text-slate-800 tabular-nums">{cop(f.usd * p.cop_per_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing ? (
        <BudgetForm g={g} onDone={(saved) => { setEditing(false); if (saved) onSaved(); }} />
      ) : (
        <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Editar presupuesto</button>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function BudgetForm({ g, onDone }) {
  const p = g.presupuesto;
  const [form, setForm] = useState({
    budget_cop: p.budget_cop,
    start_date: String(p.start_date).slice(0, 10),
    cop_per_usd: p.cop_per_usd,
    alert_percent: p.alert_percent,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await iaConsumoApi.updateBudget(g.group, form);
      onDone(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-500">Presupuesto (COP)<input type="number" min="1" value={form.budget_cop} onChange={set('budget_cop')} className={INPUT} /></label>
        <label className="text-xs text-slate-500">Desde<input type="date" value={form.start_date} onChange={set('start_date')} className={INPUT} /></label>
        <label className="text-xs text-slate-500">Pesos por dólar<input type="number" min="1" value={form.cop_per_usd} onChange={set('cop_per_usd')} className={INPUT} /></label>
        <label className="text-xs text-slate-500">Alertar al (%)<input type="number" min="1" max="100" value={form.alert_percent} onChange={set('alert_percent')} className={INPUT} /></label>
      </div>
      <p className="text-xs text-slate-400">Al recargar, cambia la fecha "Desde" al día de la recarga para que el conteo empiece de nuevo.</p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button onClick={() => onDone(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600">Cancelar</button>
      </div>
    </div>
  );
}
