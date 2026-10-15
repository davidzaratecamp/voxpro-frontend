import ExcelJS from 'exceljs';

// Excel del historial de auditorías de Asiste (lo que esté filtrado en pantalla):
// Resumen por agente, Detalle por llamada y Criterios incumplidos. Sin
// transcripciones.

const ESTADO = { selected: 'Pendiente', in_review: 'Por revisar', completed: 'Completada', skipped: 'Omitida' };
const NAVY = 'FF1F3864';
const FONT = 'Arial';
const BORDER = ['top', 'left', 'bottom', 'right'].reduce((b, k) => ({ ...b, [k]: { style: 'thin', color: { argb: 'FFBFBFBF' } } }), {});
const FILL = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const label = (s) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};
const fecha = (f) => (f ? String(f).slice(0, 10) : '');
// Fecha pura en UTC: Excel la guarda sin hora (con la zona local quedaba 05:00).
const toDate = (f) => {
  if (!f) return null;
  const [y, m, d] = fecha(f).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const duracion = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const scoreFill = (v) => (typeof v !== 'number' ? null : v < 60 ? 'FFF8CBAD' : v < 80 ? 'FFFFE699' : 'FFC6E0B4');

function titulo(ws, text, sub, lastCol) {
  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell('A1').value = text;
  ws.getCell('A1').font = { name: FONT, size: 15, bold: true, color: { argb: NAVY } };
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell('A2').value = sub;
  ws.getCell('A2').font = { name: FONT, size: 9, italic: true, color: { argb: 'FF595959' } };
  ws.getRow(1).height = 24;
}

function tabla(ws, startRow, columns, rows, { wrap = [], center = [], onRow } = {}) {
  ws.columns = columns.map((c) => ({ width: c.width }));
  const head = ws.getRow(startRow);
  columns.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = FILL(NAVY);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
  head.height = 30;
  rows.forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = { name: FONT, size: 10 };
      cell.border = BORDER;
      if (r % 2 === 1) cell.fill = FILL('FFF2F5FA');
      cell.alignment = { vertical: 'top', wrapText: wrap.includes(i + 1), horizontal: center.includes(i + 1) ? 'center' : undefined };
      if (columns[i].numFmt) cell.numFmt = columns[i].numFmt;
    });
    onRow?.(row, values);
  });
  ws.views = [{ state: 'frozen', ySplit: startRow }];
  if (rows.length) {
    ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow + rows.length, column: columns.length } };
  }
}

/**
 * @param {Array} audits - respuesta de GET /obama-vital/audits/export
 * @param {string} filtrosTexto - descripción de los filtros aplicados (va en el encabezado)
 */
export async function exportarHistorialAsiste(audits, filtrosTexto) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VoxPro';
  wb.created = new Date();
  const generado = new Date().toLocaleString('es-CO');
  const sub = `${filtrosTexto} · ${audits.length} auditorías · Generado el ${generado} desde VoxPro`;

  // ── Resumen por agente (solo auditorías calificadas) ────────────────────
  const calif = audits.filter((a) => typeof a.score === 'number' && (a.status === 'completed' || a.status === 'in_review'));
  const porAgente = new Map();
  for (const a of calif) {
    const k = a.agente_id;
    if (!porAgente.has(k)) porAgente.set(k, { nombre: a.agente_nombre || a.agente_id, cedula: a.agente_id, camp: new Set(), fuentes: new Set(), scores: [], comp: 0, rev: 0, hi: 0 });
    const g = porAgente.get(k);
    g.camp.add(a.proyecto_nombre || a.campaign);
    g.fuentes.add(a.source === 'zoom' ? 'Zoom' : 'Aware');
    g.scores.push(a.score);
    if (a.status === 'completed') g.comp++;
    if (a.status === 'in_review') g.rev++;
    if (a.high_impact_failed) g.hi++;
  }
  const resumenRows = [...porAgente.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((g) => {
      const prom = g.scores.reduce((s, x) => s + x, 0) / g.scores.length;
      return [g.nombre, g.cedula, [...g.camp].sort().join(', '), [...g.fuentes].sort().join(', '), g.scores.length, g.comp, g.rev,
        Math.round(prom * 10) / 10, Math.min(...g.scores), Math.max(...g.scores), g.hi, g.scores.length ? g.hi / g.scores.length : 0];
    });
  const res = wb.addWorksheet('Resumen por agente');
  titulo(res, 'Auditorías de calidad — Asiste', sub, 'L');
  tabla(res, 4, [
    { header: 'Agente', width: 32 }, { header: 'Cédula', width: 13 }, { header: 'Campaña', width: 20 }, { header: 'Fuente', width: 12 },
    { header: 'Llamadas calificadas', width: 11 }, { header: 'Completadas', width: 11 }, { header: 'Por revisar', width: 10 },
    { header: 'Puntaje promedio', width: 10, numFmt: '0.0' }, { header: 'Puntaje mínimo', width: 9 }, { header: 'Puntaje máximo', width: 9 },
    { header: 'Fallas de alto impacto', width: 11 }, { header: '% con falla de alto impacto', width: 12, numFmt: '0.0%' },
  ], resumenRows, {
    center: [2, 5, 6, 7, 8, 9, 10, 11, 12],
    onRow: (row, v) => [8, 9, 10].forEach((c) => { const f = scoreFill(v[c - 1]); if (f) row.getCell(c).fill = FILL(f); }),
  });
  const nota = res.getRow(6 + resumenRows.length);
  nota.getCell(1).value = 'Solo se resumen las auditorías con calificación ("Completada": confirmada o corregida por el auditor; "Por revisar": calificada por la IA y pendiente de confirmar). Colores: verde ≥ 80, amarillo 60–79, rojo < 60.';
  nota.getCell(1).font = { name: FONT, size: 9, italic: true, color: { argb: 'FF595959' } };

  // ── Detalle ──────────────────────────────────────────────────────────────
  const fallas = [];
  const detRows = audits.map((a) => {
    // Solo cuentan los criterios de auditorías calificadas (no las pendientes ni las omitidas).
    const calificada = typeof a.score === 'number' && (a.status === 'completed' || a.status === 'in_review');
    const gen = calificada ? (a.criteria_general || []).filter((g) => !g.cumple && !g.na) : [];
    const hi = calificada ? (a.criteria_high_impact || []).filter((h) => !h.cumple) : [];
    for (const g of gen) fallas.push([a.id, toDate(a.fecha), a.agente_nombre || a.agente_id, a.agente_id, a.proyecto_nombre, a.source === 'zoom' ? 'Zoom' : 'Aware', ESTADO[a.status] || a.status, 'General', label(g.label), g.weight ?? '', String(g.observacion || '').trim()]);
    for (const h of hi) fallas.push([a.id, toDate(a.fecha), a.agente_nombre || a.agente_id, a.agente_id, a.proyecto_nombre, a.source === 'zoom' ? 'Zoom' : 'Aware', ESTADO[a.status] || a.status, 'Alto impacto', label(h.label), '', String(h.observacion || '').trim()]);
    const ajuste = a.status === 'completed' && typeof a.ai_score === 'number' && typeof a.score === 'number' ? a.score - a.ai_score : '';
    return [
      a.id, toDate(a.fecha), (a.hora || '').slice(0, 5), a.agente_nombre || a.agente_id, a.agente_id, a.proyecto_nombre,
      a.source === 'zoom' ? 'Zoom' : 'Aware', a.telefono || '', duracion(a.duracion), ESTADO[a.status] || a.status,
      a.score ?? '', a.ai_score ?? '', ajuste, calificada ? (a.high_impact_failed ? 'Sí' : 'No') : '',
      gen.map((g) => `• ${label(g.label)} (${g.weight}%)`).join('\n') || (calificada ? '—' : ''),
      hi.map((h) => `• ${label(h.label)}`).join('\n') || (calificada ? '—' : ''),
      String(a.notes || '').replace(/\s+/g, ' ').trim(), a.auditor_nombre || '',
    ];
  });
  const det = wb.addWorksheet('Detalle');
  titulo(det, 'Detalle de auditorías — Asiste', sub, 'R');
  tabla(det, 4, [
    { header: 'N° auditoría', width: 10 }, { header: 'Fecha', width: 11, numFmt: 'dd/mm/yyyy' }, { header: 'Hora', width: 7 },
    { header: 'Agente', width: 30 }, { header: 'Cédula', width: 13 }, { header: 'Campaña', width: 13 }, { header: 'Fuente', width: 8 },
    { header: 'Teléfono cliente', width: 15 }, { header: 'Duración', width: 9 }, { header: 'Estado', width: 12 },
    { header: 'Puntaje final', width: 9 }, { header: 'Puntaje IA', width: 9 }, { header: 'Ajuste del auditor', width: 10, numFmt: '+0;-0;0' },
    { header: 'Falla de alto impacto', width: 10 }, { header: 'Criterios generales no cumplidos', width: 45 },
    { header: 'Alto impacto no cumplido', width: 40 }, { header: 'Observación general', width: 70 }, { header: 'Auditor', width: 24 },
  ], detRows, {
    wrap: [15, 16, 17],
    center: [1, 2, 3, 7, 9, 10, 11, 12, 13, 14],
    onRow: (row, v) => {
      [11, 12].forEach((c) => { const f = scoreFill(v[c - 1]); if (f) row.getCell(c).fill = FILL(f); });
      if (v[13] === 'Sí') row.getCell(14).fill = FILL('FFF8CBAD');
    },
  });

  // ── Criterios incumplidos ────────────────────────────────────────────────
  const cri = wb.addWorksheet('Criterios incumplidos');
  titulo(cri, 'Criterios no cumplidos por llamada', `${sub} · Los criterios marcados N/A no cuentan como incumplidos`, 'K');
  tabla(cri, 4, [
    { header: 'N° auditoría', width: 10 }, { header: 'Fecha', width: 11, numFmt: 'dd/mm/yyyy' }, { header: 'Agente', width: 30 },
    { header: 'Cédula', width: 13 }, { header: 'Campaña', width: 13 }, { header: 'Fuente', width: 8 }, { header: 'Estado', width: 12 },
    { header: 'Tipo', width: 12 }, { header: 'Criterio', width: 42 }, { header: 'Peso (%)', width: 8 }, { header: 'Observación', width: 80 },
  ], fallas, {
    wrap: [9, 11],
    center: [1, 2, 6, 7, 8, 10],
    onRow: (row, v) => { if (v[7] === 'Alto impacto') row.getCell(8).fill = FILL('FFF8CBAD'); },
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Auditorias_Asiste_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
