import { useState, useEffect, useCallback, Fragment } from 'react';
import { criteriaApi } from '../api/criteria';
import { useAuth } from '../context/AuthContext';

const GROUPS = [
  { key: 'claro',         label: 'Claro',         campaigns: ['claro_wcb', 'claro_movil', 'claro_pymes', 'claro_hogar', 'claro_tyt'] },
  { key: 'obama',         label: 'Obama',         campaigns: ['obama_ventas', 'obama_customer'] },
  { key: 'lv',           label: 'Vital',          campaigns: ['lv_ventas', 'lv_customer'] },
  { key: 'reclutamiento', label: 'Reclutamiento', campaigns: ['reclutamiento'] },
];

// Qué client_code necesita cada campaña para ser visible
const CAMPAIGN_CLIENT = {
  claro_wcb:      'claro_wcb',
  claro_movil:    'claro_wcb',
  claro_pymes:    'claro_wcb',
  claro_hogar:    'claro_hogar',
  claro_tyt:      'claro_tyt',
  obama_ventas:   'obama',
  obama_customer: 'obama',
  lv_ventas:      'lv',
  lv_customer:    'lv',
  reclutamiento:  'reclutamiento',
};

const NA_RULE_LABELS = {
  third_party:  'Tercero (no titular)',
  dropped_call: 'Llamada cortada',
  rejection:    'Rechazo del cliente',
  always_na:    'Siempre N/A (no verificable por audio)',
};

// ─── GeneralCriteriaTable ───────────────────────────────────────────────────

function GeneralCriteriaTable({ general, onChange }) {
  const [expanded, setExpanded] = useState(new Set());
  const total = general.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  function updateRow(idx, field, value) {
    const next = general.map((c, i) =>
      i === idx ? { ...c, [field]: field === 'weight' ? Number(value) : value } : c
    );
    onChange(next);
  }

  function addRow() {
    onChange([...general, { key: '', label: '', weight: 0, description: '' }]);
  }

  function removeRow(idx) {
    setExpanded((prev) => { const s = new Set(prev); s.delete(idx); return s; });
    onChange(general.filter((_, i) => i !== idx));
  }

  function toggleExpand(idx) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700">Criterios Generales</h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${total === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          Total: {total}%
        </span>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Key</th>
              <th className="px-3 py-2 text-left font-medium">Etiqueta</th>
              <th className="px-3 py-2 text-right font-medium w-20">Peso %</th>
              <th className="px-2 py-2 w-7"></th>
              <th className="px-2 py-2 w-7"></th>
            </tr>
          </thead>
          <tbody>
            {general.map((c, i) => (
              <Fragment key={i}>
                <tr className={`border-t border-slate-100 hover:bg-slate-50 ${expanded.has(i) ? 'bg-blue-50/40' : 'bg-white'}`}>
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
                      onClick={() => toggleExpand(i)}
                      title={expanded.has(i) ? 'Ocultar descripción' : 'Editar descripción'}
                      className={`transition-colors ${c.description?.trim() ? 'text-blue-400 hover:text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${expanded.has(i) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {expanded.has(i) && (
                  <tr className="bg-blue-50/30 border-t border-blue-100">
                    <td colSpan={5} className="px-4 py-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        Descripción para la IA — ¿cómo debe evaluar este criterio?
                      </label>
                      <textarea
                        value={c.description || ''}
                        onChange={(e) => updateRow(i, 'description', e.target.value)}
                        rows={3}
                        placeholder="Ej: El agente debe confirmar verbalmente la aceptación del cliente antes de proceder al contrato. Si el cliente no dio un 'sí' explícito, no cumple."
                        className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-y bg-white"
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
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
  const [expanded, setExpanded] = useState(new Set());

  function updateRow(idx, field, value) {
    const next = highImpact.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange(next);
  }

  function addRow() {
    if (!newKey.trim()) return;
    onChange([...highImpact, { key: newKey.trim(), label: newLabel.trim(), description: '' }]);
    setNewKey('');
    setNewLabel('');
  }

  function removeRow(idx) {
    setExpanded((prev) => { const s = new Set(prev); s.delete(idx); return s; });
    onChange(highImpact.filter((_, i) => i !== idx));
  }

  function toggleExpand(idx) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">Ítems de Alto Impacto</h4>
      <div className="space-y-1">
        {highImpact.map((c, i) => (
          <Fragment key={i}>
            <div className={`flex items-center gap-2 group rounded-lg px-1 ${expanded.has(i) ? 'bg-blue-50/40' : ''}`}>
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
                onClick={() => toggleExpand(i)}
                title={expanded.has(i) ? 'Ocultar descripción' : 'Editar descripción'}
                className={`transition-colors shrink-0 ${c.description?.trim() ? 'text-blue-400 hover:text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${expanded.has(i) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button
                onClick={() => removeRow(i)}
                className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {expanded.has(i) && (
              <div className="ml-1 pl-3 border-l-2 border-blue-200 pb-1">
                <label className="block text-xs text-slate-500 mb-1">
                  Descripción para la IA — ¿cuándo se considera falta grave?
                </label>
                <textarea
                  value={c.description || ''}
                  onChange={(e) => updateRow(i, 'description', e.target.value)}
                  rows={3}
                  placeholder="Ej: Solo aplica si el agente usa groserías, insultos o lenguaje degradante de forma directa hacia el cliente. No aplica si simplemente faltó amabilidad."
                  className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-y bg-white"
                />
              </div>
            )}
          </Fragment>
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
        <button onClick={addRow} className="text-blue-600 hover:text-blue-700 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── NaRulesSection ─────────────────────────────────────────────────────────

function NaGroupPanel({ group, groupLabel, isCustom, naRules, generalKeys, generalKeySet, highImpactKeys, highImpactKeySet, onChange, onRemoveGroup }) {
  const active = new Set(naRules[group] || []);
  const knownKeySet = new Set([...generalKeys, ...highImpactKeys]);
  const extraKeys = (naRules[group] || []).filter((k) => !knownKeySet.has(k));

  function toggleKey(key) {
    const current = naRules[group] || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    onChange({ ...naRules, [group]: next });
  }

  function removeKey(key) {
    onChange({ ...naRules, [group]: (naRules[group] || []).filter((k) => k !== key) });
  }

  const hasAnything = generalKeys.length > 0 || highImpactKeys.length > 0 || extraKeys.length > 0;

  return (
    <div className={`border rounded-lg p-3 ${isCustom ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${isCustom ? 'text-orange-600' : 'text-slate-500'}`}>
          {groupLabel}
          {isCustom && <span className="ml-1 normal-case font-normal text-orange-400">(personalizado)</span>}
        </p>
        {isCustom && (
          <button onClick={onRemoveGroup} className="text-slate-300 hover:text-red-400 transition-colors" title="Eliminar grupo">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {!hasAnything && (
          <p className="text-xs text-slate-400 italic">Sin items aún</p>
        )}

        {generalKeys.length > 0 && (
          <>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium px-1 pt-1">Criterios generales</p>
            {generalKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={active.has(key)}
                  onChange={() => toggleKey(key)}
                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-400"
                />
                <span className="text-xs font-mono text-slate-600">{key}</span>
              </label>
            ))}
          </>
        )}

        {highImpactKeys.length > 0 && (
          <>
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium px-1 pt-2">Alto impacto</p>
            {highImpactKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-amber-50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={active.has(key)}
                  onChange={() => toggleKey(key)}
                  className="w-3.5 h-3.5 rounded text-amber-500 border-slate-300 focus:ring-amber-400"
                />
                <span className="text-xs font-mono text-amber-700">{key}</span>
              </label>
            ))}
          </>
        )}

        {extraKeys.length > 0 && (
          <>
            <p className="text-xs text-purple-400 uppercase tracking-wide font-medium px-1 pt-2">Otros</p>
            {extraKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 px-1 py-0.5 group">
                <input type="checkbox" checked readOnly className="w-3.5 h-3.5 rounded text-purple-600 border-slate-300" />
                <span className="text-xs font-mono text-purple-700 flex-1">{key}</span>
                <button onClick={() => removeKey(key)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function NaRulesSection({ naRules, general, highImpact, onChange }) {
  const generalKeys = general.map((c) => c.key).filter(Boolean);
  const generalKeySet = new Set(generalKeys);
  const highImpactKeys = (highImpact || []).map((c) => c.key).filter(Boolean);
  const highImpactKeySet = new Set(highImpactKeys);
  const [newKeys, setNewKeys] = useState({});
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');

  const customGroups = naRules._custom_groups || [];

  function addCustomGroup() {
    const key = newGroupKey.trim().replace(/\s+/g, '_');
    const label = newGroupLabel.trim();
    if (!key || !label) return;
    if (customGroups.find((g) => g.key === key) || NA_RULE_LABELS[key]) return;
    onChange({ ...naRules, _custom_groups: [...customGroups, { key, label }], [key]: [] });
    setNewGroupKey('');
    setNewGroupLabel('');
  }

  function removeCustomGroup(groupKey) {
    const { [groupKey]: _removed, ...rest } = naRules;
    onChange({ ...rest, _custom_groups: customGroups.filter((g) => g.key !== groupKey) });
  }

  const sharedProps = { naRules, generalKeys, generalKeySet, highImpactKeys, highImpactKeySet, onChange };

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Reglas N/A — Overrides automáticos</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(NA_RULE_LABELS).map(([group, groupLabel]) => (
          <NaGroupPanel key={group} group={group} groupLabel={groupLabel} isCustom={false} {...sharedProps} />
        ))}
        {customGroups.map(({ key: group, label: groupLabel }) => (
          <NaGroupPanel key={group} group={group} groupLabel={groupLabel} isCustom={true} onRemoveGroup={() => removeCustomGroup(group)} {...sharedProps} />
        ))}
      </div>

      {/* Agregar nuevo grupo */}
      <div className="mt-4 p-3 border border-dashed border-orange-300 rounded-lg bg-orange-50/20">
        <p className="text-xs font-medium text-orange-600 mb-2">Agregar nuevo caso N/A</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newGroupKey}
            onChange={(e) => setNewGroupKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomGroup()}
            placeholder="key_del_caso"
            className="w-36 text-xs font-mono border border-orange-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-orange-400 bg-white"
          />
          <input
            type="text"
            value={newGroupLabel}
            onChange={(e) => setNewGroupLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomGroup()}
            placeholder="Etiqueta del caso (ej: Llamada de prueba)"
            className="flex-1 text-sm border border-orange-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-orange-400 bg-white"
          />
          <button onClick={addCustomGroup} className="text-orange-600 hover:text-orange-700 shrink-0" title="Crear grupo">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InstructionsAccordion ──────────────────────────────────────────────────

function InstructionsAccordion({ instructions, onChange }) {
  function addSection() {
    onChange([...instructions, { id: Date.now(), title: '', body: '', open: true }]);
  }

  function removeSection(id) {
    onChange(instructions.filter((s) => s.id !== id));
  }

  function update(id, field, value) {
    onChange(instructions.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function toggle(id) {
    onChange(instructions.map((s) => (s.id === id ? { ...s, open: !s.open } : s)));
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">Instrucciones Adicionales</h4>
      <p className="text-xs text-slate-400 mb-3">
        Cada sección se inyecta al prompt de Gemini con su título como encabezado. Solo se envían las secciones con contenido.
      </p>

      <div className="space-y-2">
        {instructions.length === 0 && (
          <p className="text-xs text-slate-400 italic py-2">Sin instrucciones. Agrega una sección para personalizar la evaluación.</p>
        )}

        {instructions.map((section) => (
          <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 cursor-pointer select-none"
              onClick={() => toggle(section.id)}
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${section.open ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <input
                type="text"
                value={section.title}
                onChange={(e) => update(section.id, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Título de la sección (ej: Cierre Comercial)"
                className="flex-1 text-sm font-medium bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
              />
              {section.body?.trim() && (
                <span className="text-xs text-blue-500 shrink-0">● activa</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            {section.open && (
              <textarea
                value={section.body}
                onChange={(e) => update(section.id, 'body', e.target.value)}
                rows={4}
                placeholder="Escribe aquí la instrucción para Gemini sobre este criterio o situación..."
                className="w-full text-sm border-0 border-t border-slate-200 px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-y"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSection}
        className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Agregar sección
      </button>
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
        highImpact={config.highImpact}
        onChange={(naRules) => onChange(campaignKey, { ...config, naRules })}
      />

      <InstructionsAccordion
        instructions={config.specialInstructions || []}
        onChange={(specialInstructions) => onChange(campaignKey, { ...config, specialInstructions })}
      />

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
          // Añadir id y open (campos UI) a cada sección de instrucciones
          map[item.key] = {
            ...item,
            specialInstructions: (item.specialInstructions || []).map((s, i) => ({
              ...s,
              id: i + 1,
              open: false,
            })),
          };
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
        special_instructions: JSON.stringify(
          (cfg.specialInstructions || [])
            .filter((s) => s.title?.trim() || s.body?.trim())
            .map(({ title, body }) => ({ title, body }))
        ),
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
