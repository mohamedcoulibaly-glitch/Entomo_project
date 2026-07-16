/**
 * dashboard-sync-dhis2.js
 * Tableau de bord de synchronisation DHIS2
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement du statut de sync depuis l'API ────────────────────────────────
  async function loadSyncStatus() {
    try {
      const status = typeof apiDhis2 !== 'undefined' ? await apiDhis2.getStatus() : null;
      if (!status) {
        showOfflineMessage();
        return;
      }
      hideOfflineMessage();

      const lastSyncEl = document.querySelector('[data-last-sync]');
      if (lastSyncEl && status.last_sync) {
        lastSyncEl.textContent = new Date(status.last_sync).toLocaleString('fr-FR');
      }

      const pendingEl = document.querySelector('[data-stat="pending"]');
      if (pendingEl !== null && status.pending_count !== undefined) {
        pendingEl.textContent = status.pending_count;
      }

      const successEl = document.querySelector('[data-stat="synced"]');
      if (successEl && status.synced_count !== undefined) {
        successEl.textContent = status.synced_count;
      }

      const errEl = document.querySelector('[data-stat="errors"]');
      if (errEl && status.error_count !== undefined) {
        errEl.textContent = status.error_count;
      }

      const configEl = document.querySelector('[data-stat="config"]');
      if (configEl && status.config_name !== undefined) {
        configEl.textContent = status.config_name;
      }

      updateProgressBars(status);
    } catch (err) {
      console.warn('[dashboard-sync-dhis2] loadSyncStatus error:', err);
      showOfflineMessage();
    }
  }

  function showOfflineMessage() {
    const container = document.querySelector('[data-sync-container]');
    if (container) {
      let msg = container.querySelector('.sync-offline-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'sync-offline-msg col-span-full text-center py-8 text-gray-500 dark:text-gray-400';
        container.prepend(msg);
      }
      msg.innerHTML = '<span class="material-symbols-outlined text-3xl mb-2">cloud_off</span><p>Backend hors ligne. Le statut de synchronisation n\'est pas disponible.</p>';
    }
  }

  function hideOfflineMessage() {
    const msg = document.querySelector('.sync-offline-msg');
    if (msg) msg.remove();
  }

  function updateProgressBars(status) {
    const syncedPct = status.sync_pourcentage || status.sync_percentage || 0;
    document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
      bar.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
      bar.style.width = `${syncedPct}%`;
    });

    const pctText = document.querySelector('[data-sync-pct]');
    if (pctText) pctText.textContent = `${syncedPct}%`;
  }

  // ── Chargement de l'historique ───────────────────────────────────────────────
  async function loadHistorique() {
    try {
      if (typeof apiDhis2 !== 'undefined') {
        return await apiDhis2.getHistorique(1);
      }
    } catch (err) {
      console.warn('[dashboard-sync-dhis2] loadHistorique error:', err);
    }
    return null;
  }

  function renderHistoriqueLogs(entries) {
    if (!entries || !entries.length) {
      return '<div class="text-center py-4 text-gray-500 dark:text-gray-400">Aucun historique de synchronisation.</div>';
    }
    return entries.map(e => {
      const date = e.date_sync || e.date || e.created_at || e.timestamp;
      const formatted = date ? new Date(date).toLocaleString('fr-FR') : '';
      const msg = e.message || e.statut || e.status || JSON.stringify(e);
      const niveau = (e.niveau || e.level || e.statut || 'info').toLowerCase();
      let colorClass = 'text-blue-600 dark:text-blue-400';
      if (niveau === 'success' || niveau === 'succes' || niveau === 'termine') colorClass = 'text-green-600 dark:text-green-400';
      else if (niveau === 'warning' || niveau === 'partiel') colorClass = 'text-yellow-600 dark:text-yellow-400';
      else if (niveau === 'error' || niveau === 'erreur') colorClass = 'text-red-600 dark:text-red-400';
      return `<div class="${colorClass}">[${formatted}] ${msg}</div>`;
    }).join('');
  }

  loadSyncStatus();
  setInterval(loadSyncStatus, 30000);

  // ── Boutons ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if ((t.includes('Synchroniser') || t.includes('Lancer sync') || t.includes('Forcer')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = 'sync';
          icon.style.animation = 'spin 1s linear infinite';
        }
        showLoader();
        try {
          if (typeof apiDhis2 !== 'undefined') {
            const result = await apiDhis2.sync(1);
            if (result) {
              pushNotification('Synchronisation DHIS2 lancée avec succès.', 'success');
            } else {
              pushNotification('Erreur lors de la synchronisation DHIS2.', 'error');
            }
          } else {
            pushNotification('API non disponible.', 'error');
          }
        } catch (err) {
          pushNotification("Erreur réseau lors de la synchronisation.", 'error');
        } finally {
          hideLoader();
          buttonLoading(btn, false);
          if (icon) icon.style.animation = '';
          loadSyncStatus();
        }
      });
    }

    if ((t.includes('Configurer') || t.includes('Paramètres')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        window.location.href = 'config-dhis2.html';
      });
    }

    if ((t.includes('Valider') || t.includes('Vérifier données')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        window.location.href = 'validation-dhis2.html';
      });
    }

    if ((t.includes('Historique') || t.includes('Logs') || t.includes('Journal')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        showLoader();
        try {
          const historique = await loadHistorique();
          const logsHtml = renderHistoriqueLogs(historique);
          openModal('Journal de synchronisation DHIS2',
            `<div class="space-y-1.5 text-xs font-mono max-h-72 overflow-y-auto">${logsHtml}</div>`,
            { confirmLabel: 'Fermer', cancelLabel: '', confirmClass: 'bg-brand-primary text-white' }
          );
        } catch (err) {
          pushNotification("Erreur lors du chargement de l'historique.", 'error');
        } finally {
          hideLoader();
        }
      });
    }

    if ((t.includes('Actualiser') || t.includes('Rafraîchir')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');
        await loadSyncStatus();
        if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 600);
        pushNotification('Statut actualisé.', 'success');
      });
    }
  });

  // ── Indicateur de connexion DHIS2 ────────────────────────────────────────────
  try {
    const dhisIndicator = document.querySelector('[data-dhis2-status]');
    if (dhisIndicator) {
      if (typeof checkApiHealth !== 'undefined') {
        const ok = await checkApiHealth();
        dhisIndicator.textContent = ok ? 'Connecté' : 'Déconnecté';
        dhisIndicator.classList.toggle('text-green-600', ok);
        dhisIndicator.classList.toggle('text-red-600', !ok);
      } else {
        dhisIndicator.textContent = 'Inconnu';
        dhisIndicator.classList.add('text-gray-500');
      }
    }
  } catch (err) {
    const dhisIndicator = document.querySelector('[data-dhis2-status]');
    if (dhisIndicator) {
      dhisIndicator.textContent = 'Déconnecté';
      dhisIndicator.classList.add('text-red-600');
    }
  }

});
