import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuditDetail from './pages/AuditDetail';
import Auditorias from './pages/Auditorias';
import Agentes from './pages/Agentes';
import AgentDetail from './pages/AgentDetail';
import AgentRecordings from './pages/AgentRecordings';
import Reportes from './pages/Reportes';

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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
