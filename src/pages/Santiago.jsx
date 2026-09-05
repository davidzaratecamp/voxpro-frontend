import { useState, useEffect, useCallback, useRef } from 'react';
import ExcelJS from 'exceljs';
import { santiApi } from '../api/santi';
import { formatDate } from '../lib/utils';

const STATUS_LABELS = {
  pending: 'Pendiente',
  matched: 'Auditando',
  not_found: 'No encontrada en Aware',
  done: 'Auditada',
  error: 'Error',
};

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-500',
  matched: 'bg-blue-50 text-blue-700',
  not_found: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
};

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score < 60) return 'text-red-600 font-semibold';
  if (score < 80) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

function SummaryCard({ label, value, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

export default function Santiago() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);
  const pageSize = 50;

  const fetchSummary = useCallback(() => {
    santiApi.getSummary().then((res) => setSummary(res.data.data)).catch(() => {});
  }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    setError('');
    santiApi.list({ status: status || undefined, phone: phone || undefined, page })
      .then((res) => {
        setRows(res.data.data);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.response?.data?.message || 'Error cargando las auditorías'))
      .finally(() => setLoading(false));
  }, [status, phone, page]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchList(); }, [fetchList]);

  // Mientras haya filas pendientes/en auditoría, refresca solo cada 15s
  // (el lote real lo procesa el cron del backend, esto solo refleja avance).
  useEffect(() => {
    if (!summary || (summary.pending === 0 && summary.matched === 0)) return;
    const t = setInterval(() => { fetchSummary(); fetchList(); }, 15000);
    return () => clearInterval(t);
  }, [summary, fetchSummary, fetchList]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const res = await santiApi.importExcel(file);
      const d = res.data.data;
      setUploadMsg(`Importadas ${d.importadas} de ${d.totalFilas} filas (${d.omitidasPorDuplicado} ya existían, ${d.sinTelefonoOFecha} sin teléfono/fecha).`);
      fetchSummary();
      fetchList();
    } catch (err) {
      setUploadMsg('Error al importar: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessNow = async () => {
    try {
      await santiApi.processBatch();
      setUploadMsg('Se disparó el procesamiento de un lote — la lista se actualiza sola cada 15s.');
      setTimeout(() => { fetchSummary(); fetchList(); }, 3000);
    } catch (err) {
      setUploadMsg('Error al iniciar el procesamiento: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await santiApi.exportRows({ status: status || undefined, phone: phone || undefined });
      const data = res.data.data;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Santiago');
      ws.columns = [
        { header: 'Teléfono', key: 'phone', width: 16 },
        { header: 'Fecha', key: 'fecha_excel', width: 14 },
        { header: 'Ciudad', key: 'ciudad', width: 16 },
        { header: 'Campaña', key: 'campana', width: 20 },
        { header: 'Agente', key: 'agent_name', width: 26 },
        { header: 'Estado', key: 'status', width: 18 },
        { header: 'Calificación', key: 'score', width: 12 },
        { header: 'Resumen', key: 'summary', width: 50 },
        { header: 'Transcripción', key: 'transcription', width: 80 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      for (const r of data) {
        ws.addRow({
          phone: r.phone,
          fecha_excel: r.fecha_excel ? String(r.fecha_excel).slice(0, 10) : '',
          ciudad: r.ciudad || '',
          campana: r.campana || '',
          agent_name: r.agent_name || '',
          status: STATUS_LABELS[r.status] || r.status,
          score: r.score ?? '',
          summary: r.summary || '',
          transcription: r.transcription || '',
        });
      }
      ws.getColumn('summary').alignment = { wrapText: true, vertical: 'top' };
      ws.getColumn('transcription').alignment = { wrapText: true, vertical: 'top' };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Santiago_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Santiago</h2>
          <p className="text-sm text-slate-500 mt-1">
            Auditoría automática de grabaciones outbound a partir de una lista de teléfonos (Excel de campaña) — se emparejan contra Aware por teléfono + fecha y se califican con la matriz de calidad de Claro Hogar.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer transition-colors">
            {uploading ? 'Subiendo...' : 'Importar Excel'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <button
            onClick={handleProcessNow}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Procesar ahora
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exportando...' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          {uploadMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={summary?.total} />
        <SummaryCard label="Pendientes" value={summary?.pending} />
        <SummaryCard label="Auditando" value={summary?.matched} />
        <SummaryCard label="Auditadas" value={summary?.done} />
        <SummaryCard label="No encontradas / error" value={(summary?.not_found ?? 0) + (summary?.error ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por teléfono..."
          value={phone}
          onChange={(e) => { setPage(1); setPhone(e.target.value); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56"
        />
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Teléfono</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Ciudad</th>
                <th className="px-4 py-3 text-left">Agente</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Calificación</th>
                <th className="px-4 py-3 text-left">Resumen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Sin resultados — importa un Excel para empezar.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{r.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.fecha_excel)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.ciudad || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.agent_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${scoreColor(r.score)}`}>{r.score ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.summary || (r.status === 'error' ? r.error_message : '—')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetail(r)} className="text-blue-600 hover:underline text-xs font-medium">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
          <span>{total} resultados</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40">Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{detail.phone}</h3>
                <p className="text-sm text-slate-500">{detail.agent_name || 'Sin agente'} · {String(detail.fecha_excel).slice(0, 10)}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[detail.status]}`}>
                  {STATUS_LABELS[detail.status] || detail.status}
                </span>
                {detail.score != null && <span className={`ml-3 text-sm ${scoreColor(detail.score)}`}>Calificación: {detail.score}</span>}
              </div>
              {detail.error_message && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-1">Error</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.error_message}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">Resumen</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.summary || '—'}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">Transcripción</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.transcription || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
