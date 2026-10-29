import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege una ruta para un rol específico. Si se pasa `clientCode`, también
 * exige que el usuario tenga ese código entre sus client_codes. Si se pasa
 * `flag`, también deja pasar a quien tenga ese permiso (ej. feedback_monitor)
 * aunque su rol no esté en la lista.
 * Si no cumple, redirige a /.
 */
export default function AdminRoute({ children, role, clientCode, flag }) {
  const { user } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user?.role) && !(flag && user?.[flag])) return <Navigate to="/" replace />;
  if (clientCode && !user?.client_codes?.includes(clientCode)) return <Navigate to="/" replace />;
  return children;
}
