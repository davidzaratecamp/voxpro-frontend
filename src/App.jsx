import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IAAuditorias from './pages/IAAuditorias';
import IAConfiguracion from './pages/IAConfiguracion';
import IAAnalisis from './pages/IAAnalisis';
import AuditDetail from './pages/AuditDetail';
import Auditorias from './pages/Auditorias';
import Agentes from './pages/Agentes';
import AgentDetail from './pages/AgentDetail';
import AgentRecordings from './pages/AgentRecordings';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import OJTAgentes from './pages/OJTAgentes';
import AvayaAgentes from './pages/AvayaAgentes';
import AvayaAuditorias from './pages/AvayaAuditorias';
import RealtimeMonitor from './pages/RealtimeMonitor';
import HC from './pages/HC';
import DailyAnalysis from './pages/DailyAnalysis';
import SofiaHumanAuditorias from './pages/SofiaHumanAuditorias';
import SofiaHumanDetail from './pages/SofiaHumanDetail';
import SofiaAnalisis from './pages/SofiaAnalisis';

function Home() {
  const { user } = useAuth();
  if (user?.role === 'auditor_ia') return <Navigate to="/ia/auditorias" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/auditorias" element={<Auditorias />} />
            <Route path="/agentes" element={<Agentes />} />
            <Route path="/agentes/:agentId" element={<AgentDetail />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/audit/:id" element={<AuditDetail />} />
            <Route path="/agent-recordings/:agentId" element={<AgentRecordings />} />
            <Route path="/ojt/agentes" element={<OJTAgentes />} />
            <Route path="/ia/auditorias" element={<IAAuditorias />} />
            <Route
              path="/ia/analisis"
              element={
                <AdminRoute role={['auditor_ia', 'gestor_usuarios']}>
                  <IAAnalisis />
                </AdminRoute>
              }
            />
            <Route
              path="/ia/configuracion"
              element={
                <AdminRoute role={['auditor_ia', 'gestor_usuarios']}>
                  <IAConfiguracion />
                </AdminRoute>
              }
            />
            <Route
              path="/sofia-ia"
              element={
                <AdminRoute role={['supervisor_calidad', 'gestor_usuarios', 'auditor_ia']}>
                  <SofiaHumanAuditorias />
                </AdminRoute>
              }
            />
            <Route
              path="/sofia-ia/:id"
              element={
                <AdminRoute role={['supervisor_calidad', 'gestor_usuarios', 'auditor_ia']}>
                  <SofiaHumanDetail />
                </AdminRoute>
              }
            />
            <Route
              path="/sofia-ia/analisis"
              element={
                <AdminRoute role={['supervisor_calidad', 'gestor_usuarios', 'auditor_ia']}>
                  <SofiaAnalisis />
                </AdminRoute>
              }
            />
            <Route path="/avaya/agentes" element={<AvayaAgentes />} />
            <Route path="/avaya/auditorias" element={<AvayaAuditorias />} />
            <Route path="/realtime" element={<RealtimeMonitor />} />
            <Route path="/daily-analysis" element={<DailyAnalysis />} />
            <Route path="/hc" element={<HC />} />
            <Route
              path="/configuracion"
              element={
                <AdminRoute role={['supervisor_calidad', 'viewer_zoom']}>
                  <Configuracion />
                </AdminRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <AdminRoute role="gestor_usuarios">
                  <Usuarios />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
