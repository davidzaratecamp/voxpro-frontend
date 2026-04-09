import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/auditorias" element={<Auditorias />} />
            <Route path="/agentes" element={<Agentes />} />
            <Route path="/agentes/:agentId" element={<AgentDetail />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/audit/:id" element={<AuditDetail />} />
            <Route path="/agent-recordings/:agentId" element={<AgentRecordings />} />
            <Route path="/ojt/agentes" element={<OJTAgentes />} />
            <Route path="/avaya/agentes" element={<AvayaAgentes />} />
            <Route path="/avaya/auditorias" element={<AvayaAuditorias />} />
            <Route path="/realtime" element={<RealtimeMonitor />} />
            <Route
              path="/configuracion"
              element={
                <AdminRoute role="supervisor_calidad">
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
