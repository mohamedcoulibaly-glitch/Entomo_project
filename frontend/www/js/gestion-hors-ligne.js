document.addEventListener('DOMContentLoaded', async () => {
  // initTheme()/initActiveNav()/initMobileMenu() sont déjà appelées globalement
  // par core.js sur chaque page — les rappeler ici double les gestionnaires de
  // clic (ex: le bouton clair/sombre bascule puis re-bascule aussitôt dans le
  // même clic, sans effet visible).
  updateConnStatus();
  window.addEventListener('online', () => { updateConnStatus(); loadAll(); });
  window.addEventListener('offline', updateConnStatus);

  await loadAll();

  document.getElementById('btn-sync')?.addEventListener('click', handleSync);
  document.getElementById('btn-clear-cache')?.addEventListener('click', handleClearCache);
  document.getElementById('btn-settings')?.addEventListener('click', handleOpenSettings);
  document.getElementById('search-offline')?.addEventListener('input', handleSearchOffline);
  document.getElementById('select-all')?.addEventListener('change', handleSelectAll);
  document.getElementById('btn-bulk-sync')?.addEventListener('click', handleBulkSync);

  document.getElementById('offline-table-body')?.addEventListener('change', (e) => {
    if (!e.target.classList.contains('offline-checkbox')) return;
    const anyChecked = document.querySelectorAll('.offline-checkbox:checked').length > 0;
    document.getElementById('offline-bulk-actions')?.classList.toggle('hidden', !anyChecked);
    const selectAll = document.getElementById('select-all');
    const boxes = document.querySelectorAll('.offline-checkbox');
    if (selectAll && boxes.length) {
      selectAll.checked = boxes.length === document.querySelectorAll('.offline-checkbox:checked').length;
    }
  });
});

let _offlineData = [];
let _pagination = null;

async function loadAll() {
  await Promise.all([
    loadSyncStatus(),
    loadSyncSettings(),
    loadPendingData(),
    loadSyncHistory(),
  ]);
  updatePageSubtitle();
}

function updateConnStatus() {
  const online = navigator.onLine;
  const dot = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  if (dot) {
    dot.className = dot.className.replace(/bg-green-500|bg-red-500/g, '');
    dot.classList.add(online ? 'bg-green-500' : 'bg-red-500');
    const ping = dot.previousElementSibling;
    if (ping) {
      ping.className = ping.className.replace(/bg-green-400|bg-red-400/g, '');
      ping.classList.add(online ? 'bg-green-400' : 'bg-red-400');
    }
  }
  if (label) label.textContent = online ? 'En ligne' : 'Hors ligne';
}

async function loadSyncStatus() {
  try {
    const status = await apiDhis2.getStatus();
    if (!status) return;

    const lastSync = status.last_sync || status.derniere_sync || null;
    const pending = status.pending_count ?? status.en_attente ?? 0;
    const synced = status.synced_count ?? status.synchronises ?? 0;
    const errors = status.queue_error_count ?? status.error_count ?? status.erreurs ?? 0;
    const conflicts = status.conflict_count ?? 0;

    setTextContent('stat-last-sync', formatDate(lastSync));
    setTextContent('stat-last-sync-ago', lastSync ? timeAgo(lastSync) : '');
    setTextContent('stat-pending', pending);
    setTextContent('stat-synced', synced);
    setTextContent('stat-errors', errors);
    setTextContent('stat-conflicts', conflicts);
  } catch {
    setTextContent('stat-last-sync', '—');
    setTextContent('stat-pending', '0');
    setTextContent('stat-synced', '0');
    setTextContent('stat-errors', '0');
  }
}

async function loadSyncSettings() {
  try {
    const settings = await apiSync.settings();
    if (!settings) return;

    const freq = settings.frequence ?? settings.frequency ?? 60;
    const wifiOnly = settings.wifi_only ?? false;
    const autoSync = settings.auto_sync ?? true;

    const freqLabel = freq === 0 ? 'Manuel' : freq < 60 ? `Toutes les ${freq} min` : `Toutes les ${freq / 60}h`;
    setTextContent('prefs-auto-sync', `Auto-sync: ${autoSync ? freqLabel : 'Désactivé'}`);
    setTextContent('prefs-wifi', `Wi-Fi: ${wifiOnly ? 'Uniquement' : 'Tous réseaux'}`);

    const prefsSummary = document.getElementById('prefs-summary');
    if (prefsSummary) prefsSummary.classList.remove('hidden');

    if (window.EntomoOfflineSync) {
      await window.EntomoOfflineSync.loadSettings();
      window.EntomoOfflineSync.scheduleAutoSync();
    }
  } catch {
    /* silencieux */
  }
}

function mapQueueItem(item) {
  const statut =
    item.statut === 'conflict' ? 'conflit'
    : item.statut === 'error' ? 'erreur'
    : item.statut === 'synced' ? 'synchronise'
    : 'en_attente';
  return {
    id: item.resource_id || item.id,
    queue_item_id: item.id,
    type: item.resource_type || 'File serveur',
    code: item.payload?.code || `QUEUE-${item.id}`,
    statut,
    modified_at: item.created_at || item.updated_at,
    site_nom: item.payload?.site_nom,
    espece: item.payload?.espece,
    error_message: item.error_message,
  };
}

function mapCaptureItem(capture) {
  return {
    id: capture.id,
    queue_item_id: null,
    type: capture.type || 'Capture entomologique',
    code: capture.code || `SPN-${String(capture.id).padStart(5, '0')}`,
    statut: capture.statut || 'a_valider',
    modified_at: capture.modified_at || capture.date_capture || capture.updated_at,
    site_nom: capture.site_nom,
    espece: capture.espece,
  };
}

async function loadPendingData() {
  try {
    const merged = [];
    const seen = new Set();

    if (navigator.onLine) {
      const [captures, queueItems] = await Promise.all([
        apiDhis2.listPending().catch(() => []),
        apiSync.listQueue().catch(() => []),
      ]);

      for (const item of (queueItems || []).filter(q =>
        q.statut === 'pending' || q.statut === 'error' || q.statut === 'conflict'
      )) {
        merged.push(mapQueueItem(item));
        seen.add(`queue-${item.id}`);
      }

      for (const capture of captures || []) {
        if (!seen.has(`capture-${capture.id}`)) {
          merged.push(mapCaptureItem(capture));
          seen.add(`capture-${capture.id}`);
        }
      }
    }

    const localItems = typeof OfflineStore !== 'undefined' ? await OfflineStore.list() : [];
    for (const item of localItems) {
      merged.push({
        id: item.resource_id || item.local_id,
        queue_item_id: null,
        local_id: item.local_id,
        type: item.resource_type || 'Capture locale',
        code: item.payload?.code || `LOCAL-${item.local_id}`,
        statut: item.statut || 'en_attente',
        modified_at: item.cached_at,
        site_nom: item.payload?.site_nom,
        espece: item.payload?.espece,
      });
    }

    _offlineData = merged;
    renderOfflineTable(_offlineData);
  } catch {
    const localItems = typeof OfflineStore !== 'undefined' ? await OfflineStore.list() : [];
    _offlineData = localItems.map(item => ({
      id: item.resource_id || item.local_id,
      queue_item_id: null,
      local_id: item.local_id,
      type: item.resource_type || 'Capture locale',
      code: item.payload?.code || `LOCAL-${item.local_id}`,
      statut: item.statut || 'en_attente',
      modified_at: item.cached_at,
    }));
    renderOfflineTable(_offlineData);
  }
}

function renderOfflineTable(data) {
  const tbody = document.getElementById('offline-table-body');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-400">
      <span class="material-symbols-outlined text-4xl block mb-2">cloud_done</span>
      Aucune donnée hors ligne en attente
    </td></tr>`;
    updatePaginationInfo(0);
    return;
  }

  tbody.innerHTML = data.map(d => {
    const statusBadge = getStatusBadge(d.statut || 'a_valider');
    const dataType = d.type || 'Capture entomologique';
    const identifier = d.code || d.identifiant || `SPN-${String(d.id || 0).padStart(5, '0')}`;
    const date = d.modified_at || d.updated_at || d.created_at || d.date_capture;
    const detailUrl = d.type === 'fiche_gite'
      ? `details-gite.html?id=${d.id}`
      : `details-capture.html?id=${d.id}`;
    const actionLabel = d.statut === 'conflit' ? 'Résoudre' : 'Prévisualiser';
    const replayId = d.queue_item_id || '';

    return `<tr class="bg-white dark:bg-gray-900 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" data-id="${d.id}">
      <td class="w-4 p-4"><input class="offline-checkbox h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-brand-primary focus:ring-brand-primary" type="checkbox" data-id="${d.id}" data-queue-id="${replayId}"/></td>
      <td class="px-6 py-4">${statusBadge}</td>
      <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">${escapeHtml(dataType)}</td>
      <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${escapeHtml(identifier)}</td>
      <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${date ? formatDate(date) : '—'}</td>
      <td class="px-6 py-4 text-right"><a class="font-medium text-brand-primary hover:underline" href="${detailUrl}">${actionLabel}</a></td>
    </tr>`;
  }).join('');

  initPaginationClient('offline-table-body', 'offline-pagination', 10);
}

function getStatusBadge(statut) {
  const map = {
    conflit: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Conflit</span>',
    erreur: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Erreur</span>',
    synchronise: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Synchronisé</span>',
    nouveau: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Nouveau</span>',
    modifie: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Modifié</span>',
    a_valider: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">À valider</span>',
    en_attente: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">En attente</span>',
    synchro: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Synchronisé</span>',
  };
  return map[statut] || map.a_valider;
}

function updatePageSubtitle() {
  const el = document.getElementById('page-subtitle');
  const title = document.getElementById('page-title');
  if (!el || !title) return;

  const pending = parseInt(document.getElementById('stat-pending')?.textContent) || 0;
  const errors = parseInt(document.getElementById('stat-errors')?.textContent) || 0;

  if (pending === 0 && errors === 0) {
    title.textContent = 'Toutes les données sont synchronisées';
    el.textContent = 'Aucune donnée en attente de synchronisation';
  } else {
    const parts = [];
    if (pending > 0) parts.push(`${pending} en attente`);
    if (errors > 0) parts.push(`${errors} erreur${errors > 1 ? 's' : ''}`);
    el.textContent = parts.join(', ');
  }
}

function hideProgressBar(progressContainer, progressBar, progressPct, progressLabel) {
  if (progressContainer) progressContainer.classList.add('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressPct) progressPct.textContent = '0%';
  if (progressLabel) progressLabel.textContent = 'Synchronisation en cours...';
}

async function handleSync() {
  const btn = document.getElementById('btn-sync');
  const progressContainer = document.getElementById('sync-progress-container');
  const progressBar = document.getElementById('sync-progress-bar');
  const progressPct = document.getElementById('sync-progress-pct');
  const progressLabel = document.getElementById('sync-progress-label');
  const progressDetail = document.getElementById('sync-progress-detail');

  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('opacity-60', 'cursor-wait');

  if (progressContainer) progressContainer.classList.remove('hidden');

  let pct = 0;
  let queueResult = null;
  let result = null;

  try {
    if (navigator.onLine) {
      const status = await apiDhis2.getStatus();
      const configId = status?.config_id || 1;
      result = await apiDhis2.sync(configId);
      queueResult = await apiSync.processQueue();
      const processed = queueResult?.processed || 0;
      const synced = queueResult?.synced || 0;
      pct = processed > 0 ? Math.round((synced / processed) * 100) : 100;

      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPct) progressPct.textContent = `${pct}%`;
      if (progressLabel) progressLabel.textContent = queueResult?.errors ? 'Synchronisation partielle' : 'Synchronisation terminée !';
      if (progressDetail) {
        progressDetail.textContent = `${processed} élément(s) de file traité(s)`;
      }

      if (result && (!queueResult || queueResult.errors === 0)) {
        pushNotification('Données synchronisées avec succès.', 'success');
      } else if (queueResult?.errors > 0) {
        pushNotification(`${queueResult.errors} erreur(s) lors du traitement de la file.`, 'warning');
      }
    } else {
      pushNotification('Hors ligne : les actions seront synchronisées à la reconnexion.', 'warning');
      pct = 0;
      if (progressLabel) progressLabel.textContent = 'En attente de connexion';
    }
  } catch (err) {
    if (progressLabel) progressLabel.textContent = 'Échec de la synchronisation';
    if (progressDetail) progressDetail.textContent = err?.message || 'Impossible de joindre le serveur.';
    pushNotification('Erreur lors de la synchronisation.', 'error');
  }

  btn.disabled = false;
  btn.classList.remove('opacity-60', 'cursor-wait');

  await loadAll();
  setTimeout(() => hideProgressBar(progressContainer, progressBar, progressPct, progressLabel), 2500);
}

async function handleBulkSync() {
  const selected = [...document.querySelectorAll('.offline-checkbox:checked')];
  if (!selected.length) {
    pushNotification('Sélectionnez au moins un élément.', 'warning');
    return;
  }

  let replayed = 0;
  let needsDhis2Sync = false;

  for (const cb of selected) {
    const queueId = cb.dataset.queueId;
    if (queueId) {
      try {
        await apiSync.replay(queueId);
        replayed += 1;
      } catch { /* continue */ }
    } else {
      needsDhis2Sync = true;
    }
  }

  if (needsDhis2Sync && navigator.onLine) {
    await apiDhis2.syncIfReady({ silent: true });
  }

  pushNotification(`${replayed || selected.length} élément(s) relancé(s).`, 'success');
  document.getElementById('offline-bulk-actions')?.classList.add('hidden');
  await loadAll();
}

function handleClearCache() {
  confirmDelete('toutes les données hors-ligne en cache', async () => {
    try {
      const res = await apiSync.clearCache();
      if (res !== null) {
        if (typeof OfflineStore !== 'undefined') await OfflineStore.clear();
        pushNotification('Cache local effacé avec succès.', 'warning');
        _offlineData = [];
        renderOfflineTable([]);
        setTextContent('stat-pending', '0');
        setTextContent('stat-synced', '0');
        setTextContent('stat-errors', '0');
        updatePageSubtitle();
      } else {
        pushNotification('Erreur lors du vidage du cache.', 'error');
      }
    } catch {
      pushNotification('Erreur lors du vidage du cache.', 'error');
    }
  });
}

async function handleOpenSettings() {
  let saved = {
    auto_sync: true,
    frequence: 60,
    stockage_max: 100,
    wifi_only: false,
    cache_expiry_hours: 72,
  };

  try {
    const apiSettings = await apiSync.settings();
    if (apiSettings) {
      saved = { ...saved, ...apiSettings };
    }
  } catch { /* fallback */ }

  openModal('Paramètres de synchronisation',
    `<div class="space-y-5 text-sm">
      <div class="flex items-center justify-between">
        <div>
          <label class="font-medium text-gray-900 dark:text-white">Synchronisation automatique</label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Synchroniser les données automatiquement</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input id="ol-auto-sync" type="checkbox" ${saved.auto_sync ? 'checked' : ''} class="sr-only peer"/>
          <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-primary dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
        </label>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Fréquence de synchronisation</label>
        <select id="ol-freq" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none">
          <option value="15" ${Number(saved.frequence) === 15 ? 'selected' : ''}>Toutes les 15 minutes</option>
          <option value="30" ${Number(saved.frequence) === 30 ? 'selected' : ''}>Toutes les 30 minutes</option>
          <option value="60" ${Number(saved.frequence) === 60 ? 'selected' : ''}>Toutes les heures</option>
          <option value="360" ${Number(saved.frequence) === 360 ? 'selected' : ''}>Toutes les 6 heures</option>
          <option value="1440" ${Number(saved.frequence) === 1440 ? 'selected' : ''}>Une fois par jour</option>
          <option value="0" ${Number(saved.frequence) === 0 ? 'selected' : ''}>Manuellement seulement</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Limite de stockage local (MB)</label>
        <input id="ol-storage" type="range" min="10" max="500" value="${saved.stockage_max}" class="w-full accent-brand-primary"/>
        <div class="flex justify-between mt-1">
          <span class="text-xs text-gray-500">10 MB</span>
          <span class="text-xs font-medium text-brand-primary"><span id="ol-storage-value">${saved.stockage_max}</span> MB</span>
          <span class="text-xs text-gray-500">500 MB</span>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <label class="font-medium text-gray-900 dark:text-white">Synchroniser sur Wi-Fi uniquement</label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Économiser les données mobiles</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input id="ol-wifi-only" type="checkbox" ${saved.wifi_only ? 'checked' : ''} class="sr-only peer"/>
          <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-primary dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
        </label>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Expiration du cache (heures)</label>
        <input id="ol-cache-expiry" type="number" min="1" max="720" value="${saved.cache_expiry_hours || 72}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"/>
      </div>
    </div>`,
    {
      confirmLabel: 'Sauvegarder',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const payload = {
          auto_sync: document.getElementById('ol-auto-sync')?.checked ?? true,
          frequence: parseInt(document.getElementById('ol-freq')?.value || '60'),
          stockage_max: parseInt(document.getElementById('ol-storage')?.value || '100'),
          wifi_only: document.getElementById('ol-wifi-only')?.checked ?? false,
          cache_expiry_hours: parseInt(document.getElementById('ol-cache-expiry')?.value || '72'),
        };
        try {
          const res = await apiSync.saveSettings(payload);
          if (res !== null) {
            pushNotification('Paramètres de synchronisation sauvegardés.', 'success');
            await loadSyncSettings();
          } else {
            pushNotification('Erreur lors de la sauvegarde des paramètres.', 'error');
          }
        } catch {
          pushNotification('Erreur lors de la sauvegarde.', 'error');
        }
      },
    }
  );

  document.getElementById('ol-storage')?.addEventListener('input', e => {
    const display = document.getElementById('ol-storage-value');
    if (display) display.textContent = e.target.value;
  });
}

async function loadSyncHistory() {
  const container = document.getElementById('sync-history-list');
  if (!container) return;

  try {
    const history = await apiDhis2.getHistorique(1);
    if (!history || !history.length) {
      container.innerHTML = `<div class="p-6 text-center text-gray-400">
        <span class="material-symbols-outlined text-3xl block mb-2">history</span>
        Aucun historique de synchronisation
      </div>`;
      return;
    }

    container.innerHTML = history.slice(0, 15).map(h => {
      const isSuccess = h.statut === 'succes' || h.statut === 'success' || h.success === true;
      const icon = isSuccess ? 'check_circle' : 'error';
      const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';
      const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';
      const date = h.date_sync || h.date || h.created_at || h.timestamp;
      const details = h.details || h.message || '';
      const count = h.items_count ?? h.nombre_elements ?? h.nb_enregistrements ?? null;

      return `<div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div class="p-1.5 rounded-full ${bgColor} mt-0.5">
          <span class="material-symbols-outlined text-sm ${iconColor}">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              ${isSuccess ? 'Synchronisation réussie' : 'Échec de synchronisation'}
              ${count !== null ? `<span class="font-normal text-gray-500 dark:text-gray-400"> — ${count} élément${count > 1 ? 's' : ''}</span>` : ''}
            </p>
            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${date ? formatDate(date) : '—'}</span>
          </div>
          ${details ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">${escapeHtml(String(details))}</p>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch {
    container.innerHTML = `<div class="p-6 text-center text-gray-400">
      <span class="material-symbols-outlined text-3xl block mb-2">cloud_off</span>
      Impossible de charger l'historique
    </div>`;
  }
}

function handleSearchOffline() {
  const query = document.getElementById('search-offline')?.value?.toLowerCase().trim() || '';
  if (!query) {
    renderOfflineTable(_offlineData);
    return;
  }
  const filtered = _offlineData.filter(d => {
    const searchStr = [
      d.type, d.code, d.identifiant, d.statut,
      d.site, d.region, d.utilisateur
    ].filter(Boolean).join(' ').toLowerCase();
    return searchStr.includes(query);
  });
  renderOfflineTable(filtered);
}

function handleSelectAll(e) {
  const checked = e.target.checked;
  document.querySelectorAll('.offline-checkbox').forEach(cb => {
    cb.checked = checked;
  });
  const bulkBar = document.getElementById('offline-bulk-actions');
  if (bulkBar) bulkBar.classList.toggle('hidden', !checked);
}

function initPaginationClient(tbodyId, paginationId, pageSize = 10) {
  const tbody = document.getElementById(tbodyId);
  const paginationEl = document.getElementById(paginationId);
  if (!tbody || !paginationEl) return;

  let currentPage = 1;

  function render() {
    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    rows.forEach((r, i) => {
      r.style.display = (i >= (currentPage - 1) * pageSize && i < currentPage * pageSize) ? '' : 'none';
    });

    const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, total);
    const info = document.getElementById('pagination-info');
    if (info) {
      info.innerHTML = `Affiche <span class="font-medium text-gray-900 dark:text-white">${from}</span> à
        <span class="font-medium text-gray-900 dark:text-white">${to}</span> sur
        <span class="font-medium text-gray-900 dark:text-white">${total}</span> résultats`;
    }

    const linksEl = document.getElementById('pagination-links');
    if (!linksEl) return;

    let html = '';
    html += `<li><button class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}" data-page="prev">
      <span class="material-symbols-outlined text-base">chevron_left</span></button></li>`;

    const maxPages = Math.min(pages, 5);
    for (let p = 1; p <= maxPages; p++) {
      const active = p === currentPage;
      html += `<li><button class="flex items-center justify-center px-3 h-8 leading-tight border dark:border-gray-700 ${active ? 'text-white bg-brand-primary border-brand-primary' : 'text-gray-500 bg-white dark:bg-gray-900 border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}" data-page="${p}">${p}</button></li>`;
    }

    html += `<li><button class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${currentPage === pages ? 'opacity-40 pointer-events-none' : ''}" data-page="next">
      <span class="material-symbols-outlined text-base">chevron_right</span></button></li>`;

    linksEl.innerHTML = html;

    linksEl.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'prev' && currentPage > 1) currentPage--;
        else if (page === 'next' && currentPage < pages) currentPage++;
        else if (page !== 'prev' && page !== 'next') currentPage = parseInt(page);
        render();
      });
    });
  }

  render();
}

function updatePaginationInfo(total) {
  const info = document.getElementById('pagination-info');
  if (info) info.innerHTML = `<span class="font-medium">${total}</span> résultat${total > 1 ? 's' : ''}`;
}

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
