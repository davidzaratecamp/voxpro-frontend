import { forwardRef } from 'react';

const CLIENT_LABELS = { claro_hogar: 'Claro Hogar', claro_tyt: 'Claro TyT' };

function fmtDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Plantilla imprimible del feedback de calidad para el agente humano —
// pensada para capturarse con html2canvas y exportarse a PDF (ver
// handleDownloadFeedbackPdf en IAAuditorias.jsx). Se renderiza fuera de
// pantalla, nunca se ve directamente en la interfaz.
const AgentFeedbackTemplate = forwardRef(function AgentFeedbackTemplate({ continuation }, ref) {
  if (!continuation) return null;
  const general = continuation.criteria_general || [];
  const highImpact = continuation.criteria_high_impact || [];
  const score = continuation.score;
  const highImpactFailed = continuation.high_impact_failed;

  return (
    <div ref={ref} style={{ width: '780px', padding: '32px', background: '#ffffff', fontFamily: 'Calibri, Arial, sans-serif', color: '#1e293b' }}>
      <div style={{ borderBottom: '3px solid #1e3a8a', paddingBottom: '12px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>Feedback de Auditoría de Calidad</h1>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
          {CLIENT_LABELS[continuation.client_code] || continuation.client_code} — Llamada transferida por SOFIA
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', fontWeight: 700, width: '160px', color: '#475569' }}>Agente</td>
            <td style={{ padding: '4px 8px' }}>{continuation.agente_nombre || '—'}</td>
            <td style={{ padding: '4px 8px', fontWeight: 700, width: '120px', color: '#475569' }}>Cédula</td>
            <td style={{ padding: '4px 8px' }}>{continuation.agente_id || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px', fontWeight: 700, color: '#475569' }}>Fecha de la grabación</td>
            <td style={{ padding: '4px 8px' }}>{fmtDate(continuation.fecha)} {String(continuation.hora || '').slice(0, 8)}</td>
            <td style={{ padding: '4px 8px', fontWeight: 700, color: '#475569' }}>Fecha de la auditoría</td>
            <td style={{ padding: '4px 8px' }}>{fmtDate(continuation.updated_at || continuation.created_at)}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px', fontWeight: 700, color: '#475569' }}>Teléfono</td>
            <td style={{ padding: '4px 8px' }}>{continuation.telefono || '—'}</td>
            <td style={{ padding: '4px 8px', fontWeight: 700, color: '#475569' }}>Duración</td>
            <td style={{ padding: '4px 8px' }}>
              {continuation.duracion != null ? `${Math.floor(continuation.duracion / 60)}:${String(continuation.duracion % 60).padStart(2, '0')}` : '—'}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{
        background: highImpactFailed ? '#fef2f2' : score >= 80 ? '#ecfdf5' : score >= 60 ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${highImpactFailed ? '#fecaca' : score >= 80 ? '#a7f3d0' : score >= 60 ? '#fde68a' : '#fecaca'}`,
        borderRadius: '8px',
        padding: '14px 16px',
        marginBottom: '20px',
      }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', margin: 0 }}>Puntaje final</p>
        <p style={{ fontSize: '28px', fontWeight: 700, margin: '2px 0 0', color: highImpactFailed ? '#dc2626' : score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626' }}>
          {score}/100 {highImpactFailed && <span style={{ fontSize: '13px', fontWeight: 700 }}> — Falla de alto impacto</span>}
        </p>
        {continuation.notes && <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>{continuation.notes}</p>}
      </div>

      {highImpact.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Items de Alto Impacto</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0' }}>Criterio</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', border: '1px solid #e2e8f0', width: '80px' }}>Resultado</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0' }}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {highImpact.map((item) => (
                <tr key={item.key}>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{item.label}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: item.cumple ? '#059669' : '#dc2626', fontWeight: 700 }}>
                    {item.cumple ? 'Cumple' : 'No cumple'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{item.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {general.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Criterios Generales</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0' }}>Criterio</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', border: '1px solid #e2e8f0', width: '50px' }}>Peso</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', border: '1px solid #e2e8f0', width: '80px' }}>Resultado</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid #e2e8f0' }}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {general.map((item) => (
                <tr key={item.key}>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{item.label}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.weight}%</td>
                  <td style={{
                    padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700,
                    color: item.na ? '#64748b' : item.cumple ? '#059669' : '#dc2626',
                  }}>
                    {item.na ? 'N/A' : item.cumple ? 'Cumple' : 'No cumple'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{item.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '28px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>Compromiso de mejora</h2>
        <p style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
          Yo, <strong>{continuation.agente_nombre || '_______________________________'}</strong>, identificado con cédula{' '}
          <strong>{continuation.agente_id || '_______________'}</strong>, recibí retroalimentación sobre esta llamada y me comprometo a mejorar en el/los siguiente(s) aspecto(s):
        </p>
        <div style={{ borderBottom: '1px solid #94a3b8', height: '22px' }} />
        <div style={{ borderBottom: '1px solid #94a3b8', height: '22px' }} />
        <div style={{ borderBottom: '1px solid #94a3b8', height: '22px', marginBottom: '24px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ width: '45%' }}>
            <div style={{ borderBottom: '1px solid #1e293b', height: '32px' }} />
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Firma del agente</p>
          </div>
          <div style={{ width: '30%' }}>
            <div style={{ borderBottom: '1px solid #1e293b', height: '32px' }} />
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Fecha</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AgentFeedbackTemplate;
