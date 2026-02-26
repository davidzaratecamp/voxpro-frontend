import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import StatsCards from '../components/StatsCards';
import WeekProgress from '../components/WeekProgress';
import { getGreeting } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/audit/summary');
      setSummary(res.data.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = summary?.totals;
  const pending = totals?.pending_review ?? 0;

  const quickLinks = [
    {
      to: '/auditorias',
      label: 'Ver todas las auditorías',
      sublabel: pending > 0 ? `${pending} pendiente${pending !== 1 ? 's' : ''} de revisión` : 'Sin pendientes esta semana',
      border: 'border-blue-100',
      bg: 'bg-blue-50 hover:bg-blue-100',
      dot: 'bg-blue-500',
      text: 'text-blue-800',
      sub: 'text-blue-600',
    },
    {
      to: '/auditorias',
      label: 'Auditorías pendientes',
      sublabel: pending > 0 ? `${pending} sin revisar` : 'Todo al día',
      border: 'border-amber-100',
      bg: 'bg-amber-50 hover:bg-amber-100',
      dot: 'bg-amber-500',
      text: 'text-amber-800',
      sub: 'text-amber-600',
    },
    {
      to: '/agentes',
      label: 'Rendimiento de agentes',
      sublabel: 'Ver métricas individuales',
      border: 'border-indigo-100',
      bg: 'bg-indigo-50 hover:bg-indigo-100',
      dot: 'bg-indigo-500',
      text: 'text-indigo-800',
      sub: 'text-indigo-600',
    },
    {
      to: '/auditorias',
      label: 'Escanear grabaciones',
      sublabel: 'Ir a Auditorías para escanear',
      border: 'border-emerald-100',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
      text: 'text-emerald-800',
      sub: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {getGreeting()}, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-slate-500 mt-1">Panel de auditoría de calidad</p>
      </div>

      <StatsCards totals={totals} />

      <WeekProgress totals={totals} />

      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`flex items-center gap-3 rounded-lg border ${link.border} ${link.bg} px-4 py-3 transition-colors`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${link.dot}`} />
                <div>
                  <p className={`text-sm font-medium ${link.text}`}>{link.label}</p>
                  <p className={`text-xs ${link.sub}`}>{link.sublabel}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
