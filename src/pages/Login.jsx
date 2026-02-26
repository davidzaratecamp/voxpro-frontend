import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Panel Izquierdo — Branding */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 flex-col items-center justify-center px-12 text-white">
        {/* Patrón decorativo de dots */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-md text-center space-y-8">
          {/* Icono de ondas de audio */}
          <div className="animate-fade-in flex justify-center">
            <svg className="w-20 h-20 text-white/90" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="28" width="6" height="24" rx="3" fill="currentColor" opacity="0.6">
                <animate attributeName="height" values="24;36;24" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="y" values="28;22;28" dur="1.2s" repeatCount="indefinite" />
              </rect>
              <rect x="22" y="20" width="6" height="40" rx="3" fill="currentColor" opacity="0.8">
                <animate attributeName="height" values="40;20;40" dur="1s" repeatCount="indefinite" />
                <animate attributeName="y" values="20;30;20" dur="1s" repeatCount="indefinite" />
              </rect>
              <rect x="34" y="12" width="6" height="56" rx="3" fill="currentColor">
                <animate attributeName="height" values="56;28;56" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="y" values="12;26;12" dur="1.4s" repeatCount="indefinite" />
              </rect>
              <rect x="46" y="22" width="6" height="36" rx="3" fill="currentColor" opacity="0.8">
                <animate attributeName="height" values="36;48;36" dur="1.1s" repeatCount="indefinite" />
                <animate attributeName="y" values="22;16;22" dur="1.1s" repeatCount="indefinite" />
              </rect>
              <rect x="58" y="30" width="6" height="20" rx="3" fill="currentColor" opacity="0.6">
                <animate attributeName="height" values="20;32;20" dur="1.3s" repeatCount="indefinite" />
                <animate attributeName="y" values="30;24;30" dur="1.3s" repeatCount="indefinite" />
              </rect>
            </svg>
          </div>

          {/* Título y subtítulo */}
          <div className="animate-fade-in-delay-1">
            <h1 className="text-4xl font-bold tracking-tight">VoxPro</h1>
            <p className="text-lg text-blue-200 mt-2">Sistema de auditoría de calidad</p>
          </div>

          {/* Mini-stats */}
          <div className="space-y-4 animate-fade-in-delay-2">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
              <svg className="w-5 h-5 text-emerald-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-100">Auditoría automatizada</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
              <svg className="w-5 h-5 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm text-blue-100">Análisis en tiempo real</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
              <svg className="w-5 h-5 text-sky-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-sm text-blue-100">Control de calidad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho — Formulario */}
      <div className="flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mini-header branding para mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10 animate-fade-in">
          <svg className="w-8 h-8 text-blue-600" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="28" width="6" height="24" rx="3" fill="currentColor" opacity="0.6" />
            <rect x="22" y="20" width="6" height="40" rx="3" fill="currentColor" opacity="0.8" />
            <rect x="34" y="12" width="6" height="56" rx="3" fill="currentColor" />
            <rect x="46" y="22" width="6" height="36" rx="3" fill="currentColor" opacity="0.8" />
            <rect x="58" y="30" width="6" height="20" rx="3" fill="currentColor" opacity="0.6" />
          </svg>
          <span className="text-xl font-bold text-slate-800">VoxPro</span>
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido</h2>
            <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                  placeholder="nombre de usuario"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Campo contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                  placeholder="contraseña"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">VoxPro v1.0</p>
        </div>
      </div>
    </div>
  );
}
