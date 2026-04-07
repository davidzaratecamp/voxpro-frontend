import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/users';

const ROLES = [
  { value: 'coordinator',        label: 'Coordinador' },
  { value: 'formador',           label: 'Formador OJT' },
  { value: 'coordinador_avaya',  label: 'Coordinador Avaya' },
  { value: 'supervisor_calidad', label: 'Supervisor Calidad' },
  { value: 'gestor_usuarios',    label: 'Gestor Usuarios' },
];

const CLIENT_CODES = [
  { value: 'obama',      label: 'Obama' },
  { value: 'claro_wcb',  label: 'Claro WCB' },
  { value: 'claro_hogar',label: 'Claro Hogar' },
  { value: 'claro_tyt',  label: 'Claro TyT' },
  { value: 'lv',         label: 'Vital' },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));
const ROLE_COLORS = {
  coordinator:        'bg-blue-100 text-blue-700',
  formador:           'bg-amber-100 text-amber-700',
  coordinador_avaya:  'bg-violet-100 text-violet-700',
  supervisor_calidad: 'bg-indigo-100 text-indigo-700',
  gestor_usuarios:    'bg-pink-100 text-pink-700',
};

const EMPTY_FORM = {
  username: '',
  password: '',
  name: '',
  role: 'coordinator',
  client_codes: [],
  active: true,
};

// ─── Modal ──────────────────────────────────────────────────────────────────

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState(
    isEdit
      ? { ...user, password: '', client_codes: user.client_codes || [] }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCode(code) {
    setForm((f) => ({
      ...f,
      client_codes: f.client_codes.includes(code)
        ? f.client_codes.filter((c) => c !== code)
        : [...f.client_codes, code],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await usersApi.update(user.id, payload);
      } else {
        await usersApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Nombre del usuario"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuario</label>
            <input
              type="text"
              required={!isEdit}
              disabled={isEdit}
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="nombre_usuario"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Contraseña {isEdit && <span className="text-slate-400 font-normal">(dejar en blanco para no cambiar)</span>}
            </label>
            <input
              type="password"
              required={!isEdit}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
              placeholder={isEdit ? '••••••••' : 'Contraseña'}
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setField('role', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Clientes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Clientes autorizados</label>
            <div className="flex flex-wrap gap-2">
              {CLIENT_CODES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCode(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.client_codes.includes(c.value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activo */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-400"
            />
            <span className="text-sm text-slate-700">Usuario activo</span>
          </label>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || form.client_codes.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Usuarios (page) ─────────────────────────────────────────────────────────

const EMPTY_FILTERS = { search: '', role: '', client: '', status: '' };

export default function Usuarios() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal]       = useState(null);
  const [filters, setFilters]   = useState(EMPTY_FILTERS);

  const load = useCallback(() => {
    setLoading(true);
    usersApi.getAll()
      .then((res) => setUsers(res.data.data))
      .catch(() => setLoadError('No se pudo cargar la lista de usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(user) {
    try {
      await usersApi.toggleActive(user.id);
      setUsers((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u)
      );
    } catch {
      // silent fail
    }
  }

  function handleSaved() {
    setModal(null);
    load();
  }

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const filtered = users.filter((u) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
    }
    if (filters.role   && u.role !== filters.role) return false;
    if (filters.client && !(u.client_codes || []).includes(filters.client)) return false;
    if (filters.status === 'active'   && !u.active) return false;
    if (filters.status === 'inactive' &&  u.active) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de cuentas y roles</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Búsqueda texto */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Buscar por nombre o usuario..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Rol */}
        <select
          value={filters.role}
          onChange={(e) => setFilter('role', e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 bg-white text-slate-600"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {/* Cliente */}
        <select
          value={filters.client}
          onChange={(e) => setFilter('client', e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 bg-white text-slate-600"
        >
          <option value="">Todos los clientes</option>
          {CLIENT_CODES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 bg-white text-slate-600"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        {/* Limpiar */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      {/* Contador */}
      {!loading && (
        <p className="text-xs text-slate-400 -mt-3">
          {filtered.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Cargando usuarios...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Clientes</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {hasActiveFilters ? 'Sin resultados para los filtros aplicados' : 'No hay usuarios registrados'}
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.client_codes || []).map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          {CLIENT_CODES.find((x) => x.value === c)?.label || c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        u.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {u.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModal(u)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
