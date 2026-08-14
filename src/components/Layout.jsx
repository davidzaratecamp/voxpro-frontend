import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../lib/brand';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { CLIENT_LABELS } from '../lib/utils';

export default function Layout() {
  const { user, logout } = useAuth();
  const brand = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const clientLabel = brand
    ? null
    : user?.client_codes?.map((c) => CLIENT_LABELS[c] || c).join(', ');

  const pathname = location.pathname;

  // Nav items
  const AUDITOR_ROLES = ['coordinator', 'formador', 'auditor_obama', 'auditor_claro', 'auditor_lv', 'auditor_reclutamiento', 'coordinator_obama', 'supervisor_calidad', 'viewer_zoom', 'coordinador_avaya'];
  const isAuditor = AUDITOR_ROLES.includes(user?.role);

  const isAvaya = user?.role === 'coordinador_avaya';
  const REALTIME_ROLES = new Set(['auditor', 'coordinator', 'supervisor_calidad', 'formador']);

  const navItems = [
    ...(isAuditor ? [{
      label: 'Inicio',
      to: '/',
      active: pathname === '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: 'Auditorías',
      to: isAvaya ? '/avaya/auditorias' : '/auditorias',
      active: isAvaya
        ? pathname === '/avaya/auditorias' || pathname.startsWith('/audit/')
        : pathname === '/auditorias' || pathname.startsWith('/audit/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      label: 'Agentes',
      to: isAvaya ? '/avaya/agentes' : '/agentes',
      active: isAvaya ? pathname === '/avaya/agentes' : pathname === '/agentes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      label: 'Reportes',
      to: '/reportes',
      active: pathname === '/reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      label: 'Análisis del día',
      to: '/daily-analysis',
      active: pathname === '/daily-analysis',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    }] : []),
    ...(user?.role === 'formador' || user?.role === 'supervisor_calidad' ? [{
      label: user?.role === 'formador' ? 'Mis Agentes OJT' : 'Agentes OJT',
      to: '/ojt/agentes',
      active: pathname === '/ojt/agentes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.63 48.63 0 0112 20.904a48.63 48.63 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
    }] : []),
    ...(user?.role === 'supervisor_calidad' ? [{
      label: 'Head Count',
      to: '/hc',
      active: pathname === '/hc',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      label: 'Configuración',
      to: '/configuracion',
      active: pathname === '/configuracion',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    }] : []),
    ...(user?.role === 'gestor_usuarios' ? [{
      label: 'Usuarios',
      to: '/usuarios',
      active: pathname === '/usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    }] : []),
  ];

  // User initial for avatar
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 px-4 shrink-0">
        <svg className={`w-7 h-7 shrink-0 ${brand ? 'text-indigo-600' : 'text-blue-600'}`} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="28" width="6" height="24" rx="3" fill="currentColor" opacity="0.6" />
          <rect x="22" y="20" width="6" height="40" rx="3" fill="currentColor" opacity="0.8" />
          <rect x="34" y="12" width="6" height="56" rx="3" fill="currentColor" />
          <rect x="46" y="22" width="6" height="36" rx="3" fill="currentColor" opacity="0.8" />
          <rect x="58" y="30" width="6" height="20" rx="3" fill="currentColor" opacity="0.6" />
        </svg>
        <span className="text-lg font-bold text-slate-800">{brand ? brand.appName : 'VoxPro'}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              item.active
                ? (brand ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600')
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 space-y-3">
        {user?.role === 'formador' && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Formador OJT
          </span>
        )}
        {user?.role === 'coordinador_avaya' && (
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            Coordinador Avaya
          </span>
        )}
        {clientLabel && user?.role !== 'formador' && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {clientLabel}
          </span>

        )}
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-semibold shrink-0 ${brand ? 'bg-indigo-600' : 'bg-blue-600'}`}>
            {userInitial}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-slate-700 truncate block">{user?.name}</span>
            {!brand && <span className="text-xs text-slate-400 truncate block">{user?.role}</span>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors w-full"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — mobile (slide-over) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar — desktop (fixed) */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:bg-white lg:border-r lg:border-slate-200">
        {sidebarContent}
      </aside>

      {/* Hamburger button (mobile only) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-20 lg:hidden p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Main content */}
      <main className="lg:ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
}
