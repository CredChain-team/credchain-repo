// ─────────────────────────────────────────────────────────────
// CredChain Frontend — Role-Based Access Control wrapper
// Reads the JWT role from AuthContext and gates a portal namespace:
//   • not authenticated      → bounce to /login (remember where we came from)
//   • authenticated, wrong role → bounce to the user's OWN portal home
//   • authenticated, right role → render the protected tree
// ─────────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, PORTAL_HOME } from '../../context/AuthContext';

export default function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allow && role !== allow) {
    const home = PORTAL_HOME[role] || '/login';
    return <Navigate to={home} replace />;
  }

  return children;
}
