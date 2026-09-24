/**
 * api.js — Couche d'accès à l'API backend (FastAPI)
 * Ento-App Afrique — Version dynamique complète
 */

const API_BASE = (
  window.ENTOMO_CONFIG?.resolveApiBase?.() ||
  window.ENTOMO_API_BASE ||
  `${window.location.origin}/api/v1`
).replace(/\/$/, '');

function apiOrigin() {
  return (window.ENTOMO_CONFIG?.apiOrigin?.() || API_BASE.replace(/\/api\/v1\/?$/, ''));
}

function resolveMediaUrl(path) {
  if (window.ENTOMO_CONFIG?.resolveMediaUrl) return window.ENTOMO_CONFIG.resolveMediaUrl(path);
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/');
  const origin = apiOrigin();
  let url;
  if (normalized.startsWith('/uploads/')) url = `${origin}${normalized}`;
  else if (normalized.startsWith('uploads/')) url = `${origin}/${normalized}`;
  else url = `${origin}/uploads/${normalized.replace(/^\/+/, '')}`;
  return `${url}${url.includes('?') ? '&' : '?'}v=20260923g`;
}

// ─── Gestion du token JWT ─────────────────────────────────────────────────────
const Auth = {
  getToken()        { return localStorage.getItem('entomo_token'); },
  setToken(t)       { localStorage.setItem('entomo_token', t); },
  removeToken()     { localStorage.removeItem('entomo_token'); localStorage.removeItem('entomo_user'); },
  getUser()         { try { return JSON.parse(localStorage.getItem('entomo_user') || 'null'); } catch { return null; } },
  setUser(u)        { localStorage.setItem('entomo_user', JSON.stringify(u)); },
  isLoggedIn()      { return !!this.getToken(); },
  logout()          { this.removeToken(); },
  hasPermission(code) {
    if (!code) return true;
    const user = this.getUser();
    if (!user) return false;
    if (user.is_superuser) return true;
    const perms = user.permissions || [];
    if (perms.includes('admin')) return true;
    return Array.isArray(code) ? code.some(c => perms.includes(c)) : perms.includes(code);
  },
};

/** Formate les erreurs FastAPI (422, 500, etc.) pour l'UI. */
function formatApiError(detail, status) {
  if (!detail) return `Erreur ${status}`;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(' · ');
  }
  if (typeof detail === 'object' && detail.message) return detail.message;
  return JSON.stringify(detail);
}

// ─── Requête HTTP générique avec gestion complète des états ──────────────────
async function apiRequest(method, path, body = null, formData = false, options = {}) {
  const token = Auth.getToken();
  const headers = {};

  if (!options.suppressAuth) {
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = formData ? body : JSON.stringify(body);

  if (!options.silent) showLoader();

  try {
    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 401) {
      // Un visiteur sans jeton peut consulter les écrans publics. Seule une
      // session qui existait réellement doit être considérée comme expirée.
      if (!options.suppressAuth && token) {
        Auth.removeToken();
        if (!options.silent) { hideLoader(); pushNotification('Session expirée. Veuillez vous reconnecter.', 'warning'); }
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        const base = depth > 1 ? '../'.repeat(depth) : './';
        if (!window.location.pathname.includes('login.html') &&
            !window.location.pathname.includes('index.html') &&
            window.location.pathname !== '/') {
          setTimeout(() => { window.location.href = base + 'login.html'; }, 1500);
        }
      }
      return null;
    }

    if (!res.ok) {
      let detail = `Erreur ${res.status}`;
      try {
        const e = await res.json();
        detail = formatApiError(e.detail ?? e.message ?? e, res.status);
      } catch { /* corps non JSON */ }
      if (!options.silent) {
        hideLoader();
        const level = res.status === 422 ? 'warning' : 'error';
        pushNotification(detail, level);
      }
      if (!options.silent && res.status >= 500) console.error('[API]', method, path, detail);
      return null;
    }

    if (!options.silent) hideLoader();
    if (res.status === 204) return true;
    return await res.json();
  } catch (err) {
    if (!options.silent) hideLoader();
    if (!options.silent) pushNotification('Erreur de connexion au serveur', 'error');
    console.warn('[API] Backend non joignable :', err.message);
    return options.offlineQueue ? { __offline: true, error: err } : null;
  }
}

/** Téléchargement authentifié (PDF, CSV, Excel). */
async function apiDownload(path, filename, options = {}) {
  const token = Auth.getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!options.silent) showLoader();
  try {
    const res = await fetch(`${API_BASE}${path}`, { method: 'GET', headers });
    if (!res.ok) {
      let detail = `Erreur ${res.status}`;
      try {
        const e = await res.json();
        detail = formatApiError(e.detail ?? e.message, res.status);
      } catch { /* ignore */ }
      if (!options.silent) pushNotification(detail, 'error');
      return false;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export';
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    if (!options.silent) pushNotification('Téléchargement impossible.', 'error');
    return false;
  } finally {
    if (!options.silent) hideLoader();
  }
}

/** Enregistre une mutation hors ligne si le réseau est indisponible. */
async function queueOfflineMutation(resourceType, action, payload, resourceId = null) {
  if (typeof OfflineStore === 'undefined' || typeof apiSync === 'undefined') return false;
  const clientId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `local-${resourceType}-${Date.now()}`;
  const localId = clientId;
  const enrichedPayload = { ...payload, client_id: clientId };
  await OfflineStore.put({
    local_id: localId,
    client_id: clientId,
    resource_type: resourceType,
    resource_id: resourceId,
    action,
    statut: 'pending',
    payload: enrichedPayload,
  });
  try {
    await apiSync.enqueue({
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      client_id: clientId,
      payload: enrichedPayload,
    });
  } catch { /* file locale conservée */ }
  pushNotification('Action enregistrée hors ligne. Synchronisation à la reconnexion.', 'warning');
  return true;
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
    if (res.status === 429) {
      let msg = 'Trop de tentatives. Réessayez dans une minute.';
      try { const e = await res.json(); if (e.detail) msg = e.detail; } catch { /* ignore */ }
      throw new Error(msg);
    }
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

// ─── Référence ─────────────────────────────────────────────────────────────────
const apiReference = {
  listCategory(category)  { return apiRequest('GET', `/reference/${category}`); },
  getItem(category, code) { return apiRequest('GET', `/reference/${category}/${code}`); },
  create(data)            { return apiRequest('POST', '/reference/', data); },
  update(category, code, data) { return apiRequest('PUT', `/reference/${category}/${code}`, data); },
  delete(category, code)  { return apiRequest('DELETE', `/reference/${category}/${code}`); },
};

// ─── Captures ─────────────────────────────────────────────────────────────────
const apiCaptures = {
  list(params = {})       {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/captures/${q ? '?' + q : ''}`);
  },
  get(id)                 { return apiRequest('GET', `/captures/${id}`); },
  async create(data) {
    const payload = normalizeCapturePayload(data);
    const res = await apiRequest('POST', '/captures/', payload, false, { offlineQueue: true });
    if (res && res.__offline) {
      await queueOfflineMutation('capture', 'create', payload);
      return { offline: true, ...payload };
    }
    return res;
  },
  update(id, data)        { return apiRequest('PUT', `/captures/${id}`, data); },
  delete(id)              { return apiRequest('DELETE', `/captures/${id}`); },
  valider(id, validation) { return apiRequest('POST', `/captures/${id}/valider`, validation); },
  analyser(id, data = {})  { return apiRequest('POST', `/captures/${id}/analyser`, data); },
  analyserImage(id, data = {}) { return apiRequest('POST', `/captures/${id}/analyser-image`, data); },
  statsAudio()             { return apiRequest('GET', '/captures/stats-audio'); },
  aValider()              { return apiRequest('GET', '/captures/a-valider'); },
  export(params = {}, format = 'csv') {
    const q = new URLSearchParams({ ...params, format }).toString();
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const stamp = new Date().toISOString().slice(0, 10);
    return apiDownload(`/captures/export?${q}`, `analyse_captures_${stamp}.${ext}`);
  },
  uploadImage(id, file) {
    const fd = new FormData();
    fd.append('file', file);
    return apiRequest('POST', `/captures/${id}/upload-image`, fd, true);
  },
  uploadAudio(id, file) {
    const fd = new FormData();
    fd.append('file', file);
    return apiRequest('POST', `/captures/${id}/upload-audio`, fd, true);
  },
};

/** Aligne le payload capture frontend sur CaptureCreate FastAPI. */
function normalizeCapturePayload(data) {
  const out = { ...data };
  if (out.date_capture && !out.date_capture.includes('T')) {
    out.date_capture = `${out.date_capture}T12:00:00`;
  }
  if (out.confiance != null && out.confidence_ia == null) out.confidence_ia = out.confiance;
  if (out.espece && !out.identification_ia) out.identification_ia = out.espece;
  out.statut = out.statut || 'a_valider';
  out.nombre_individus = Number(out.nombre_individus || 1);
  return out;
}

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
  permissions()    { return apiRequest('GET', '/roles/permissions'); },
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
  annotations(id)   { return apiRequest('GET', `/datasets/${id}/annotations`); },
  addAnnotation(id, data) { return apiRequest('POST', `/datasets/${id}/annotations`, data); },
};

// ─── Modèles ML ───────────────────────────────────────────────────────────────
const apiModels = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/modeles/ml${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/modeles/ml/${id}`); },
  create(data)      { return apiRequest('POST', '/modeles/ml', data); },
  update(id, data)  { return apiRequest('PUT', `/modeles/ml/${id}`, data); },
  delete(id)        { return apiRequest('DELETE', `/modeles/ml/${id}`); },
  deploy(id, deploye = true) { return apiRequest('POST', `/modeles/ml/${id}/deployer?deploye=${deploye}`, null); },
  listDeployes()    { return apiRequest('GET', '/modeles/ml/deployes'); },
  test(id)          { return apiRequest('POST', `/modeles/ml/${id}/tester`); },
  listRisque()      { return apiRequest('GET', '/modeles/risque'); },
  createRisque(d)   { return apiRequest('POST', '/modeles/risque', d); },
  updateRisque(id, d) { return apiRequest('PUT', `/modeles/risque/${id}`, d); },
  simulerRisque(d)  { return apiRequest('POST', '/modeles/risque/simuler', d); },
  listPipelines()   { return apiRequest('GET', '/modeles/pipelines'); },
  getPipeline(id)   { return apiRequest('GET', `/modeles/pipelines/${id}`); },
  createPipeline(d) { return apiRequest('POST', '/modeles/pipelines', d); },
  updatePipeline(id, d) { return apiRequest('PUT', `/modeles/pipelines/${id}`, d); },
  runPipeline(id)    { return apiRequest('POST', `/modeles/pipelines/${id}/lancer`); },
  stopPipeline(id)   { return apiRequest('POST', `/modeles/pipelines/${id}/arreter`); },
  registry()         { return apiRequest('GET', '/modeles/registry'); },
};

// ─── Rapports ─────────────────────────────────────────────────────────────────
const apiReports = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/rapports/${q ? '?' + q : ''}`);
  },
  get(id)           { return apiRequest('GET', `/rapports/${id}`); },
  create(data)      { return apiRequest('POST', '/rapports/', data); },
  generate(data)    { return apiRequest('POST', '/rapports/generer', data); },
  update(id, data)  { return apiRequest('PUT', `/rapports/${id}`, data); },
  schedule(id, data){ return apiRequest('POST', `/rapports/${id}/programmer`, data); },
  programs()        { return apiRequest('GET', '/rapports/programmes/actifs'); },
  submit(id, data)  { return apiRequest('POST', `/rapports/${id}/soumettre`, data); },
  fileUrl(report) {
    if (!report?.chemin_fichier) return null;
    return `${API_BASE.replace(/\/api\/v1$/, '')}${report.chemin_fichier}`;
  },
  download(id, filename) {
    return apiDownload(`/rapports/${id}/telecharger`, filename || `rapport_${id}.pdf`);
  },
  delete(id)        { return apiRequest('DELETE', `/rapports/${id}`); },
};

// ─── Cartographie ─────────────────────────────────────────────────────────────
const apiCartography = {
  data(region = null) {
    const query = region && region !== 'toutes' ? `?region=${encodeURIComponent(region)}` : '';
    return apiRequest('GET', `/cartographie/donnees${query}`);
  },
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
  sync(configId, options = {}) {
    const id = configId || options.configId || 1;
    return apiRequest('POST', '/dhis2/sync', { config_id: id }, false, { silent: !!options.silent });
  },
  syncCapture(captureId, options = {}) {
    return apiRequest('POST', `/dhis2/sync/capture/${captureId}`, null, false, { silent: !!options.silent });
  },
  async syncIfReady(options = {}) {
    const status = await this.getStatus();
    if (!status?.credentials_ready || !status?.config_id) return null;
    return this.sync(status.config_id, options);
  },
  getHistorique(configId)  { return apiRequest('GET', `/dhis2/sync/historique/${configId}`); },
  testConnection(configId, password) {
    return apiRequest('POST', '/dhis2/test-connection', { config_id: configId, password: password || null });
  },
  getStatus()              { return apiRequest('GET', '/dhis2/status', null, false, { silent: true }); },
  getCatalog(configId)     { return apiRequest('GET', `/dhis2/catalog/${configId}`); },
  listPending()            { return apiRequest('GET', '/dhis2/pending'); },
  validate(id, data)       { return apiCaptures.valider(id, data); },
  async validateAndPush(id, data) {
    const res = await apiCaptures.valider(id, data);
    if (!res) return null;
    const status = await this.getStatus();
    if (status?.credentials_ready && status?.config_id) {
      try {
        await this.syncCapture(id, { silent: true });
      } catch {
        try { await this.sync(status.config_id, { silent: true }); } catch { /* agrégé en secours */ }
      }
    }
    return res;
  },
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────
function _dashboardQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '' && v !== 'toutes' && v !== 'Toutes') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

const apiDashboard = {
  stats(params = {})           { return apiRequest('GET', `/dashboard/stats${_dashboardQuery(params)}`); },
  capturesParEspece(params = {}) { return apiRequest('GET', `/dashboard/captures-par-espece${_dashboardQuery(params)}`); },
  capturesParSite(params = {})   { return apiRequest('GET', `/dashboard/captures-par-site${_dashboardQuery(params)}`); },
  capturesParRegion(params = {}) { return apiRequest('GET', `/dashboard/captures-par-region${_dashboardQuery(params)}`); },
  capturesParMethode(params = {}) { return apiRequest('GET', `/dashboard/captures-par-methode${_dashboardQuery(params)}`); },
  capturesParStatut(params = {})  { return apiRequest('GET', `/dashboard/captures-par-statut${_dashboardQuery(params)}`); },
  densiteEvolution(params = {})   { return apiRequest('GET', `/dashboard/densite-evolution${_dashboardQuery(params)}`); },
  alertes(params = {})            { return apiRequest('GET', `/dashboard/alertes${_dashboardQuery(params)}`); },
  heatmap(params = {})            { return apiRequest('GET', `/dashboard/heatmap${_dashboardQuery(params)}`); },
  interventionsStats(params = {}) { return apiRequest('GET', `/dashboard/interventions-stats${_dashboardQuery(params)}`); },
  regionDetail(name)              { return apiRequest('GET', `/dashboard/region/${encodeURIComponent(name)}`); },
  regions()                       { return apiRequest('GET', '/dashboard/regions'); },
};

// ─── Interventions ────────────────────────────────────────────────────────────
const apiInterventions = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/interventions/${q ? '?' + q : ''}`);
  },
  get(id)                { return apiRequest('GET', `/interventions/${id}`); },
  create(data)           { return apiRequest('POST', '/interventions/', data); },
  update(id, data)       { return apiRequest('PUT', `/interventions/${id}`, data); },
  delete(id)             { return apiRequest('DELETE', `/interventions/${id}`); },
};

// ─── Notifications ────────────────────────────────────────────────────────────
const apiNotifications = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/notifications/${q ? '?' + q : ''}`);
  },
  unreadCount()          { return apiRequest('GET', '/notifications/non-lues'); },
  markRead(id)           { return apiRequest('POST', `/notifications/${id}/lire`); },
  markAllRead()          { return apiRequest('POST', '/notifications/tout-lire'); },
};

// ─── Campagnes ────────────────────────────────────────────────────────────────
const apiCampagnes = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/campagnes/${q ? '?' + q : ''}`);
  },
  get(id)                { return apiRequest('GET', `/campagnes/${id}`); },
  create(data)           { return apiRequest('POST', '/campagnes/', data); },
  update(id, data)       { return apiRequest('PUT', `/campagnes/${id}`, data); },
  delete(id)             { return apiRequest('DELETE', `/campagnes/${id}`); },
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────
const apiAudit = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/audit/${q ? '?' + q : ''}`);
  },
  byUser(userId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiRequest('GET', `/audit/user/${userId}${q ? '?' + q : ''}`);
  },
};

// ─── Profil / Auth ────────────────────────────────────────────────────────────
const apiProfil = {
  update(data)           { return apiRequest('PUT', '/auth/me', data); },
  changePassword(oldPwd, newPwd) {
    return apiRequest('POST', '/auth/me/password', { old_password: oldPwd, new_password: newPwd });
  },
  stats()                { return apiRequest('GET', '/auth/me/stats'); },
  activity()             { return apiRequest('GET', '/auth/me/activity', null, false, { silent: true }); },
  preferences()          { return apiRequest('GET', '/auth/me/preferences', null, false, { silent: true }); },
  updatePreferences(data){ return apiRequest('PUT', '/auth/me/preferences', data); },
  logoutAll()            { return apiRequest('POST', '/auth/logout-all', null, false, { silent: true }); },
};

const apiSync = {
  settings()           { return apiRequest('GET', '/sync/settings?extended=true', null, false, { silent: true }); },
  saveSettings(data)   { return apiRequest('POST', '/sync/settings', data); },
  clearCache()         { return apiRequest('DELETE', '/sync/cache'); },
  listQueue()          { return apiRequest('GET', '/sync/queue'); },
  enqueue(data)        { return apiRequest('POST', '/sync/queue', data); },
  replay(itemId)       { return apiRequest('POST', `/sync/queue/${itemId}/replay`); },
  resolveConflict(itemId, strategy) {
    return apiRequest('POST', `/sync/queue/${itemId}/resolve`, { strategy });
  },
  processQueue(silent = false) { return apiRequest('POST', '/sync/queue/process', null, false, { silent }); },
};

// ─── Assistant IA ─────────────────────────────────────────────────────────────
const apiAssistant = {
  context()            { return apiRequest('GET', '/assistant/context'); },
  chat(message)        { return apiRequest('POST', '/assistant/chat', { message }); },
};

// ─── Assistance ──────────────────────────────────────────────────────────────
const apiSupport = {
  listTickets()          { return apiRequest('GET', '/support/tickets'); },
  createTicket(data)     { return apiRequest('POST', '/support/tickets', data); },
  updateTicket(id, data) { return apiRequest('PUT', `/support/tickets/${id}`, data); },
};

// ─── Helper : afficher un badge "API connecté / hors ligne" ──────────────────
function showApiStatus(connected) {
  let badge = document.getElementById('api-status-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'api-status-badge';
    // pointer-events-none : badge purement informatif, ne doit jamais intercepter
    // les clics sur les éléments en-dessous (ex : dernier lien de la sidebar).
    badge.className = 'fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow pointer-events-none';
    document.body.appendChild(badge);
  }
  badge.dataset.status = connected ? 'ok' : 'error';
  if (connected) {
    badge.innerHTML = '<span class="material-symbols-outlined text-sm">cloud_done</span> API connectée';
  } else {
    badge.innerHTML = '<span class="material-symbols-outlined text-sm">cloud_off</span> Mode hors-ligne';
  }
}

// ─── Données de référence statiques (fallback si BD vide) ────────────────────
const REFERENCE_DATA_STATIC = {
  especes: [
    { code: 'an_gambiae', label: 'An. gambiae s.s.' },
    { code: 'an_gambiae_sl', label: 'An. gambiae s.l.' },
    { code: 'an_funestus', label: 'An. funestus' },
    { code: 'an_arabiensis', label: 'An. arabiensis' },
    { code: 'an_melas', label: 'An. melas' },
    { code: 'an_moucheti', label: 'An. moucheti' },
    { code: 'an_nili', label: 'An. nili' },
    { code: 'an_marshallii', label: 'An. marshallii' },
    { code: 'ae_aegypti', label: 'Ae. aegypti' },
    { code: 'ae_albopictus', label: 'Ae. albopictus' },
    { code: 'cx_quinquefasciatus', label: 'Cx. quinquefasciatus' },
    { code: 'cx_perfuscus', label: 'Cx. perfuscus' },
    { code: 'cx_tritaeniorhynchus', label: 'Cx. tritaeniorhynchus' },
  ],
  regions: [
    { code: 'dakar', label: 'Dakar' },
    { code: 'thies', label: 'Thiès' },
    { code: 'diourbel', label: 'Diourbel' },
    { code: 'fatick', label: 'Fatick' },
    { code: 'kaolack', label: 'Kaolack' },
    { code: 'kaffrine', label: 'Kaffrine' },
    { code: 'kedougou', label: 'Kédougou' },
    { code: 'tambacounda', label: 'Tambacounda' },
    { code: 'ziguinchor', label: 'Ziguinchor' },
    { code: 'sedhiou', label: 'Sédhiou' },
    { code: 'kolda', label: 'Kolda' },
    { code: 'saint_louis', label: 'Saint-Louis' },
    { code: 'louga', label: 'Louga' },
    { code: 'matam', label: 'Matam' },
  ],
  methodes_capture: [
    { code: 'cdc_light_trap', label: 'CDC Light Trap' },
    { code: 'bg_sentinel', label: 'BG-Sentinel' },
    { code: 'filet', label: 'Filet à moustiques' },
    { code: 'aspirateur', label: 'Aspirateur à bouche' },
    { code: 'psc', label: 'PSC (Pulvérisation intra-domiciliaire)' },
    { code: 'cdc_gravid_trap', label: 'CDC Gravid Trap' },
    { code: 'pieges_lumineux', label: 'Pièges lumineux' },
    { code: 'audio', label: 'Surveillance audio' },
  ],
  types_zones: [
    { code: 'urbain', label: 'Urbain' },
    { code: 'periurbain', label: 'Périurbain' },
    { code: 'rural', label: 'Rural' },
    { code: 'foret', label: 'Forêt' },
    { code: 'zone_humide', label: 'Zone humide' },
    { code: 'zone_agricole', label: 'Zone agricole' },
    { code: 'mangrove', label: 'Mangrove' },
  ],
  genres: [
    { code: 'femelle', label: 'Femelle' },
    { code: 'male', label: 'Mâle' },
    { code: 'indetermine', label: 'Indéterminé' },
  ],
  statuts_capture: [
    { code: 'a_valider', label: 'À valider' },
    { code: 'valide', label: 'Validé' },
    { code: 'corrige', label: 'Corrigé' },
    { code: 'rejete', label: 'Rejeté' },
    { code: 'analyse', label: 'Analysé' },
  ],
  environnements: [
    { code: 'interieur', label: 'Intérieur' },
    { code: 'exterieur', label: 'Extérieur' },
    { code: 'semi_ouvert', label: 'Semi-ouvert' },
  ],
  types_modeles: [
    { code: 'visuel', label: 'Classification visuelle' },
    { code: 'audio', label: 'Classification audio' },
    { code: 'risque', label: 'Modèle de risque épidémiologique' },
    { code: 'prediction', label: 'Prédiction de densité' },
  ],
  niveaux_risque: [
    { code: 'faible', label: 'Faible' },
    { code: 'modere', label: 'Modéré' },
    { code: 'eleve', label: 'Élevé' },
    { code: 'critique', label: 'Critique' },
  ],
};

// Vérifier la connexion backend au démarrage
async function checkApiHealth() {
  const healthUrl = `${apiOrigin()}/health`;
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    const ok = res.ok;
    showApiStatus(ok);
    return ok;
  } catch {
    showApiStatus(false);
    return false;
  }
}

// ─── Enrichir loadReferenceData avec fallback statique ───────────────────────
async function loadReferenceDataEnriched(category) {
  try {
    const data = await apiRequest('GET', `/reference/${category}`, null, false, { silent: true });
    if (data && data.length > 0) return data;
    // Fallback aux données statiques
    return REFERENCE_DATA_STATIC[category] || [];
  } catch {
    return REFERENCE_DATA_STATIC[category] || [];
  }
}

// ─── Peupler un select depuis référence avec fallback ────────────────────────
async function populateSelectEnriched(selectId, category, defaultLabel = 'Sélectionner...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const items = await loadReferenceDataEnriched(category);
  select.innerHTML = `<option value="">${defaultLabel}</option>`
    + items.map(i => `<option value="${i.code}">${i.label}</option>`).join('');
}

// ─── Peupler un select avec la liste des sites actifs ────────────────────────
async function populateSiteSelect(selectId, defaultLabel = 'Sélectionner un site') {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const sites = await apiSites.list({ limit: 500 });
    select.innerHTML = `<option value="">${defaultLabel}</option>`
      + (sites || []).map(s => `<option value="${s.id}">${s.nom}${s.region ? ' (' + s.region + ')' : ''}</option>`).join('');
  } catch {
    select.innerHTML = `<option value="">${defaultLabel}</option>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkApiHealth();
});
