const SESSION_KEY = "sugr-session";
const TOKEN_KEY = "sugr-token";
const API_BASE = "/api";

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function saveAuth({ user, token }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}
export function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY); }
export function dataKeyForUser(user) { return `sugr-data-${user.id}`; }

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export async function registerUser({ name, email, password }) {
  const result = await request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  saveAuth(result);
  return result.user;
}
export async function loginUser({ email, password }) {
  const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  saveAuth(result);
  return result.user;
}
export async function loadCloudData() { return (await request("/data")).data; }
export async function syncCloudData(data) { return (await request("/data", { method: "PUT", body: JSON.stringify({ data }) })).data; }
export async function checkSession() { return (await request("/auth/me")).user; }
export async function aiRequest(payload) { return request("/ai", { method: "POST", body: JSON.stringify(payload) }); }
export async function mealAiRequest(image) { return request("/meal-ai", { method: "POST", body: JSON.stringify({ image }) }); }
