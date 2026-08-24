import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AgentFeedbackTemplate from './AgentFeedbackTemplate';
import { voicebotApi } from '../api/voicebot';

/**
 * Botón "Descargar PDF de feedback" — genera el PDF a partir de
 * AgentFeedbackTemplate (renderizado fuera de pantalla) y, si se pasa
 * `botCallId`, marca la continuación como entregada (queda en el
 * historial "Feedback" del coordinador). Reutilizado en el modal de
 * Auditoría IA y en la página Feedback (re-descarga).
 */
export default function FeedbackPdfButton({ continuation, botCallId, onDelivered, className }) {
  const [downloading, setDownloading] = useState(false);
  const feedbackRef = useRef(null);

  const handleDownload = async () => {
    if (!feedbackRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(feedbackRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Una sola página siempre — se escala el contenido para que quepa
      // completo (ancho y alto), en vez de cortarlo en varias páginas.
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const renderWidth = imgWidth * ratio;
      const renderHeight = imgHeight * ratio;
      const x = margin + (availWidth - renderWidth) / 2;

      pdf.addImage(imgData, 'PNG', x, margin, renderWidth, renderHeight);

      const agentSlug = (continuation.agente_nombre || continuation.agente_id || 'agente').replace(/[^a-zA-Z0-9]+/g, '_');
      pdf.save(`Feedback_${agentSlug}_${continuation.fecha}.pdf`);

      if (botCallId) {
        try {
          await voicebotApi.markContinuationDelivered(botCallId);
          onDelivered?.();
        } catch {
          // No bloquea la descarga si falla el registro de entrega.
        }
      }
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={className || 'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 transition-colors'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        {downloading ? 'Generando PDF...' : 'Descargar PDF de feedback'}
      </button>
      <div style={{ position: 'fixed', top: 0, left: '-9999px' }}>
        <AgentFeedbackTemplate ref={feedbackRef} continuation={continuation} />
      </div>
    </>
  );
}
