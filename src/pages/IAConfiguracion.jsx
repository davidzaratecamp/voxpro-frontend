import { useState, useEffect, useCallback } from 'react';
import { voicebotApi } from '../api/voicebot';

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

export default function IAConfiguracion() {
  const [prompts, setPrompts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

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
      setSettings({ enabled: false, enabled_at: null, disabled_reason: null });
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
      setConfirmDisable(false);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Prompts operativos y auditoría automática de las llamadas del voicebot de Claro
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando configuración...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Auditoría automática con IA</h2>
            <p className="text-sm text-slate-500 mb-4">
              Cada llamada nueva de Claro TyT y Claro Hogar se calificará sola contra el prompt operativo de su campaña.
              Las llamadas anteriores al momento de activación nunca se tocan.
            </p>

            {settings?.enabled ? (
              confirmDisable ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm text-red-800">
                    Al detener la auditoría automática, las llamadas nuevas dejan de calificarse solas de inmediato.
                    Si la vuelves a activar más adelante, el corte se reinicia desde ese momento — las llamadas que
                    pasen mientras está detenida <span className="font-semibold">no</span> se auditarán retroactivamente.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisable}
                      disabled={toggling}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                    >
                      {toggling ? 'Deteniendo...' : 'Sí, detener ahora'}
                    </button>
                    <button
                      onClick={() => setConfirmDisable(false)}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Activa desde {new Date(settings.enabled_at).toLocaleString('es-CO')}
                  </span>
                  <button
                    onClick={() => setConfirmDisable(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Detener auditoría automática
                  </button>
                </div>
              )
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
              <div className="space-y-3">
                {settings?.disabled_reason && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Se detuvo sola la última vez: </span>
                      {settings.disabled_reason}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setConfirmEnable(true)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Activar auditoría automática
                </button>
              </div>
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
        </>
      )}
    </div>
  );
}
