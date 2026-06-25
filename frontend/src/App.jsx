// ─────────────────────────────────────────────────────────────
// CredChain Frontend — route table + RBAC
// Public:  /login  /register  /auth/callback
// Gated :  /student/*   /employer/*   /issuer/*   (role-enforced)
// The root "/" sends signed-in users to their portal, everyone else to login.
// ─────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, PORTAL_HOME } from './context/AuthContext';
import AuthPage from './components/auth/AuthPage';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import StudentPortal from './portals/StudentPortal';
import EmployerPortal from './portals/EmployerPortal';
import IssuerPortal from './portals/IssuerPortal';
import PublicIssuerRegistry from './portals/public/PublicIssuerRegistry';
import EquityImpactDashboard from './portals/public/EquityImpactDashboard';
import PublicVerify from './portals/public/PublicVerify';
import AdminPanel from './portals/AdminPanel';
import LandingPage from './pages/LandingPage';

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) return <Navigate to={PORTAL_HOME[role] || '/login'} replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Public, logged-out trust infrastructure */}
      <Route path="/registry" element={<PublicIssuerRegistry />} />
      <Route path="/impact" element={<EquityImpactDashboard />} />
      <Route path="/verify/student/:credchainId" element={<PublicVerify />} />

      {/* Student namespace */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allow="student">
            <StudentPortal />
          </ProtectedRoute>
        }
      />

      {/* Employer namespace */}
      <Route
        path="/employer/*"
        element={
          <ProtectedRoute allow="employer">
            <EmployerPortal />
          </ProtectedRoute>
        }
      />

      {/* Issuer namespace */}
      <Route
        path="/issuer/*"
        element={
          <ProtectedRoute allow="issuer">
            <IssuerPortal />
          </ProtectedRoute>
        }
      />

      {/* Platform admin panel (any authenticated user; API enforces admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* Unknown → root resolver */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
