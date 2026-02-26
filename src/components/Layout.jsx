import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { CLIENT_LABELS } from '../lib/utils';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const clientLabel = user?.client_codes
    ?.map((c) => CLIENT_LABELS[c] || c)
    .join(', ');

  const pathname = location.pathname;

  // Nav items
  const navItems = [
    {
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
      to: '/auditorias',
      active: pathname === '/auditorias' || pathname.startsWith('/audit/'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      label: 'Agentes',
      to: '/agentes',
      active: pathname === '/agentes',
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
  ];

  // User initial for avatar
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 px-4 shrink-0">
        <svg className="w-7 h-7 text-blue-600 shrink-0" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="28" width="6" height="24" rx="3" fill="currentColor" opacity="0.6" />
          <rect x="22" y="20" width="6" height="40" rx="3" fill="currentColor" opacity="0.8" />
          <rect x="34" y="12" width="6" height="56" rx="3" fill="currentColor" />
          <rect x="46" y="22" width="6" height="36" rx="3" fill="currentColor" opacity="0.8" />
          <rect x="58" y="30" width="6" height="20" rx="3" fill="currentColor" opacity="0.6" />
        </svg>
        <span className="text-lg font-bold text-slate-800">VoxPro</span>
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
                ? 'bg-blue-50 text-blue-600'
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
        {clientLabel && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {clientLabel}
          </span>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold shrink-0">
            {userInitial}
          </div>
          <span className="text-sm font-medium text-slate-700 truncate">{user?.name}</span>
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
