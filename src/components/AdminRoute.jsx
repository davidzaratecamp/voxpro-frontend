import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege una ruta para un rol específico.
 * Si el usuario no tiene el rol requerido, redirige a /.
 */
export default function AdminRoute({ children, role }) {
  const { user } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}
