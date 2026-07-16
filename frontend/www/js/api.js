/**
 * api.js — Couche d'accès à l'API backend (FastAPI)
 * Ento-App Afrique — Version dynamique complète
 */

const API_BASE = window.ENTOMO_API_BASE || (
  window.location.port === '8765'
    ? `${window.location.origin}/api/v1`
    : 'http://127.0.0.1:8765/api/v1'
);

// ─── Gestion du token JWT ─────────────────────────────────────────────────────
const Auth = {
  getToken()        { return localStorage.getItem('entomo_token'); },
  setToken(t)       { localStorage.setItem('entomo_token', t); },
  removeToken()     { localStorage.removeItem('entomo_token'); localStorage.removeItem('entomo_user'); },
  getUser()         { try { return JSON.parse(localStorage.getItem('entomo_user') || 'null'); } catch { return null; } },
  setUser(u)        { localStorage.setItem('entomo_user', JSON.stringify(u)); },
  isLoggedIn()      { return !!this.getToken(); },
  logout()          { this.removeToken(); },
};

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
      try { const e = await res.json(); detail = e.detail || detail; } catch {}
      if (!options.silent) { hideLoader(); pushNotification(detail, 'error'); }
      return null;
    }

    if (!options.silent) hideLoader();
    if (res.status === 204) return true;
    return await res.json();
  } catch (err) {
    if (!options.silent) hideLoader();
    pushNotification('Erreur de connexion au serveur', 'error');
    console.warn('[API] Backend non joignable :', err.message);
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
  sync(configId = 1)       { return apiRequest('POST', '/dhis2/sync', { config_id: configId }); },
  getHistorique(configId)  { return apiRequest('GET', `/dhis2/sync/historique/${configId}`); },
  testConnection()         { return apiRequest('POST', '/dhis2/sync', { config_id: 1 }).then(() => ({ success: true })).catch(() => ({ success: false })); },
  getStatus()              { return apiRequest('GET', '/dhis2/status', null, false, { silent: true }); },
  listPending()            { return apiCaptures.aValider(); },
  validate(id, data)       { return apiCaptures.valider(id, data); },
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────
const apiDashboard = {
  stats()             { return apiRequest('GET', '/dashboard/stats'); },
  capturesParEspece() { return apiRequest('GET', '/dashboard/captures-par-espece'); },
  capturesParSite()   { return apiRequest('GET', '/dashboard/captures-par-site'); },
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
  settings()           { return apiRequest('GET', '/sync/settings?extended=true'); },
  saveSettings(data)   { return apiRequest('POST', '/sync/settings', data); },
  clearCache()         { return apiRequest('DELETE', '/sync/cache'); },
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
  try {
    const res = await fetch('http://127.0.0.1:8765/health', { signal: AbortSignal.timeout(3000) });
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
