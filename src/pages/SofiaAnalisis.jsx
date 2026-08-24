import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import { sofiaHumanApi } from '../api/sofiaHuman';
import { useAuth } from '../context/AuthContext';
import { CLIENT_LABELS } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CLIENT_CODES = ['claro_hogar', 'claro_tyt'];
const CHART_FONT = { family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: 12 };
const BASE_TOOLTIP = { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10, cornerRadius: 6 };
const DIST_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#94a3b8', '#f97316', '#6366f1'];

function resolveUserClientCodes(user) {
  if (user?.role === 'gestor_usuarios') return CLIENT_CODES;
  return CLIENT_CODES.filter((c) => user?.client_codes?.includes(c));
}

function defaultDates() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function KpiCard({ label, value, sublabel, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${colors[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

const FUNNEL_OPTIONS = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: BASE_TOOLTIP },
  scales: {
    x: { beginAtZero: true, ticks: { font: CHART_FONT, precision: 0 }, grid: { color: '#f1f5f9' } },
    y: { ticks: { font: CHART_FONT } },
  },
};

function buildFunnelData(funnel) {
  return {
    labels: ['Transferencias', 'Contacto', 'Contacto efectivo', 'Venta'],
    datasets: [{
      data: [funnel.transferencias, funnel.contacto, funnel.contacto_efectivo, funnel.ventas],
      backgroundColor: ['#94a3b8', '#3b82f6', '#8b5cf6', '#10b981'],
      borderRadius: 6,
    }],
  };
}

const DOUGHNUT_OPTIONS = {
  cutout: '62%',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { font: { ...CHART_FONT, size: 11 }, boxWidth: 10, padding: 10 } },
    tooltip: BASE_TOOLTIP,
  },
};

function buildDistribucionData(distribucion) {
  return {
    labels: distribucion.map((d) => d.nomenclatura_nombre),
    datasets: [{
      data: distribucion.map((d) => d.total),
      backgroundColor: distribucion.map((_, i) => DIST_COLORS[i % DIST_COLORS.length]),
      borderWidth: 0,
    }],
  };
}

const TREND_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top', labels: { font: CHART_FONT, boxWidth: 12 } }, tooltip: BASE_TOOLTIP },
  scales: {
    y: { beginAtZero: true, ticks: { font: CHART_FONT, precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { ticks: { font: CHART_FONT }, grid: { display: false } },
  },
};

function buildTrendData(tendencia) {
  return {
    labels: tendencia.map((t) => t.fecha),
    datasets: [
      {
        label: 'Ventas',
        data: tendencia.map((t) => t.ventas),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: 'Contacto efectivo',
        data: tendencia.map((t) => t.contacto_efectivo),
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf6',
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };
}

export default function SofiaAnalisis() {
  const { user } = useAuth();
  const allowedClientCodes = resolveUserClientCodes(user);
  const initialDates = defaultDates();

  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [clientCode, setClientCode] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (clientCode) params.client_code = clientCode;
      const res = await sofiaHumanApi.getCommercialStats(params);
      setStats(res.data.data);
    } catch {
      setError('No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, clientCode]);

  useEffect(() => { load(); }, [load]);

  const funnel = stats?.funnel || { transferencias: 0, contacto: 0, contacto_efectivo: 0, ventas: 0 };
  const distribucion = stats?.distribucion || [];
  const ranking = stats?.ranking || [];
  const tendencia = stats?.tendencia || [];

  const pctContacto = funnel.transferencias > 0 ? Math.round((funnel.contacto_efectivo / funnel.transferencias) * 100) : 0;
  const pctConversion = funnel.transferencias > 0 ? Math.round((funnel.ventas / funnel.transferencias) * 100) : 0;

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const wb = new ExcelJS.Workbook();
      wb.creator = 'VoxPro';
      wb.created = new Date();

      const FILL = {
        darkBlue: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } },
        blue: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
        lightBlue: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
        alt: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
      };
      const BORDER_CELL = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      const applyTitle = (ws, text, span, row = 1) => {
        ws.mergeCells(`A${row}:${span}${row}`);
        const cell = ws.getCell(`A${row}`);
        cell.value = text;
        cell.fill = FILL.darkBlue;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14, name: 'Calibri' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(row).height = 38;
      };
      const applySubtitle = (ws, text, span, row) => {
        ws.mergeCells(`A${row}:${span}${row}`);
        const cell = ws.getCell(`A${row}`);
        cell.value = text;
        cell.font = { italic: true, color: { argb: 'FF64748B' }, size: 10, name: 'Calibri' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(row).height = 20;
      };
      const applySectionHeader = (ws, text, span, row) => {
        ws.mergeCells(`A${row}:${span}${row}`);
        const cell = ws.getCell(`A${row}`);
        cell.value = text;
        cell.fill = FILL.lightBlue;
        cell.font = { bold: true, color: { argb: 'FF1E3A8A' }, size: 10, name: 'Calibri' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(row).height = 22;
      };
      const applyHeaderRow = (ws, row, labels) => {
        labels.forEach((label, i) => {
          const cell = ws.getCell(row, i + 1);
          cell.value = label;
          cell.fill = FILL.blue;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = BORDER_CELL;
        });
      };
      const applyDataRow = (ws, row, values, alt = false) => {
        values.forEach((value, i) => {
          const cell = ws.getCell(row, i + 1);
          cell.value = value;
          if (alt) cell.fill = FILL.alt;
          cell.border = BORDER_CELL;
          cell.alignment = { vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 10 };
        });
      };

      const ws1 = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF2563EB' } } });
      ws1.columns = [{ width: 30 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
      applyTitle(ws1, 'VoxPro — Análisis Sofia (resultado comercial)', 'F', 1);
      applySubtitle(ws1, `${dateFrom} a ${dateTo}   ·   Exportado: ${today}`, 'F', 2);

      applySectionHeader(ws1, '  EMBUDO', 'F', 4);
      applyHeaderRow(ws1, 5, ['Etapa', 'Total']);
      const funnelRows = [
        ['Transferencias', funnel.transferencias],
        ['Contacto', funnel.contacto],
        ['Contacto efectivo', funnel.contacto_efectivo],
        ['Venta', funnel.ventas],
      ];
      funnelRows.forEach(([label, value], i) => applyDataRow(ws1, 6 + i, [label, value], i % 2 === 1));

      const distRow = 6 + funnelRows.length + 2;
      applySectionHeader(ws1, '  DISTRIBUCIÓN DE RESULTADOS', 'F', distRow);
      applyHeaderRow(ws1, distRow + 1, ['Resultado', 'Total']);
      distribucion.forEach((d, i) => applyDataRow(ws1, distRow + 2 + i, [d.nomenclatura_nombre, d.total], i % 2 === 1));

      const ws2 = wb.addWorksheet('Ranking agentes', { properties: { tabColor: { argb: 'FF10B981' } } });
      ws2.columns = [{ width: 30 }, { width: 16 }, { width: 12 }, { width: 18 }, { width: 10 }, { width: 16 }];
      applyTitle(ws2, 'Ranking de agentes', 'F', 1);
      applySubtitle(ws2, `${dateFrom} a ${dateTo}`, 'F', 2);
      applyHeaderRow(ws2, 4, ['Agente', 'Cédula', 'Transferencias', 'Contacto efectivo', 'Ventas', 'Score promedio']);
      ranking.forEach((r, i) => {
        applyDataRow(ws2, 5 + i, [
          r.agente_nombre || r.agente_id, r.agente_id, r.transferencias, r.contacto_efectivo, r.ventas, r.score_promedio ?? '—',
        ], i % 2 === 1);
      });

      const ws3 = wb.addWorksheet('Tendencia', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
      ws3.columns = [{ width: 16 }, { width: 16 }, { width: 18 }, { width: 12 }];
      applyTitle(ws3, 'Tendencia diaria', 'D', 1);
      applySubtitle(ws3, `${dateFrom} a ${dateTo}`, 'D', 2);
      applyHeaderRow(ws3, 4, ['Fecha', 'Transferencias', 'Contacto efectivo', 'Ventas']);
      tendencia.forEach((t, i) => applyDataRow(ws3, 5 + i, [t.fecha, t.transferencias, t.contacto_efectivo, t.ventas], i % 2 === 1));

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VoxPro_AnalisisSofia_${dateFrom}_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar Excel: ' + (err.message || 'desconocido'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis Sofia</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resultado comercial de las transferencias de SOFIA: contacto, venta y motivo de no-venta
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
          {allowedClientCodes.length > 1 && (
            <select value={clientCode} onChange={(e) => setClientCode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all">
              <option value="">Todas las campañas</option>
              {allowedClientCodes.map((c) => <option key={c} value={c}>{CLIENT_LABELS[c] || c}</option>)}
            </select>
          )}
          <button
            onClick={handleExcelExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? 'Exportando...' : 'Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Transferencias auditadas"
          value={loading ? '—' : funnel.transferencias.toLocaleString('es-CO')}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>}
        />
        <KpiCard
          label="Contacto efectivo"
          value={loading ? '—' : `${pctContacto}%`}
          color="violet"
          sublabel={loading ? '' : `${funnel.contacto_efectivo.toLocaleString('es-CO')} de ${funnel.transferencias.toLocaleString('es-CO')}`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>}
        />
        <KpiCard
          label="Conversión a venta"
          value={loading ? '—' : `${pctConversion}%`}
          color={pctConversion >= 15 ? 'emerald' : pctConversion >= 5 ? 'amber' : 'blue'}
          sublabel="De las transferencias totales"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" /></svg>}
        />
        <KpiCard
          label="Ventas"
          value={loading ? '—' : funnel.ventas.toLocaleString('es-CO')}
          color="emerald"
          sublabel="Útil Positivo (UP)"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Embudo + Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Embudo de transferencias</h2>
          <p className="text-xs text-slate-400 mb-4">De la transferencia de SOFIA hasta la venta</p>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
            ) : funnel.transferencias === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
            ) : (
              <Bar data={buildFunnelData(funnel)} options={FUNNEL_OPTIONS} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Distribución de resultados</h2>
          <p className="text-xs text-slate-400 mb-4">Tipificación de las llamadas del agente humano</p>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
            ) : distribucion.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
            ) : (
              <Doughnut data={buildDistribucionData(distribucion)} options={DOUGHNUT_OPTIONS} />
            )}
          </div>
        </div>
      </div>

      {/* Tendencia */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Tendencia diaria</h2>
        <p className="text-xs text-slate-400 mb-4">Ventas y contacto efectivo por día</p>
        <div className="h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
          ) : tendencia.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Aún no hay suficientes días para mostrar una tendencia</div>
          ) : (
            <Line data={buildTrendData(tendencia)} options={TREND_OPTIONS} />
          )}
        </div>
      </div>

      {/* Ranking de agentes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Ranking de agentes</h2>
          <p className="text-xs text-slate-400 mb-4">Ordenado por ventas</p>
        </div>
        {loading ? (
          <div className="text-sm text-slate-400 py-10 text-center">Cargando...</div>
        ) : ranking.length === 0 ? (
          <div className="text-sm text-slate-400 py-10 text-center">Sin datos</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Agente</th>
                <th className="px-4 py-3 text-right font-medium">Transferencias</th>
                <th className="px-4 py-3 text-right font-medium">Contacto efectivo</th>
                <th className="px-4 py-3 text-right font-medium">Ventas</th>
                <th className="px-4 py-3 text-right font-medium">% Conversión</th>
                <th className="px-4 py-3 text-right font-medium">Score promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranking.map((r) => (
                <tr key={r.agente_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{r.agente_nombre || r.agente_id}</span>
                    {r.agente_nombre && <span className="block text-xs text-slate-400">{r.agente_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.transferencias}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.contacto_efectivo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{r.ventas}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {r.transferencias > 0 ? `${Math.round((r.ventas / r.transferencias) * 100)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.score_promedio != null ? `${r.score_promedio}/100` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
