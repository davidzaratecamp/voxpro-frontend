import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Bar, Doughnut } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CLIENT_LABELS } from '../lib/utils';
import { useBrand } from '../lib/brand';

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

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_COLORS = {
  obama: { border: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  lv: { border: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  claro_tyt: { border: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  claro_hogar: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  claro_wcb: { border: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
};

const PERIOD_OPTIONS = [
  { value: '4w', label: 'Últimas 4 semanas' },
  { value: '1m', label: 'Último mes' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'custom', label: 'Personalizado' },
];

const CHART_FONT = { family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: 12 };

// ─── Chart data builders ───────────────────────────────────────────────────────

function buildWeeklyVolumeChartData(rows) {
  if (!rows || rows.length === 0) return { labels: [], datasets: [] };

  // Aggregate all clients per week
  const weekMap = {};
  for (const r of rows) {
    if (!weekMap[r.week_start]) weekMap[r.week_start] = { totalCount: 0, totalScore: 0, countWithScore: 0 };
    weekMap[r.week_start].totalCount += r.count;
    if (r.avg_score > 0) {
      weekMap[r.week_start].totalScore += r.avg_score * r.count;
      weekMap[r.week_start].countWithScore += r.count;
    }
  }

  const weeks = Object.keys(weekMap).sort();
  const labels = weeks.map((w) => {
    const d = new Date(w + 'T00:00:00');
    return `Sem ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Auditorías',
        data: weeks.map((w) => weekMap[w].totalCount),
        backgroundColor: 'rgba(59,130,246,0.5)',
        borderRadius: 4,
        yAxisID: 'yCount',
        order: 2,
      },
      {
        type: 'line',
        label: 'Score promedio',
        data: weeks.map((w) => {
          const { totalScore, countWithScore } = weekMap[w];
          return countWithScore > 0 ? Math.round(totalScore / countWithScore) : null;
        }),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'yScore',
        spanGaps: true,
        order: 1,
      },
    ],
  };
}

function buildByAuditorChartData(rows) {
  if (!rows || rows.length === 0) return { labels: [], datasets: [] };

  const sorted = [...rows].sort((a, b) => b.avg_score - a.avg_score);
  return {
    labels: sorted.map((r) => r.auditor_name || `Auditor ${r.auditor_id}`),
    datasets: [
      {
        label: 'Score Promedio',
        data: sorted.map((r) => r.avg_score),
        backgroundColor: sorted.map((r) => r.avg_score >= 80 ? '#10b981' : r.avg_score >= 60 ? '#f59e0b' : '#ef4444'),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
}

function buildFailingChartData(rows) {
  if (!rows || rows.length === 0) return { labels: [], datasets: [] };

  const colors = rows.map((_, i) => {
    if (i === 0) return '#ef4444';
    if (i <= 2) return '#f59e0b';
    return '#94a3b8';
  });

  return {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: 'Fallas',
        data: rows.map((r) => r.failures),
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
}

function buildStatusChartData(rows) {
  if (!rows || rows.length === 0) return { labels: [], datasets: [] };

  const COLOR_MAP = {
    selected: '#f59e0b',
    in_review: '#3b82f6',
    completed: '#10b981',
    skipped: '#94a3b8',
  };

  const LABEL_MAP = {
    selected: 'Seleccionado',
    in_review: 'En revisión',
    completed: 'Completado',
    skipped: 'Omitido',
  };

  return {
    labels: rows.map((r) => LABEL_MAP[r.status] || r.status),
    datasets: [
      {
        data: rows.map((r) => r.count),
        backgroundColor: rows.map((r) => COLOR_MAP[r.status] || '#94a3b8'),
        borderWidth: 0,
      },
    ],
  };
}

// ─── Chart options ─────────────────────────────────────────────────────────────

const BASE_TOOLTIP = {
  backgroundColor: '#1e293b',
  titleColor: '#f8fafc',
  bodyColor: '#cbd5e1',
  padding: 10,
  cornerRadius: 6,
};

const COMBO_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { font: CHART_FONT, boxWidth: 12 } },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    yCount: {
      type: 'linear',
      position: 'left',
      min: 0,
      ticks: { font: CHART_FONT, precision: 0 },
      grid: { color: '#f1f5f9' },
      title: { display: true, text: 'Auditorías', font: { ...CHART_FONT, size: 11 }, color: '#94a3b8' },
    },
    yScore: {
      type: 'linear',
      position: 'right',
      min: 0,
      max: 100,
      ticks: { callback: (v) => v + '%', font: CHART_FONT },
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Score', font: { ...CHART_FONT, size: 11 }, color: '#94a3b8' },
    },
    x: { ticks: { font: CHART_FONT }, grid: { display: false } },
  },
};

const H_BAR_OPTIONS = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    x: { min: 0, max: 100, ticks: { font: CHART_FONT }, grid: { color: '#f1f5f9' } },
    y: { ticks: { font: CHART_FONT } },
  },
};

const FAILING_BAR_OPTIONS = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: BASE_TOOLTIP,
  },
  scales: {
    x: { min: 0, ticks: { font: CHART_FONT }, grid: { color: '#f1f5f9' } },
    y: { ticks: { font: CHART_FONT, size: 11 } },
  },
};

const DOUGHNUT_OPTIONS = {
  cutout: '70%',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { font: CHART_FONT, boxWidth: 12 } },
    tooltip: BASE_TOOLTIP,
  },
};

// ─── KpiCard sub-component ─────────────────────────────────────────────────────

function KpiCard({ label, value, color = 'blue', sublabel, icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Arrow icons ───────────────────────────────────────────────────────────────

function ArrowUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block">
      <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block">
      <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Reportes() {
  const { user } = useAuth();
  const brand = useBrand();
  const appName = brand?.appName ?? 'VoxPro';

  // Filter state
  const [period, setPeriod] = useState('4w');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Data state
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState([]);
  const [byAuditor, setByAuditor] = useState([]);
  const [failing, setFailing] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [ranking, setRanking] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState(null);

  const reportRef = useRef(null);

  const buildParams = useCallback(() => {
    const params = { period };
    if (period === 'custom') {
      params.date_from = customFrom;
      params.date_to = customTo;
    }
    if (clientFilter) params.client = clientFilter;
    return params;
  }, [period, customFrom, customTo, clientFilter]);

  const fetchAll = useCallback(async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return;

    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const trendParams = { ...params };

      const [kpisRes, trendRes, byAuditorRes, failingRes, statusRes, rankingRes] = await Promise.all([
        client.get('/reports/kpis', { params }),
        client.get('/reports/weekly-trend', { params: trendParams }),
        client.get('/reports/score-by-auditor', { params }),
        client.get('/reports/failing-criteria', { params }),
        client.get('/reports/status-distribution', { params }),
        client.get('/reports/agent-ranking', { params }),
      ]);

      setKpis(kpisRes.data.data);
      setTrend(trendRes.data.data);
      setByAuditor(byAuditorRes.data.data);
      setFailing(failingRes.data.data);
      setStatusDist(statusRes.data.data);
      setRanking(rankingRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, [buildParams, period, customFrom, customTo]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Excel export ────────────────────────────────────────────────────────────

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const params = buildParams();
      const res = await client.get('/reports/export-data', { params });
      const { kpis: k, ranking: agents, failingCriteria: f, statusDist: s } = res.data.data;

      const wb = new ExcelJS.Workbook();
      wb.creator = appName;
      wb.created = new Date();

      // ── Shared style helpers ─────────────────────────────────────────────────
      const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label || period;
      const today = new Date().toISOString().slice(0, 10);

      const FILL = {
        darkBlue:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } },
        blue:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
        lightBlue: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
        alt:       { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        redLight:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
        amberLight:{ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
        greenLight:{ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
      };

      const BORDER_CELL = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      const applyHeader = (cell, text) => {
        cell.value = text;
        cell.fill = FILL.blue;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        cell.border = BORDER_CELL;
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

      const applyDataCell = (cell, alt = false) => {
        if (alt) cell.fill = FILL.alt;
        cell.border = BORDER_CELL;
        cell.alignment = { vertical: 'middle' };
        if (!cell.font) cell.font = { name: 'Calibri', size: 10 };
        else cell.font = { ...cell.font, name: 'Calibri', size: 10 };
      };

      const STATUS_NAMES = {
        selected: 'Seleccionado',
        in_review: 'En revisión',
        completed: 'Completado',
        skipped: 'Omitido',
      };

      // ── SHEET 1: Resumen ──────────────────────────────────────────────────────
      const ws1 = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF2563EB' } } });
      ws1.columns = [
        { width: 36 },
        { width: 18 },
        { width: 14 },
      ];

      applyTitle(ws1, `${appName} — Reporte de Calidad`, 'C', 1);
      applySubtitle(ws1, `Período: ${periodLabel}   ·   Exportado: ${today}`, 'C', 2);
      ws1.addRow([]); // row 3 spacer

      // KPIs section
      applySectionHeader(ws1, '  INDICADORES CLAVE', 'C', 4);
      ws1.getRow(5).height = 22;
      ['A5', 'B5'].forEach((addr, i) => applyHeader(ws1.getCell(addr), ['Métrica', 'Valor'][i]));
      ws1.getCell('C5').fill = FILL.blue; ws1.getCell('C5').border = BORDER_CELL; // filler

      const kpiRows = [
        ['Auditorías completadas', k.total_completed],
        ['Score promedio', k.avg_score != null ? k.avg_score + '%' : '—'],
        ['Agentes en riesgo (score < 60)', k.agents_at_risk],
        ['Fallas de alto impacto', k.high_impact_failures],
      ];
      kpiRows.forEach(([label, value], i) => {
        const rowIdx = 6 + i;
        const alt = i % 2 === 1;
        ws1.getCell(`A${rowIdx}`).value = label;
        ws1.getCell(`B${rowIdx}`).value = value;
        ['A', 'B', 'C'].forEach((col) => applyDataCell(ws1.getCell(`${col}${rowIdx}`), alt));
        ws1.getRow(rowIdx).height = 20;
      });

      ws1.addRow([]); // row 10 spacer

      // Status distribution section
      applySectionHeader(ws1, '  DISTRIBUCIÓN POR ESTADO', 'C', 11);
      ws1.getRow(12).height = 22;
      ['A12', 'B12', 'C12'].forEach((addr, i) =>
        applyHeader(ws1.getCell(addr), ['Estado', 'Cantidad', '% del total'][i])
      );

      const totalStatus = s.reduce((acc, row) => acc + row.count, 0);
      s.forEach((row, i) => {
        const rowIdx = 13 + i;
        const pct = totalStatus > 0 ? ((row.count / totalStatus) * 100).toFixed(1) + '%' : '—';
        ws1.getCell(`A${rowIdx}`).value = STATUS_NAMES[row.status] || row.status;
        ws1.getCell(`B${rowIdx}`).value = row.count;
        ws1.getCell(`C${rowIdx}`).value = pct;
        ['A', 'B', 'C'].forEach((col) => applyDataCell(ws1.getCell(`${col}${rowIdx}`), i % 2 === 1));
        ws1.getRow(rowIdx).height = 20;
      });

      // ── SHEET 2: Agentes ──────────────────────────────────────────────────────
      const ws2 = wb.addWorksheet('Agentes', { properties: { tabColor: { argb: 'FF10B981' } } });
      ws2.columns = [
        { width: 5  },  // #
        { width: 28 },  // Agente
        { width: 16 },  // Cliente
        { width: 14 },  // Score Prom.
        { width: 13 },  // Auditorías
        { width: 12 },  // Score Min
        { width: 12 },  // Score Max
        { width: 13 },  // Tendencia
        { width: 14 },  // Estado
      ];

      applyTitle(ws2, `${appName} — Ranking de Agentes`, 'I', 1);
      applySubtitle(ws2, `Período: ${periodLabel}   ·   Exportado: ${today}`, 'I', 2);
      ws2.addRow([]);

      const agentHeaders = ['#', 'Agente', 'Cliente', 'Score Prom.', 'Auditorías', 'Score Mín.', 'Score Máx.', 'Tendencia', 'Estado'];
      'ABCDEFGHI'.split('').forEach((col, i) => applyHeader(ws2.getCell(`${col}4`), agentHeaders[i]));
      ws2.getRow(4).height = 24;

      agents.forEach((agent, i) => {
        const rowIdx = 5 + i;
        const alt = i % 2 === 1;
        const trend = agent.trend === 'up' ? '↑ Subió' : agent.trend === 'down' ? '↓ Bajó' : '→ Estable';
        const estado = agent.avg_score < 60 ? 'En riesgo' : agent.avg_score < 80 ? 'Regular' : 'Bueno';

        ws2.getCell(`A${rowIdx}`).value = i + 1;
        ws2.getCell(`B${rowIdx}`).value = agent.agent_name || agent.agent_id;
        ws2.getCell(`C${rowIdx}`).value = CLIENT_LABELS[agent.client_code] || agent.client_code;
        ws2.getCell(`D${rowIdx}`).value = agent.avg_score ?? '—';
        ws2.getCell(`E${rowIdx}`).value = agent.total_audits;
        ws2.getCell(`F${rowIdx}`).value = agent.min_score ?? '—';
        ws2.getCell(`G${rowIdx}`).value = agent.max_score ?? '—';
        ws2.getCell(`H${rowIdx}`).value = trend;
        ws2.getCell(`I${rowIdx}`).value = estado;

        'ABCDEFGHI'.split('').forEach((col) => applyDataCell(ws2.getCell(`${col}${rowIdx}`), alt));
        ws2.getRow(rowIdx).height = 20;

        // Score color
        const scoreCell = ws2.getCell(`D${rowIdx}`);
        if (agent.avg_score != null) {
          if (agent.avg_score < 60) {
            scoreCell.fill = FILL.redLight;
            scoreCell.font = { bold: true, color: { argb: 'FFDC2626' }, name: 'Calibri', size: 10 };
          } else if (agent.avg_score < 80) {
            scoreCell.fill = FILL.amberLight;
            scoreCell.font = { bold: true, color: { argb: 'FFD97706' }, name: 'Calibri', size: 10 };
          } else {
            scoreCell.fill = FILL.greenLight;
            scoreCell.font = { bold: true, color: { argb: 'FF059669' }, name: 'Calibri', size: 10 };
          }
          scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Trend color
        const trendCell = ws2.getCell(`H${rowIdx}`);
        if (agent.trend === 'up') trendCell.font = { bold: true, color: { argb: 'FF059669' }, name: 'Calibri', size: 10 };
        else if (agent.trend === 'down') trendCell.font = { bold: true, color: { argb: 'FFDC2626' }, name: 'Calibri', size: 10 };
        else trendCell.font = { color: { argb: 'FF64748B' }, name: 'Calibri', size: 10 };
      });

      ws2.views = [{ state: 'frozen', ySplit: 4 }];

      // ── SHEET 3: Criterios ────────────────────────────────────────────────────
      const ws3 = wb.addWorksheet('Criterios', { properties: { tabColor: { argb: 'FFEF4444' } } });
      ws3.columns = [
        { width: 5  },  // #
        { width: 50 },  // Criterio
        { width: 10 },  // Fallas
        { width: 13 },  // % del total
      ];

      applyTitle(ws3, `${appName} — Criterios con más Fallas`, 'D', 1);
      applySubtitle(ws3, `Período: ${periodLabel}   ·   Exportado: ${today}`, 'D', 2);
      ws3.addRow([]);

      ['A4', 'B4', 'C4', 'D4'].forEach((addr, i) =>
        applyHeader(ws3.getCell(addr), ['#', 'Criterio', 'Fallas', '% del total'][i])
      );
      ws3.getRow(4).height = 24;

      const totalFails = f.reduce((acc, c) => acc + c.failures, 0);
      f.forEach((c, i) => {
        const rowIdx = 5 + i;
        const alt = i % 2 === 1;
        const pct = totalFails > 0 ? ((c.failures / totalFails) * 100).toFixed(1) + '%' : '—';

        ws3.getCell(`A${rowIdx}`).value = i + 1;
        ws3.getCell(`B${rowIdx}`).value = c.label;
        ws3.getCell(`C${rowIdx}`).value = c.failures;
        ws3.getCell(`D${rowIdx}`).value = pct;

        ['A', 'B', 'C', 'D'].forEach((col) => applyDataCell(ws3.getCell(`${col}${rowIdx}`), alt));
        ws3.getRow(rowIdx).height = 20;

        // Top 3 highlight
        if (i === 0) {
          ['B', 'C'].forEach((col) => {
            ws3.getCell(`${col}${rowIdx}`).fill = FILL.redLight;
            ws3.getCell(`${col}${rowIdx}`).font = { bold: true, color: { argb: 'FFDC2626' }, name: 'Calibri', size: 10 };
          });
        } else if (i <= 2) {
          ['B', 'C'].forEach((col) => {
            ws3.getCell(`${col}${rowIdx}`).fill = FILL.amberLight;
            ws3.getCell(`${col}${rowIdx}`).font = { color: { argb: 'FFD97706' }, name: 'Calibri', size: 10 };
          });
        }
      });

      ws3.views = [{ state: 'frozen', ySplit: 4 }];

      // ── Download ──────────────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName}_Reportes_${period}_${today}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar Excel: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  // ── PDF export ──────────────────────────────────────────────────────────────

  const handlePdfExport = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let y = margin;
      let remaining = scaledHeight;

      while (remaining > 0) {
        const sliceHeight = Math.min(remaining, pageHeight - margin * 2);
        const srcY = (scaledHeight - remaining) / ratio;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sliceHeight / ratio;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, imgWidth, sliceHeight / ratio, 0, 0, imgWidth, sliceHeight / ratio);

        const sliceData = sliceCanvas.toDataURL('image/png');
        if (y > margin) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceHeight);

        remaining -= sliceHeight;
        y = margin;
      }

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`${appName}_Reportes_${period}_${today}.pdf`);
    } catch (err) {
      alert('Error al exportar PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Score color helper ──────────────────────────────────────────────────────

  const scoreColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-400';
    if (score < 60) return 'text-red-600 font-semibold';
    if (score < 80) return 'text-amber-600 font-semibold';
    return 'text-emerald-600 font-semibold';
  };

  const scoreBg = (score) => {
    if (score === null || score === undefined) return 'bg-slate-100 text-slate-500';
    if (score < 60) return 'bg-red-50 text-red-700';
    if (score < 80) return 'bg-amber-50 text-amber-700';
    return 'bg-emerald-50 text-emerald-700';
  };

  // ── Available client options from user ──────────────────────────────────────

  const clientOptions = user?.client_codes || [];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Análisis de calidad y rendimiento por período</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        {/* Period selector */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">Período</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom dates */}
        {period === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Client filter */}
        {clientOptions.length > 1 && (
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-slate-500">Cliente</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {CLIENT_LABELS[c] || c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1" />

        {/* Export buttons — ocultos para Obama */}
        {!user?.client_codes?.includes('obama') && (
          <>
            <button
              onClick={handleExcelExport}
              disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exporting ? 'Exportando...' : 'Excel'}
            </button>

            <button
              onClick={handlePdfExport}
              disabled={exportingPdf || loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {exportingPdf ? 'Generando...' : 'PDF'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PDF-capturable section */}
      <div ref={reportRef} className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Auditorías completadas"
            value={loading ? '—' : (kpis?.total_completed ?? '—')}
            color="blue"
            sublabel="en el período"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            label="Score promedio"
            value={loading ? '—' : (kpis?.avg_score != null ? kpis.avg_score + '%' : '—')}
            color="emerald"
            sublabel="de completadas"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            }
          />
          <KpiCard
            label="Agentes en riesgo"
            value={loading ? '—' : (kpis?.agents_at_risk ?? '—')}
            color="red"
            sublabel="score < 60"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
          <KpiCard
            label="Fallas alto impacto"
            value={loading ? '—' : (kpis?.high_impact_failures ?? '—')}
            color="amber"
            sublabel="en el período"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            }
          />
        </div>

        {/* Charts Row 1 — Weekly volume+score + Score by auditor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Auditorías por semana</h2>
            <p className="text-xs text-slate-400 mb-4">Volumen de auditorías y score promedio semanal</p>
            <div className="h-64">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
              ) : trend.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
              ) : (
                <Bar data={buildWeeklyVolumeChartData(trend)} options={COMBO_OPTIONS} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Score por coordinador</h2>
            <p className="text-xs text-slate-400 mb-4">Score promedio de auditorías completadas por auditor</p>
            <div className="h-64">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
              ) : byAuditor.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
              ) : (
                <Bar data={buildByAuditorChartData(byAuditor)} options={H_BAR_OPTIONS} />
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 — Failing criteria (2/3) + Doughnut (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Criterios con más fallas (top 10)</h2>
            <div className="h-72">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
              ) : failing.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
              ) : (
                <Bar data={buildFailingChartData(failing)} options={FAILING_BAR_OPTIONS} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Distribución por estado</h2>
            <div className="h-72">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando...</div>
              ) : statusDist.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin datos</div>
              ) : (
                <Doughnut data={buildStatusChartData(statusDist)} options={DOUGHNUT_OPTIONS} />
              )}
            </div>
          </div>
        </div>

        {/* Agent Ranking Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Ranking de agentes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ordenado por score (menor primero)</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : ranking.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Sin datos para el período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Agente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score Prom.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Auditorías</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tendencia</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ranking.map((agent, i) => (
                    <tr key={`${agent.agent_id}-${agent.client_code}-${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{agent.agent_name || agent.agent_id}</td>
                      <td className="px-4 py-3 text-slate-500">{CLIENT_LABELS[agent.client_code] || agent.client_code}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${scoreColor(agent.avg_score)}`}>
                        {agent.avg_score}%
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{agent.total_audits}</td>
                      <td className="px-4 py-3 text-center">
                        {agent.trend === 'up' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                            <ArrowUp /> Subió
                          </span>
                        )}
                        {agent.trend === 'down' && (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
                            <ArrowDown /> Bajó
                          </span>
                        )}
                        {agent.trend === 'neutral' && (
                          <span className="text-slate-400 text-xs">Estable</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreBg(agent.avg_score)}`}>
                          {agent.avg_score < 60 ? 'En riesgo' : agent.avg_score < 80 ? 'Regular' : 'Bueno'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
