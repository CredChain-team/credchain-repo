// ─────────────────────────────────────────────────────────────
// CredChain Frontend — API service
// A single global Axios instance targeting the backend (port 5000),
// plus a named async wrapper for every one of the 14 endpoints.
// Each wrapper includes a try/catch with error logging.
// ─────────────────────────────────────────────────────────────

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Global Axios instance.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('credchain_token')) || null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server rejects our token (401), the session is no longer valid —
// drop the stored token so the UI falls back to the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('credchain_token');
      }
      console.warn('session expired');
    }
    return Promise.reject(error);
  }
);

// Shared error logger — keeps every wrapper consistent.
function logError(scope, error) {
  if (error.response) {
    console.error(`[api:${scope}] ${error.response.status}`, error.response.data);
  } else if (error.request) {
    console.error(`[api:${scope}] no response from server`, error.message);
  } else {
    console.error(`[api:${scope}] request error`, error.message);
  }
}

// ── Health ───────────────────────────────────────────────────
export async function healthCheck() {
  try {
    const { data } = await api.get('/health');
    return data;
  } catch (error) {
    logError('healthCheck', error);
    throw error;
  }
}

// ── AUTH ─────────────────────────────────────────────────────

// POST /api/auth/register
export async function register(payload) {
  try {
    const { data } = await api.post('/api/auth/register', payload);
    return data;
  } catch (error) {
    logError('register', error);
    throw error;
  }
}

// POST /api/auth/login
export async function login(payload) {
  try {
    const { data } = await api.post('/api/auth/login', payload);
    return data;
  } catch (error) {
    logError('login', error);
    throw error;
  }
}

// POST /api/v1/auth/demo — one-click demo sign-in (DEMO_MODE only)
export async function demoLogin(role = 'student') {
  try {
    const { data } = await api.post('/api/v1/auth/demo', { role });
    return data;
  } catch (error) {
    logError('demoLogin', error);
    throw error;
  }
}

// ── USERS / STUDENTS ─────────────────────────────────────────

// GET /api/student/:id
export async function getStudent(id) {
  try {
    const { data } = await api.get(`/api/student/${id}`);
    return data;
  } catch (error) {
    logError('getStudent', error);
    throw error;
  }
}

// PUT /api/student/profile
export async function updateStudentProfile(payload) {
  try {
    const { data } = await api.put('/api/student/profile', payload);
    return data;
  } catch (error) {
    logError('updateStudentProfile', error);
    throw error;
  }
}

// GET /api/student/profile/:credchainId
export async function getPublicProfile(credchainId) {
  try {
    const { data } = await api.get(`/api/student/profile/${credchainId}`);
    return data;
  } catch (error) {
    logError('getPublicProfile', error);
    throw error;
  }
}

// ── ISSUING ──────────────────────────────────────────────────

// POST /api/issuer/verify
export async function verifyIssuer(payload) {
  try {
    const { data } = await api.post('/api/issuer/verify', payload);
    return data;
  } catch (error) {
    logError('verifyIssuer', error);
    throw error;
  }
}

// POST /api/issuer/issueCredential
export async function issueCredential(payload) {
  try {
    const { data } = await api.post('/api/issuer/issueCredential', payload);
    return data;
  } catch (error) {
    logError('issueCredential', error);
    throw error;
  }
}

// ── VALIDATION (accept / reject) ─────────────────────────────

// POST /api/credential/accept/:id
export async function acceptCredential(id, payload = {}) {
  try {
    const { data } = await api.post(`/api/credential/accept/${id}`, payload);
    return data;
  } catch (error) {
    logError('acceptCredential', error);
    throw error;
  }
}

// POST /api/credential/reject/:id
export async function rejectCredential(id, payload = {}) {
  try {
    const { data } = await api.post(`/api/credential/reject/${id}`, payload);
    return data;
  } catch (error) {
    logError('rejectCredential', error);
    throw error;
  }
}

// ── CHAT ─────────────────────────────────────────────────────

// POST /api/chat/send
export async function sendChatMessage(payload) {
  try {
    const { data } = await api.post('/api/chat/send', payload);
    return data;
  } catch (error) {
    logError('sendChatMessage', error);
    throw error;
  }
}

// GET /api/chat/history/:userId
export async function getChatHistory(userId) {
  try {
    const { data } = await api.get(`/api/chat/history/${userId}`);
    return data;
  } catch (error) {
    logError('getChatHistory', error);
    throw error;
  }
}

// ── AI PROXY ─────────────────────────────────────────────────

// POST /api/ai/generateCV  (backend → ai-cv-engine :8001)
export async function generateCV(payload) {
  try {
    const { data } = await api.post('/api/ai/generateCV', payload);
    return data;
  } catch (error) {
    logError('generateCV', error);
    throw error;
  }
}

// POST /api/ai/analyzeSkills  (backend → ai-insights-engine :8002)
export async function analyzeSkills(payload) {
  try {
    const { data } = await api.post('/api/ai/analyzeSkills', payload);
    return data;
  } catch (error) {
    logError('analyzeSkills', error);
    throw error;
  }
}

// ── AUTH: Google OAuth (server-driven redirect) ─────────────
// The "Sign in with Google" button navigates the WHOLE browser here (not an
// XHR) so Google's consent screen can take over; the role rides in the query.
export function googleAuthUrl(role) {
  return `${API_BASE_URL}/api/v1/auth/google?role=${encodeURIComponent(role || 'student')}`;
}

// ── /api/v1 — Issuer verification funnel (System 3) ──────────

// POST /api/v1/issuer/register-step-one  → { institutionType, email? }
export async function registerIssuerStepOne(payload) {
  try {
    const { data } = await api.post('/api/v1/issuer/register-step-one', payload);
    return data;
  } catch (error) {
    logError('registerIssuerStepOne', error);
    throw error;
  }
}

// POST /api/v1/issuer/verify-domain  (reads the live DNS TXT record)
export async function verifyIssuerDomain(payload = {}) {
  try {
    const { data } = await api.post('/api/v1/issuer/verify-domain', payload);
    return data;
  } catch (error) {
    logError('verifyIssuerDomain', error);
    throw error;
  }
}

// POST /api/v1/issuer/kyc/submit
export async function submitIssuerKyc(payload = {}) {
  try {
    const { data } = await api.post('/api/v1/issuer/kyc/submit', payload);
    return data;
  } catch (error) {
    logError('submitIssuerKyc', error);
    throw error;
  }
}

// ── /api/v1 — Two-Tier Trust portfolio (System 1) ────────────

// GET /api/v1/student/:userId/portfolio
export async function getStudentPortfolio(userId) {
  try {
    const { data } = await api.get(`/api/v1/student/${userId}/portfolio`);
    return data;
  } catch (error) {
    logError('getStudentPortfolio', error);
    throw error;
  }
}

// POST /api/v1/student/sandbox-skill  → { skillName, source, link }
export async function addSandboxSkill(payload) {
  try {
    const { data } = await api.post('/api/v1/student/sandbox-skill', payload);
    return data;
  } catch (error) {
    logError('addSandboxSkill', error);
    throw error;
  }
}

// ── /api/v1 — Vouch economy (self-upload trust bridge) ───────

// POST /api/v1/student/:studentId/sandbox/:skillIndex/vouch  (any authed user ≥60 rep)
export async function vouchSandboxSkill(studentId, skillIndex) {
  try {
    const { data } = await api.post(`/api/v1/student/${studentId}/sandbox/${skillIndex}/vouch`, {});
    return data;
  } catch (error) {
    logError('vouchSandboxSkill', error);
    throw error;
  }
}

// POST /api/v1/attested/:studentId/:attestedIndex/dispute  (owning student)
export async function disputeAttestation(studentId, attestedIndex, reason) {
  try {
    const { data } = await api.post(`/api/v1/attested/${studentId}/${attestedIndex}/dispute`, { reason });
    return data;
  } catch (error) {
    logError('disputeAttestation', error);
    throw error;
  }
}

// GET /api/v1/issuers/directory  (any authed user) → verified issuers only
export async function getIssuerDirectory() {
  try {
    const { data } = await api.get('/api/v1/issuers/directory');
    return data;
  } catch (error) {
    logError('getIssuerDirectory', error);
    throw error;
  }
}

// POST /api/v1/issuers/directory/request  → { institutionName, website?, note? }
export async function requestInstitution(payload) {
  try {
    const { data } = await api.post('/api/v1/issuers/directory/request', payload);
    return data;
  } catch (error) {
    logError('requestInstitution', error);
    throw error;
  }
}

// GET /api/v1/admin/institution-requests  (admin) → ranked demand list
export async function getInstitutionRequests() {
  try {
    const { data } = await api.get('/api/v1/admin/institution-requests');
    return data;
  } catch (error) {
    logError('getInstitutionRequests', error);
    throw error;
  }
}

// POST /api/v1/admin/institution-requests/:id/resolve  (admin) → { status }
export async function resolveInstitutionRequest(id, status) {
  try {
    const { data } = await api.post(`/api/v1/admin/institution-requests/${id}/resolve`, { status });
    return data;
  } catch (error) {
    logError('resolveInstitutionRequest', error);
    throw error;
  }
}

// ── /api/v1 — Issuance + revocation (System 7) ───────────────

// POST /api/v1/issuer/credentials  → { title, recipientEmail?, studentId? }
export async function issueVerifiedCredential(payload) {
  try {
    const { data } = await api.post('/api/v1/issuer/credentials', payload);
    return data;
  } catch (error) {
    logError('issueVerifiedCredential', error);
    throw error;
  }
}

// POST /api/v1/credential/:id/revoke
export async function revokeCredential(id) {
  try {
    const { data } = await api.post(`/api/v1/credential/${id}/revoke`, {});
    return data;
  } catch (error) {
    logError('revokeCredential', error);
    throw error;
  }
}

// ── /api/v1 — Async bulk upload (System 2) ───────────────────

// POST /api/v1/issuer/credentials/bulk  → { csv: string }
export async function bulkUploadCredentials(csv) {
  try {
    const { data } = await api.post('/api/v1/issuer/credentials/bulk', { csv });
    return data;
  } catch (error) {
    logError('bulkUploadCredentials', error);
    throw error;
  }
}

// ── /api/v1 — AI gateway (System 4) ──────────────────────────

// POST /api/v1/ai/generate-verified-cv  → streams a PDF (returns a Blob).
export async function generateVerifiedCv(payload = {}) {
  try {
    const res = await api.post('/api/v1/ai/generate-verified-cv', payload, {
      responseType: 'blob',
    });
    return res.data; // Blob
  } catch (error) {
    logError('generateVerifiedCv', error);
    throw error;
  }
}

// POST /api/v1/ai/sync-telemetry
export async function syncTelemetry(payload = {}) {
  try {
    const { data } = await api.post('/api/v1/ai/sync-telemetry', payload);
    return data;
  } catch (error) {
    logError('syncTelemetry', error);
    throw error;
  }
}

// ── /api/v1 — Anti-spam chat (System 6) ──────────────────────

// POST /api/v1/chat/initialize  → { recipientId, contextCredentialId?, text? }
export async function initializeChat(payload) {
  try {
    const { data } = await api.post('/api/v1/chat/initialize', payload);
    return data;
  } catch (error) {
    logError('initializeChat', error);
    throw error;
  }
}

// POST /api/v1/chat/:roomId/message  → { text }
export async function sendChatMessageV1(roomId, text) {
  try {
    const { data } = await api.post(`/api/v1/chat/${roomId}/message`, { text });
    return data;
  } catch (error) {
    logError('sendChatMessageV1', error);
    throw error;
  }
}

// POST /api/v1/chat/:roomId/message handled by sendChatMessageV1 above.

// GET /api/v1/chat/rooms  → conversations the caller participates in.
export async function getChatRooms() {
  try {
    const { data } = await api.get('/api/v1/chat/rooms');
    return data;
  } catch (error) {
    logError('getChatRooms', error);
    throw error;
  }
}

// GET /api/v1/employer/talent-feed  → real students + chat credits.
export async function getTalentFeed() {
  try {
    const { data } = await api.get('/api/v1/employer/talent-feed');
    return data;
  } catch (error) {
    logError('getTalentFeed', error);
    throw error;
  }
}

// ── Dispute & Appeal flow (System 7 / Section 5.1) ───────────

// POST /api/v1/credential/:id/dispute  (student)
export async function disputeCredential(id, reason) {
  try {
    const { data } = await api.post(`/api/v1/credential/${id}/dispute`, { reason });
    return data;
  } catch (error) {
    logError('disputeCredential', error);
    throw error;
  }
}

// GET /api/v1/admin/disputes  (admin)
export async function listDisputes() {
  try {
    const { data } = await api.get('/api/v1/admin/disputes');
    return data;
  } catch (error) {
    logError('listDisputes', error);
    throw error;
  }
}

// POST /api/v1/admin/disputes/:id/resolve  (admin) → { decision, notes }
export async function resolveDispute(id, decision, notes) {
  try {
    const { data } = await api.post(`/api/v1/admin/disputes/${id}/resolve`, { decision, notes });
    return data;
  } catch (error) {
    logError('resolveDispute', error);
    throw error;
  }
}

// ── Admin: issuer vetting console ────────────────────────────

// GET /api/v1/admin/issuers  (admin)
export async function getAdminIssuers() {
  try {
    const { data } = await api.get('/api/v1/admin/issuers');
    return data;
  } catch (error) {
    logError('getAdminIssuers', error);
    throw error;
  }
}

// POST /api/v1/issuer/registry-cross-match  (admin) → { userId, matched, notes }
// Tier-4 vetting: flips the issuer to active + isVerifiedIssuer when matched.
export async function registryCrossMatch(userId, matched, notes) {
  try {
    const { data } = await api.post('/api/v1/issuer/registry-cross-match', { userId, matched, notes });
    return data;
  } catch (error) {
    logError('registryCrossMatch', error);
    throw error;
  }
}

// ── /api/v1 — Economy layer: Bounties ────────────────────────

// GET /api/v1/bounties  → open bounties (+ myApplicationStatus for students)
export async function listOpenBounties() {
  try {
    const { data } = await api.get('/api/v1/bounties');
    return data;
  } catch (error) {
    logError('listOpenBounties', error);
    throw error;
  }
}

// POST /api/v1/bounties  (employer)
export async function createBounty(payload) {
  try {
    const { data } = await api.post('/api/v1/bounties', payload);
    return data;
  } catch (error) {
    logError('createBounty', error);
    throw error;
  }
}

// GET /api/v1/bounties/mine  (employer)
export async function getMyBounties() {
  try {
    const { data } = await api.get('/api/v1/bounties/mine');
    return data;
  } catch (error) {
    logError('getMyBounties', error);
    throw error;
  }
}

// GET /api/v1/bounties/applications/mine  (student)
export async function getMyApplications() {
  try {
    const { data } = await api.get('/api/v1/bounties/applications/mine');
    return data;
  } catch (error) {
    logError('getMyApplications', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/apply  (student)
export async function applyToBounty(id, payload = {}) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/apply`, payload);
    return data;
  } catch (error) {
    logError('applyToBounty', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/applications/:appId/deliver  (student)
export async function submitDelivery(id, appId, payload) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/applications/${appId}/deliver`, payload);
    return data;
  } catch (error) {
    logError('submitDelivery', error);
    throw error;
  }
}

// GET /api/v1/bounties/:id/applications  (employer)
export async function getBountyApplicants(id) {
  try {
    const { data } = await api.get(`/api/v1/bounties/${id}/applications`);
    return data;
  } catch (error) {
    logError('getBountyApplicants', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/applications/:appId/accept  (employer)
export async function acceptApplicant(id, appId) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/applications/${appId}/accept`, {});
    return data;
  } catch (error) {
    logError('acceptApplicant', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/applications/:appId/confirm  (employer)
export async function confirmDelivery(id, appId) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/applications/${appId}/confirm`, {});
    return data;
  } catch (error) {
    logError('confirmDelivery', error);
    throw error;
  }
}

// ── Direct "live task" assignment ────────────────────────────

// POST /api/v1/bounties/direct  (employer) → { studentId, title, description, … }
export async function createDirectTask(payload) {
  try {
    const { data } = await api.post('/api/v1/bounties/direct', payload);
    return data;
  } catch (error) {
    logError('createDirectTask', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/respond  (student) → { decision: 'accept'|'decline' }
export async function respondToDirectTask(id, decision) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/respond`, { decision });
    return data;
  } catch (error) {
    logError('respondToDirectTask', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/applications/:appId/rate  → { stars, comment }
export async function rateCounterparty(id, appId, payload) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/applications/${appId}/rate`, payload);
    return data;
  } catch (error) {
    logError('rateCounterparty', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/cancel  (employer)
export async function cancelBounty(id) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/cancel`, {});
    return data;
  } catch (error) {
    logError('cancelBounty', error);
    throw error;
  }
}

// ── Global (open competition) bounties + leaderboard ─────────

// GET /api/v1/bounties/global  → global bounties (+ mySubmissionStatus for students)
export async function listGlobalBounties() {
  try {
    const { data } = await api.get('/api/v1/bounties/global');
    return data;
  } catch (error) {
    logError('listGlobalBounties', error);
    throw error;
  }
}

// POST /api/v1/bounties/global  (employer) → { title, description, prizes: [...] }
export async function createGlobalBounty(payload) {
  try {
    const { data } = await api.post('/api/v1/bounties/global', payload);
    return data;
  } catch (error) {
    logError('createGlobalBounty', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/submit  (student) → { text, links }
export async function submitToGlobalBounty(id, payload) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/submit`, payload);
    return data;
  } catch (error) {
    logError('submitToGlobalBounty', error);
    throw error;
  }
}

// GET /api/v1/bounties/:id/submissions  (sponsor, or public once completed)
export async function getGlobalSubmissions(id) {
  try {
    const { data } = await api.get(`/api/v1/bounties/${id}/submissions`);
    return data;
  } catch (error) {
    logError('getGlobalSubmissions', error);
    throw error;
  }
}

// POST /api/v1/bounties/:id/select-winners  (employer) → { winners: [{ appId, rank }] }
export async function selectWinners(id, winners) {
  try {
    const { data } = await api.post(`/api/v1/bounties/${id}/select-winners`, { winners });
    return data;
  } catch (error) {
    logError('selectWinners', error);
    throw error;
  }
}

// GET /api/v1/bounties/leaderboard  → top earners by real delivered work
export async function getLeaderboard() {
  try {
    const { data } = await api.get('/api/v1/bounties/leaderboard');
    return data;
  } catch (error) {
    logError('getLeaderboard', error);
    throw error;
  }
}

// ── Fraud reporting (Anti-COLLUSION) ─────────────────────────

// POST /api/v1/credential/:id/report-fraud  (any authed user) → { reason }
export async function reportCredentialFraud(id, reason) {
  try {
    const { data } = await api.post(`/api/v1/credential/${id}/report-fraud`, { reason });
    return data;
  } catch (error) {
    logError('reportCredentialFraud', error);
    throw error;
  }
}

// GET /api/v1/admin/fraud-reports  (admin)
export async function listFraudReports() {
  try {
    const { data } = await api.get('/api/v1/admin/fraud-reports');
    return data;
  } catch (error) {
    logError('listFraudReports', error);
    throw error;
  }
}

// POST /api/v1/admin/fraud-reports/:id/resolve  (admin) → { decision, notes }
export async function resolveFraudReport(id, decision, notes) {
  try {
    const { data } = await api.post(`/api/v1/admin/fraud-reports/${id}/resolve`, { decision, notes });
    return data;
  } catch (error) {
    logError('resolveFraudReport', error);
    throw error;
  }
}

// GET /api/v1/talent/search  (employer)  → params become the query string.
export async function searchTalent(params = {}) {
  try {
    const { data } = await api.get('/api/v1/talent/search', { params });
    return data;
  } catch (error) {
    logError('searchTalent', error);
    throw error;
  }
}

// Absolute URL for the public live-status SVG badge (System 5).
export function badgeUrl(credentialId) {
  return `${API_BASE_URL}/api/v1/badge/${credentialId}`;
}

// Convenience aggregate export.
export default {
  api,
  healthCheck,
  register,
  login,
  googleAuthUrl,
  getStudent,
  updateStudentProfile,
  getPublicProfile,
  verifyIssuer,
  issueCredential,
  acceptCredential,
  rejectCredential,
  sendChatMessage,
  getChatHistory,
  generateCV,
  analyzeSkills,
  registerIssuerStepOne,
  verifyIssuerDomain,
  submitIssuerKyc,
  getStudentPortfolio,
  addSandboxSkill,
  vouchSandboxSkill,
  disputeAttestation,
  getIssuerDirectory,
  requestInstitution,
  getInstitutionRequests,
  resolveInstitutionRequest,
  issueVerifiedCredential,
  revokeCredential,
  bulkUploadCredentials,
  generateVerifiedCv,
  syncTelemetry,
  initializeChat,
  sendChatMessageV1,
  getChatRooms,
  getTalentFeed,
  disputeCredential,
  listDisputes,
  resolveDispute,
  getAdminIssuers,
  registryCrossMatch,
  // Economy: bounties
  listOpenBounties,
  createBounty,
  getMyBounties,
  getMyApplications,
  applyToBounty,
  submitDelivery,
  getBountyApplicants,
  acceptApplicant,
  confirmDelivery,
  searchTalent,
  badgeUrl,
  // Direct tasks
  createDirectTask,
  respondToDirectTask,
  rateCounterparty,
  cancelBounty,
  // Global competition + leaderboard
  listGlobalBounties,
  createGlobalBounty,
  submitToGlobalBounty,
  getGlobalSubmissions,
  selectWinners,
  getLeaderboard,
  // Anti-collusion fraud reporting
  reportCredentialFraud,
  listFraudReports,
  resolveFraudReport,
};
