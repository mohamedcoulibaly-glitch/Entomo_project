/**
 * api.js — Couche d'accès à l'API backend (FastAPI)
 * Ento-App Afrique
 *
 * BASE_URL pointe sur le serveur FastAPI.
 * En développement local, le backend tourne sur http://127.0.0.1:8000
 */

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// ─── Gestion du token JWT ─────────────────────────────────────────────────────
const Auth = {
  getToken()        { return localStorage.getItem('entomo_token'); },
  setToken(t)       { localStorage.setItem('entomo_token', t); },
  removeToken()     { localStorage.removeItem('entomo_token'); localStorage.removeItem('entomo_user'); },
  getUser()         { try { return JSON.parse(localStorage.getItem('entomo_user') || 'null'); } catch { return null; } },
  setUser(u)        { localStorage.setItem('entomo_user', JSON.stringify(u)); },
  isLoggedIn()      { return !!this.getToken(); },
};

// ─── Requête HTTP générique ───────────────────────────────────────────────────
async function apiRequest(method, path, body = null, formData = false) {
  const token = Auth.getToken();
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = formData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 401) {
      Auth.removeToken();
      pushNotification('Session expirée. Veuillez vous reconnecter.', 'warning');
      return null;
    }

    if (!res.ok) {
      let detail = `Erreur ${res.status}`;
      try { const e = await res.json(); detail = e.detail || detail; } catch {}
      pushNotification(detail, 'error');
      return null;
    }

    if (res.status === 204) return true;
    return await res.json();
  } catch (err) {
    // Le backend n'est pas joignable → mode dégradé (données statiques)
    console.warn('[API] Backend non joignable, mode hors-ligne :', err.message);
    return null;
  }
}

// ─── Authentification ─────────────────────────────────────────────────────────
const apiAuth = {
  async login(username, password) {
    const form = new URLSearchParams({ username, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    Auth.setToken(data.access_token);
    // Charger le profil
    const me = await apiAuth.me();
    if (me) Auth.setUser(me);
    return data;
  },
  async me() { return apiRequest('GET', '/auth/me'); },
  logout() { Auth.removeToken(); },
};

// ─── Captures ─────────────────────────────────────────────────────────────────
const apiCaptures = {
  list(params = {})       {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/captures/${q ? '?' + q : ''}`);
  },
  get(id)                 { return apiRequest('GET', `/captures/${id}`); },
  create(data)            { return apiRequest('POST', '/captures/', data); },
  update(id, data)        { return apiRequest('PUT', `/captures/${id}`, data); },
  delete(id)              { return apiRequest('DELETE', `/captures/${id}`); },
  valider(id, validation) { return apiRequest('POST', `/captures/${id}/valider`, validation); },
  aValider()              { return apiRequest('GET', '/captures/a-valider'); },
};

// ─── Sites sentinelles ────────────────────────────────────────────────────────
const apiSites = {
  list(params = {})  {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/sites/${q ? '?' + q : ''}`);
  },
  get(id)            { return apiRequest('GET', `/sites/${id}`); },
  create(data)       { return apiRequest('POST', '/sites/', data); },
  update(id, data)   { return apiRequest('PUT', `/sites/${id}`, data); },
  delete(id)         { return apiRequest('DELETE', `/sites/${id}`); },
  activites(id)      { return apiRequest('GET', `/sites/${id}/activites`); },
  addActivite(id, d) { return apiRequest('POST', `/sites/${id}/activites`, d); },
};

// ─── Utilisateurs ─────────────────────────────────────────────────────────────
const apiUsers = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/users/${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/users/${id}`); },
  create(data)      { return apiRequest('POST', '/users/', data); },
  update(id, data)  { return apiRequest('PUT', `/users/${id}`, data); },
  delete(id)        { return apiRequest('DELETE', `/users/${id}`); },
};

// ─── Rôles ────────────────────────────────────────────────────────────────────
const apiRoles = {
  list()           { return apiRequest('GET', '/roles/'); },
  get(id)          { return apiRequest('GET', `/roles/${id}`); },
  create(data)     { return apiRequest('POST', '/roles/', data); },
  update(id, data) { return apiRequest('PUT', `/roles/${id}`, data); },
  delete(id)       { return apiRequest('DELETE', `/roles/${id}`); },
};

// ─── Datasets ─────────────────────────────────────────────────────────────────
const apiDatasets = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/datasets/${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/datasets/${id}`); },
  create(data)      { return apiRequest('POST', '/datasets/', data); },
  update(id, data)  { return apiRequest('PUT', `/datasets/${id}`, data); },
  delete(id)        { return apiRequest('DELETE', `/datasets/${id}`); },
};

// ─── Modèles ML ───────────────────────────────────────────────────────────────
const apiModels = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/modeles/${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/modeles/${id}`); },
  create(data)      { return apiRequest('POST', '/modeles/', data); },
  update(id, data)  { return apiRequest('PUT', `/modeles/${id}`, data); },
  delete(id)        { return apiRequest('DELETE', `/modeles/${id}`); },
};

// ─── Rapports ─────────────────────────────────────────────────────────────────
const apiReports = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/rapports/${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/rapports/${id}`); },
  create(data)      { return apiRequest('POST', '/rapports/', data); },
  delete(id)        { return apiRequest('DELETE', `/rapports/${id}`); },
};

// ─── DHIS2 ────────────────────────────────────────────────────────────────────
const apiDhis2 = {
  // Config
  getConfig()              { return apiRequest('GET', '/dhis2/config'); },
  saveConfig(data)         { return apiRequest('POST', '/dhis2/config', data); },
  updateConfig(id, data)   { return apiRequest('PUT', `/dhis2/config/${id}`, data); },
  // Mappings
  getMappings(configId)    { return apiRequest('GET', `/dhis2/config/${configId}/mappings`); },
  addMapping(configId, d)  { return apiRequest('POST', `/dhis2/config/${configId}/mappings`, d); },
  deleteMapping(id)        { return apiRequest('DELETE', `/dhis2/mappings/${id}`); },
  // Sync
  sync(configId = 1)       { return apiRequest('POST', '/dhis2/sync', { config_id: configId }); },
  getHistorique(configId)  { return apiRequest('GET', `/dhis2/sync/historique/${configId}`); },
  // Simulation locale pour les endpoints non encore implémentés
  testConnection()         { return Promise.resolve({ success: true }); },
  getStatus()              { return apiRequest('GET', '/dhis2/sync/historique/1').then(h => h?.[0] || null); },
  listPending()            { return apiCaptures.aValider(); },
  validate(id, data)       { return apiCaptures.valider(id, data); },
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────
const apiDashboard = {
  stats()             { return apiRequest('GET', '/dashboard/stats'); },
  capturesParEspece() { return apiRequest('GET', '/dashboard/captures-par-espece'); },
  capturesParSite()   { return apiRequest('GET', '/dashboard/captures-par-site'); },
};

// ─── Helper : afficher un badge "API connecté / hors ligne" ──────────────────
function showApiStatus(connected) {
  let badge = document.getElementById('api-status-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'api-status-badge';
    badge.className = 'fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow';
    document.body.appendChild(badge);
  }
  if (connected) {
    badge.className = badge.className.replace(/bg-\w+-\d+/g, '');
    badge.classList.add('bg-green-100', 'text-green-800');
    badge.innerHTML = '<span class="material-symbols-outlined text-sm">cloud_done</span> API connectée';
  } else {
    badge.className = badge.className.replace(/bg-\w+-\d+/g, '');
    badge.classList.add('bg-yellow-100', 'text-yellow-800');
    badge.innerHTML = '<span class="material-symbols-outlined text-sm">cloud_off</span> Mode hors-ligne';
  }
}

// Vérifier la connexion backend au démarrage
async function checkApiHealth() {
  try {
    const res = await fetch('http://127.0.0.1:8000/health', { signal: AbortSignal.timeout(3000) });
    const ok = res.ok;
    showApiStatus(ok);
    return ok;
  } catch {
    showApiStatus(false);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkApiHealth();
});
