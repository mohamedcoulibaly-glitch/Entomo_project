/**
 * Gestionnaire global de synchronisation hors-ligne (auto-sync, reprise à la reconnexion).
 */
const EntomoOfflineSync = (() => {
  let _timer = null;
  let _settings = { auto_sync: true, frequence: 60, wifi_only: false, cache_expiry_hours: 72 };
  let _failures = 0;
  let _backoffUntil = 0;

  function scriptBase() {
    return window.location.pathname.includes('/pages/') ? '../js/' : 'js/';
  }

  async function loadSettings() {
    if (typeof apiSync === 'undefined') return;
    try {
      const s = await apiSync.settings();
      if (s) _settings = { ..._settings, ...s };
    } catch { /* silencieux */ }
  }

  function canSyncNow() {
    if (!navigator.onLine) return false;
    if (Date.now() < _backoffUntil) return false;
    if (_settings.wifi_only) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.effectiveType && conn.effectiveType !== '4g' && conn.type && conn.type !== 'wifi') {
        return false;
      }
    }
    return true;
  }

  function registerFailure() {
    _failures = Math.min(_failures + 1, 6);
    const delay = Math.min(30_000 * _failures, 300_000);
    _backoffUntil = Date.now() + delay;
  }

  function registerSuccess() {
    _failures = 0;
    _backoffUntil = 0;
  }

  async function purgeExpiredCache() {
    if (typeof OfflineStore === 'undefined' || !OfflineStore.purgeExpired) return;
    const hours = Number(_settings.cache_expiry_hours) || 72;
    await OfflineStore.purgeExpired(hours);
  }

  async function flushLocalCaptures() {
    if (typeof OfflineStore === 'undefined' || typeof apiCaptures === 'undefined') return;
    const items = await OfflineStore.list();
    for (const item of items) {
      if (item.resource_type !== 'capture' || item.action !== 'create' || !item.payload) continue;
      try {
        const created = await apiRequest('POST', '/captures/', item.payload, false, { silent: true });
        if (created && created.id) await OfflineStore.remove(item.local_id);
      } catch {
        item.retry_count = (item.retry_count || 0) + 1;
        await OfflineStore.put(item);
      }
    }
  }

  async function runSync() {
    if (!canSyncNow() || typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    try {
      await purgeExpiredCache();
      await flushLocalCaptures();
      if (typeof apiDhis2 !== 'undefined') await apiDhis2.syncIfReady({ silent: true });
      // silencieux : synchronisation automatique en arrière-plan, ne doit jamais
      // afficher de toast d'erreur si l'utilisateur n'a pas la permission
      // sync:gestion (ex : agent terrain, laboratoire) — ce n'est pas une action
      // qu'il a demandée.
      if (typeof apiSync !== 'undefined') await apiSync.processQueue(true);
      registerSuccess();
    } catch {
      registerFailure();
    }
  }

  function scheduleAutoSync() {
    if (_timer) clearInterval(_timer);
    if (!_settings.auto_sync || !_settings.frequence) return;
    const ms = Math.max(1, Number(_settings.frequence)) * 60 * 1000;
    _timer = setInterval(runSync, ms);
  }

  function init() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    loadSettings().then(() => {
      scheduleAutoSync();
      if (canSyncNow()) runSync();
    });
    window.addEventListener('online', () => {
      _backoffUntil = 0;
      loadSettings().then(runSync);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && canSyncNow()) runSync();
    });
  }

  return { init, runSync, loadSettings, scheduleAutoSync };
})();

window.EntomoOfflineSync = EntomoOfflineSync;
