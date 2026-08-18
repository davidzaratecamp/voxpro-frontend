import { useState, useEffect, useCallback } from 'react';
import { voicebotApi } from '../api/voicebot';
import { useAuth } from '../context/AuthContext';

const PROYECTO_NAMES = { 12: 'Claro Hogar', 13: 'Claro TyT' };
const CLIENT_CODE_TO_PROYECTO = { claro_hogar: 12, claro_tyt: 13 };

function PromptEditor({ proyectoId, initialText, onSaved, readOnly }) {
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">Prompt operativo</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        readOnly={readOnly}
        placeholder="Pega aquí el prompt operativo que sigue el agente de IA de esta campaña..."
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none resize-y ${
          readOnly ? 'bg-slate-50 text-slate-500 cursor-default' : 'focus:ring-1 focus:ring-blue-400'
        }`}
      />
      {!readOnly && (
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
      )}
    </div>
  );
}

function AutoAuditSwitch({ proyectoId, proyectoName, settings, onUpdate, readOnly }) {
  const [toggling, setToggling] = useState(false);
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  if (readOnly) {
    return settings.enabled ? (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Activa desde {new Date(settings.enabled_at).toLocaleString('es-CO')}
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Inactiva
      </span>
    );
  }

  const handleEnable = async () => {
    setToggling(true);
    try {
      const res = await voicebotApi.enableAutoAudit(proyectoId);
      onUpdate(res.data.data);
      setConfirmEnable(false);
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    try {
      const res = await voicebotApi.disableAutoAudit(proyectoId);
      onUpdate(res.data.data);
      setConfirmDisable(false);
    } finally {
      setToggling(false);
    }
  };

  if (settings.enabled) {
    if (confirmDisable) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-sm text-red-800">
            Al detener la auditoría automática, las llamadas nuevas de {proyectoName} dejan de calificarse solas de
            inmediato. Si la vuelves a activar más adelante, el corte se reinicia desde ese momento — las llamadas
            que pasen mientras está detenida <span className="font-semibold">no</span> se auditarán retroactivamente.
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
      );
    }
    return (
      <div className="flex items-center gap-3 flex-wrap">
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
    );
  }

  if (confirmEnable) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
        <p className="text-sm text-amber-800">
          Desde este momento, todas las llamadas nuevas de {proyectoName} se calificarán solas. Las llamadas
          anteriores a este click no se tocan. ¿Confirmas?
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
    );
  }

  return (
    <div className="space-y-3">
      {settings.disabled_reason && (
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
  );
}

export default function IAConfiguracion() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const allowedProyectoIds = user?.role === 'gestor_usuarios'
    ? [13, 12]
    : (user?.client_codes || []).map((c) => CLIENT_CODE_TO_PROYECTO[c]).filter(Boolean).sort((a, b) => b - a);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promptsRes, settingsRes] = await Promise.all([
        voicebotApi.getPrompts(),
        voicebotApi.getAuditSettings(),
      ]);
      setPrompts(promptsRes.data.data || {});
      setSettings(settingsRes.data.data || {});
    } catch {
      setPrompts({});
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = (proyectoId, newSettings) => {
    setSettings((prev) => ({ ...prev, [proyectoId]: newSettings }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración IA</h1>
          <p className="text-sm text-slate-500 mt-1">
            Prompt operativo y auditoría automática por campaña
          </p>
        </div>
        {user?.voicebot_read_only && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            Solo lectura
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Cargando configuración...</div>
      ) : allowedProyectoIds.length === 0 ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          Tu usuario no tiene ninguna campaña de Claro asignada. Pide que te agreguen Claro TyT o Claro Hogar.
        </div>
      ) : (
        allowedProyectoIds.map((proyectoId) => (
          <div key={proyectoId} className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            <h2 className="text-base font-semibold text-slate-800">{PROYECTO_NAMES[proyectoId]}</h2>

            {settings?.[proyectoId] && (
              <AutoAuditSwitch
                proyectoId={proyectoId}
                proyectoName={PROYECTO_NAMES[proyectoId]}
                settings={settings[proyectoId]}
                onUpdate={(s) => updateSettings(proyectoId, s)}
                readOnly={user?.voicebot_read_only}
              />
            )}

            <div className="border-t border-slate-100 pt-5">
              <PromptEditor
                proyectoId={proyectoId}
                initialText={prompts?.[proyectoId]?.prompt_text}
                onSaved={load}
                readOnly={user?.voicebot_read_only}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
