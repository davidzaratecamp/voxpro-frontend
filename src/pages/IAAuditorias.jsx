import { useState, useEffect, useCallback } from 'react';
import { voicebotApi } from '../api/voicebot';

const PROYECTOS = [
  { value: '', label: 'Todos los proyectos' },
  { value: '12', label: 'Claro Hogar' },
  { value: '13', label: 'Claro TyT' },
];

const HANGUP_LABELS = {
  call_transfer: { label: 'Transferida a asesor', cls: 'bg-emerald-100 text-emerald-700' },
  user_hangup:   { label: 'Colgó el cliente',      cls: 'bg-slate-100 text-slate-600' },
  agent_hangup:  { label: 'Colgó el bot',           cls: 'bg-slate-100 text-slate-600' },
  inactivity:    { label: 'Inactividad',            cls: 'bg-amber-100 text-amber-700' },
};

function hangupBadge(reason) {
  return HANGUP_LABELS[reason] || { label: reason || '—', cls: 'bg-slate-100 text-slate-500' };
}

function scoreBadge(score) {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function defaultDates() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

// ─── Modal de detalle ───────────────────────────────────────────────────────

function CallDetailModal({ callId, onClose }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [aiAudit, setAiAudit] = useState(undefined); // undefined = cargando, null = sin auditar

  useEffect(() => {
    setLoading(true);
    setError(null);
    voicebotApi.getCall(callId)
      .then((res) => setCall(res.data.data))
      .catch(() => setError('No se pudo cargar el detalle de la llamada.'))
      .finally(() => setLoading(false));

    setAiAudit(undefined);
    voicebotApi.getCallAudit(callId)
      .then((res) => setAiAudit(res.data.data))
      .catch(() => setAiAudit(null));

    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  const handleLoadAudio = async () => {
    setAudioLoading(true);
    setAudioError(null);
    try {
      const res = await voicebotApi.getAudio(callId);
      setAudioUrl(URL.createObjectURL(res.data));
    } catch {
      setAudioError('No se pudo cargar el audio de esta llamada.');
    } finally {
      setAudioLoading(false);
    }
  };

  const badge = call ? hangupBadge(call.hangup_reason) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Llamada IA</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {loading && <p className="text-sm text-slate-400 py-8 text-center">Cargando...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {call && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Fecha:</span> {call.fecha} {String(call.hora).slice(0, 8)}</div>
                <div><span className="text-slate-400">Teléfono:</span> {call.telefono}</div>
                <div><span className="text-slate-400">Proyecto:</span> {call.proyecto_name}</div>
                <div><span className="text-slate-400">Duración:</span> {formatDuration(call.duracion)}</div>
                <div><span className="text-slate-400">Servicio:</span> {call.tipo_servicio || '—'}</div>
                <div><span className="text-slate-400">Sentimiento:</span> {call.user_sentiment || '—'}</div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {call.call_summary && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Resumen de la IA</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{call.call_summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Auditoría de calidad IA</h3>
                {aiAudit === undefined ? (
                  <p className="text-xs text-slate-400">Cargando...</p>
                ) : aiAudit === null ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                    Aún no auditada — puede ser anterior a la activación de la auditoría automática, estar en cola, o el switch está desactivado.
                  </p>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${scoreBadge(aiAudit.score)}`}>
                      {aiAudit.score}/100
                    </span>
                    {aiAudit.summary && <p className="text-sm text-slate-700">{aiAudit.summary}</p>}
                    {aiAudit.strengths && (
                      <p className="text-xs text-emerald-700"><span className="font-semibold">Aciertos: </span>{aiAudit.strengths}</p>
                    )}
                    {aiAudit.issues && (
                      <p className="text-xs text-red-600"><span className="font-semibold">Fallas: </span>{aiAudit.issues}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Audio</h3>
                {!audioUrl ? (
                  <button
                    onClick={handleLoadAudio}
                    disabled={audioLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {audioLoading ? 'Cargando audio...' : 'Reproducir'}
                  </button>
                ) : (
                  <audio controls src={audioUrl} className="w-full" />
                )}
                {audioError && <p className="text-xs text-red-500 mt-1">{audioError}</p>}
              </div>

              {call.transcript?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Transcripción</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto bg-slate-50 rounded-lg p-3">
                    {call.transcript.map((turn, i) => {
                      const isAgent = turn.role === 'agent';
                      return (
                        <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            isAgent ? 'bg-white border border-slate-200 text-slate-700' : 'bg-blue-600 text-white'
                          }`}>
                            <p className="text-[10px] uppercase font-semibold mb-0.5 opacity-60">
                              {isAgent ? 'IA' : 'Cliente'}
                            </p>
                            {turn.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab de configuración: prompts + switch de auditoría automática ──────────

function PromptEditor({ proyectoId, label, initialText, onSaved }) {
  const [text, setText] = useState(initialText || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!text.trim()) {
      setError('El prompt no puede estar vacío.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await voicebotApi.savePrompt(proyectoId, text.trim());
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('No se pudo guardar el prompt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Pega aquí el prompt operativo que sigue el agente de IA de esta campaña..."
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-400 resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">Guardado</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function ConfiguracionTab() {
  const [prompts, setPrompts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmEnable, setConfirmEnable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promptsRes, settingsRes] = await Promise.all([
        voicebotApi.getPrompts(),
        voicebotApi.getAuditSettings(),
      ]);
      setPrompts(promptsRes.data.data || {});
      setSettings(settingsRes.data.data);
    } catch {
      setPrompts({});
      setSettings({ enabled: false, enabled_at: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEnable = async () => {
    setToggling(true);
    try {
      const res = await voicebotApi.enableAutoAudit();
      setSettings(res.data.data);
      setConfirmEnable(false);
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    try {
      const res = await voicebotApi.disableAutoAudit();
      setSettings(res.data.data);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400 py-12 text-center">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Auditoría automática con IA</h2>
        <p className="text-sm text-slate-500 mb-4">
          Cada llamada nueva de Claro TyT y Claro Hogar se calificará sola contra el prompt operativo de su campaña.
          Las llamadas anteriores al momento de activación nunca se tocan.
        </p>

        {settings?.enabled ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Activa desde {new Date(settings.enabled_at).toLocaleString('es-CO')}
            </span>
            <button
              onClick={handleDisable}
              disabled={toggling}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              {toggling ? 'Desactivando...' : 'Desactivar'}
            </button>
          </div>
        ) : confirmEnable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm text-amber-800">
              Desde este momento, todas las llamadas nuevas de Claro TyT y Claro Hogar se calificarán solas. Las llamadas anteriores a este click no se tocan. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={toggling}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                {toggling ? 'Activando...' : 'Sí, activar ahora'}
              </button>
              <button
                onClick={() => setConfirmEnable(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnable(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Activar auditoría automática
          </button>
        )}
      </div>

      <PromptEditor
        proyectoId={13}
        label="Prompt operativo — Claro TyT"
        initialText={prompts?.[13]?.prompt_text}
        onSaved={load}
      />
      <PromptEditor
        proyectoId={12}
        label="Prompt operativo — Claro Hogar"
        initialText={prompts?.[12]?.prompt_text}
        onSaved={load}
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function IAAuditorias() {
  const [tab, setTab] = useState('llamadas'); // 'llamadas' | 'configuracion'
  const initialDates = defaultDates();
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [proyecto, setProyecto] = useState('');
  const [onlyTransfer, setOnlyTransfer] = useState(false);
  const [phone, setPhone] = useState('');

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (proyecto) params.proyecto_id = proyecto;
      if (onlyTransfer) params.only_transfer = 'true';
      if (phone.trim()) params.phone = phone.trim();
      const res = await voicebotApi.getCalls(params);
      setCalls(res.data.data || []);
    } catch {
      setLoadError('No se pudieron cargar las llamadas.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, proyecto, onlyTransfer, phone]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auditoría IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Llamadas atendidas por el agente de IA de Claro — {calls.length} en el rango seleccionado
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'llamadas',      label: 'Llamadas' },
          { key: 'configuracion', label: 'Configuración' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'configuracion' ? (
        <ConfiguracionTab />
      ) : (
      <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            {PROYECTOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Buscar por teléfono..."
            className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyTransfer}
              onChange={(e) => setOnlyTransfer(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
            />
            Solo transferidas
          </label>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando llamadas...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                <th className="px-4 py-3 text-left font-medium">Duración</th>
                <th className="px-4 py-3 text-left font-medium">Resultado</th>
                <th className="px-4 py-3 text-left font-medium">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No hay llamadas en el rango seleccionado.
                  </td>
                </tr>
              )}
              {calls.map((c) => {
                const badge = hangupBadge(c.hangup_reason);
                return (
                  <tr
                    key={c.call_id}
                    onClick={() => setSelectedCallId(c.call_id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {c.fecha} {String(c.hora).slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{c.telefono}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        {c.proyecto_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDuration(c.duracion)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-md truncate">
                      {c.call_summary || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCallId && (
        <CallDetailModal callId={selectedCallId} onClose={() => setSelectedCallId(null)} />
      )}
      </>
      )}
    </div>
  );
}
