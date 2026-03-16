import { useState, useEffect, useCallback } from 'react';
import { criteriaApi } from '../api/criteria';
import { useAuth } from '../context/AuthContext';

const GROUPS = [
  { key: 'claro', label: 'Claro', campaigns: ['claro_wcb', 'claro_hogar', 'claro_tyt'] },
  { key: 'obama', label: 'Obama', campaigns: ['obama_ventas', 'obama_customer'] },
  { key: 'lv',    label: 'Vital', campaigns: ['lv_ventas', 'lv_customer'] },
];

// Qué client_code necesita cada campaña para ser visible
const CAMPAIGN_CLIENT = {
  claro_wcb:      'claro_wcb',
  claro_hogar:    'claro_hogar',
  claro_tyt:      'claro_tyt',
  obama_ventas:   'obama',
  obama_customer: 'obama',
  lv_ventas:      'lv',
  lv_customer:    'lv',
};

const NA_RULE_LABELS = {
  third_party:  'Tercero (no titular)',
  dropped_call: 'Llamada cortada',
  rejection:    'Rechazo del cliente',
  always_na:    'Siempre N/A (no verificable por audio)',
};

// ─── GeneralCriteriaTable ───────────────────────────────────────────────────

function GeneralCriteriaTable({ general, onChange }) {
  const total = general.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  function updateRow(idx, field, value) {
    const next = general.map((c, i) =>
      i === idx ? { ...c, [field]: field === 'weight' ? Number(value) : value } : c
    );
    onChange(next);
  }

  function addRow() {
    onChange([...general, { key: '', label: '', weight: 0 }]);
  }

  function removeRow(idx) {
    onChange(general.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700">Criterios Generales</h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${total === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          Total: {total}%
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Key</th>
              <th className="px-3 py-2 text-left font-medium">Etiqueta</th>
              <th className="px-3 py-2 text-right font-medium w-20">Peso %</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {general.map((c, i) => (
              <tr key={i} className="bg-white hover:bg-slate-50">
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={c.key}
                    onChange={(e) => updateRow(i, 'key', e.target.value)}
                    className="w-full text-xs font-mono bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                    placeholder="key_criterio"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) => updateRow(i, 'label', e.target.value)}
                    className="w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                    placeholder="Nombre del criterio"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={c.weight}
                    onChange={(e) => updateRow(i, 'weight', e.target.value)}
                    className="w-full text-right bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Eliminar fila"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Agregar criterio
      </button>
    </div>
  );
}

// ─── HighImpactList ─────────────────────────────────────────────────────────

function HighImpactList({ highImpact, onChange }) {
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  function updateRow(idx, field, value) {
    const next = highImpact.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange(next);
  }

  function addRow() {
    if (!newKey.trim()) return;
    onChange([...highImpact, { key: newKey.trim(), label: newLabel.trim() }]);
    setNewKey('');
    setNewLabel('');
  }

  function removeRow(idx) {
    onChange(highImpact.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">Ítems de Alto Impacto</h4>
      <div className="space-y-1">
        {highImpact.map((c, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <input
              type="text"
              value={c.key}
              onChange={(e) => updateRow(i, 'key', e.target.value)}
              className="w-36 text-xs font-mono border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="key"
            />
            <input
              type="text"
              value={c.label}
              onChange={(e) => updateRow(i, 'label', e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Etiqueta"
            />
            <button
              onClick={() => removeRow(i)}
              className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRow()}
          className="w-36 text-xs font-mono border border-dashed border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="nuevo_key"
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRow()}
          className="flex-1 text-sm border border-dashed border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Etiqueta del ítem"
        />
        <button
          onClick={addRow}
          className="text-blue-600 hover:text-blue-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── NaRulesSection ─────────────────────────────────────────────────────────

function NaRulesSection({ naRules, general, onChange }) {
  const generalKeys = general.map((c) => c.key).filter(Boolean);

  function toggleKey(group, key) {
    const current = naRules[group] || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    onChange({ ...naRules, [group]: next });
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Reglas N/A — Overrides automáticos</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(NA_RULE_LABELS).map(([group, groupLabel]) => {
          const active = new Set(naRules[group] || []);
          return (
            <div key={group} className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{groupLabel}</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {generalKeys.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Sin criterios generales aún</p>
                )}
                {generalKeys.map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={active.has(key)}
                      onChange={() => toggleKey(group, key)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-400"
                    />
                    <span className="text-xs font-mono text-slate-600">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SaveBar ────────────────────────────────────────────────────────────────

function SaveBar({ general, saving, success, error, onSave }) {
  const total = general.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const valid = total === 100;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
      <div className={`text-sm font-medium ${valid ? 'text-green-600' : 'text-red-500'}`}>
        Suma de pesos: <span className="font-bold">{total}%</span>
        {!valid && <span className="ml-2 text-xs">(debe ser 100)</span>}
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        {success && (
          <span className="text-xs text-green-600 font-medium">Guardado ✓</span>
        )}
        <button
          onClick={onSave}
          disabled={!valid || saving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// ─── CampaignEditor ─────────────────────────────────────────────────────────

function CampaignEditor({ campaignKey, config, saving, success, error, onChange, onSave }) {
  if (!config) return <div className="text-sm text-slate-400 py-4">Cargando...</div>;

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
      <h3 className="text-base font-semibold text-slate-800">{config.label}</h3>

      <GeneralCriteriaTable
        general={config.general}
        onChange={(general) => onChange(campaignKey, { ...config, general })}
      />

      <HighImpactList
        highImpact={config.highImpact}
        onChange={(highImpact) => onChange(campaignKey, { ...config, highImpact })}
      />

      <NaRulesSection
        naRules={config.naRules}
        general={config.general}
        onChange={(naRules) => onChange(campaignKey, { ...config, naRules })}
      />

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Instrucciones Adicionales</h4>
        <textarea
          value={config.specialInstructions || ''}
          onChange={(e) => onChange(campaignKey, { ...config, specialInstructions: e.target.value })}
          rows={4}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          placeholder="Instrucciones especiales que se añaden al final del prompt para esta campaña..."
        />
      </div>

      <SaveBar
        general={config.general}
        saving={saving}
        success={success}
        error={error}
        onSave={() => onSave(campaignKey)}
      />
    </div>
  );
}

// ─── Configuracion (page) ────────────────────────────────────────────────────

export default function Configuracion() {
  const { user } = useAuth();

  // Grupos y campañas filtrados según los client_codes del usuario
  const allowedGroups = GROUPS
    .map((g) => ({
      ...g,
      campaigns: g.campaigns.filter((c) => (user?.client_codes || []).includes(CAMPAIGN_CLIENT[c])),
    }))
    .filter((g) => g.campaigns.length > 0);

  const [activeGroup, setActiveGroup] = useState(() => allowedGroups[0]?.key || '');
  const [configs, setConfigs] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState({});
  const [success, setSuccess] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    criteriaApi.getAll()
      .then((res) => {
        const map = {};
        for (const item of res.data.data) {
          map[item.key] = item;
        }
        setConfigs(map);
      })
      .catch(() => setLoadError('No se pudo cargar la configuración. Verifica tu conexión.'));
  }, []);

  const handleChange = useCallback((key, updated) => {
    setConfigs((prev) => ({ ...prev, [key]: updated }));
  }, []);

  const handleSave = useCallback(async (key) => {
    const cfg = configs[key];
    if (!cfg) return;

    setSaving((s) => ({ ...s, [key]: true }));
    setErrors((e) => ({ ...e, [key]: null }));
    setSuccess((s) => ({ ...s, [key]: false }));

    try {
      await criteriaApi.update(key, {
        general_criteria:     cfg.general,
        high_impact_criteria: cfg.highImpact,
        na_rules:             cfg.naRules,
        special_instructions: cfg.specialInstructions,
      });
      setSuccess((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSuccess((s) => ({ ...s, [key]: false })), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar';
      setErrors((e) => ({ ...e, [key]: msg }));
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }, [configs]);

  const currentGroup = allowedGroups.find((g) => g.key === activeGroup);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Edita las matrices de calidad por campaña</p>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {/* Group tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {allowedGroups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeGroup === g.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Campaign editors for active group */}
      {currentGroup && (
        <div className="space-y-6">
          {currentGroup.campaigns.map((campaignKey) => (
            <CampaignEditor
              key={campaignKey}
              campaignKey={campaignKey}
              config={configs[campaignKey]}
              saving={saving[campaignKey] || false}
              success={success[campaignKey] || false}
              error={errors[campaignKey] || null}
              onChange={handleChange}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
