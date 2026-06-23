import { useAuth } from '../context/AuthContext';

// Usernames conocidos del rol viewer_zoom — usados en Login antes de saber el rol
const VIEWER_ZOOM_USERNAMES = new Set(['obamazoom']);

const VIEWER_ZOOM_BRAND = {
  appName: 'Monitor',
  serverLabel: 'Otro Server',
  aiEngine: 'Qualio',
};

export function isViewerZoom(role) {
  return role === 'viewer_zoom';
}

/** Para usar en Login.jsx donde aún no hay sesión — detecta por username */
export function getLoginBrand(username) {
  return VIEWER_ZOOM_USERNAMES.has(username) ? VIEWER_ZOOM_BRAND : null;
}

/** Hook para usar dentro de componentes protegidos (usuario ya autenticado) */
export function useBrand() {
  const { user } = useAuth();
  return isViewerZoom(user?.role) ? VIEWER_ZOOM_BRAND : null;
}
