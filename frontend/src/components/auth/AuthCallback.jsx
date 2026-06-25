// ─────────────────────────────────────────────────────────────
// CredChain Frontend — OAuth callback handler  (route: /auth/callback)
//
// The backend redirects here after Google sign-in with either:
//   ?token=<jwt>&role=<role>      (success)
//   ?error=<code>                 (declined / misconfigured / failure)
//
// On success it: captures the params → stores the JWT (via AuthContext,
// which also sets the default Axios Authorization header) → redirects to
// the correct portal namespace. On error it shows a friendly message with
// a way back to the login screen.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, PORTAL_HOME } from '../../context/AuthContext';

const ERROR_COPY = {
  google_not_configured:
    'Google sign-in isn’t configured on the server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend .env, or use email & password.',
  access_denied: 'You cancelled the Google sign-in. No problem — try again when ready.',
  invalid_state: 'Your sign-in session expired. Please start again.',
  token_exchange_failed: 'We couldn’t complete the handshake with Google. Please try again.',
  userinfo_failed: 'We couldn’t read your Google profile. Please try again.',
  no_email_from_google: 'Google didn’t share an email address with us, so we can’t create your account.',
  missing_token: 'The sign-in response was incomplete. Please try again.',
  oauth_failed: 'Something went wrong during sign-in. Please try again.',
};

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  // StrictMode double-invokes effects in dev; guard so we only act once.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const errCode = params.get('error');
    if (errCode) {
      setError(errCode);
      return;
    }

    const token = params.get('token');
    const role = params.get('role');
    if (!token) {
      setError('missing_token');
      return;
    }

    const resolved = login(token, null);
    const dest = PORTAL_HOME[role] || PORTAL_HOME[resolved?.role] || '/login';
    navigate(dest, { replace: true });
  }, [params, login, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl ring-1 ring-black/5">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">⚠️</div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Sign-in didn’t complete</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {ERROR_COPY[error] || `Unexpected error: ${error}`}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-gray-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        <p className="text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
