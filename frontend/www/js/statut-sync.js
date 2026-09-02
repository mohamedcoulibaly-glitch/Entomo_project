document.addEventListener('DOMContentLoaded', async () => {
  updateConnStatus();
  window.addEventListener('online', updateConnStatus);
  window.addEventListener('offline', updateConnStatus);

  await refreshStatus();
  setInterval(refreshStatus, 30000);

  document.getElementById('btn-launch-sync')?.addEventListener('click', handleLaunchSync);

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (btn.id === 'btn-launch-sync') return;

    if (t.includes('Historique') || t.includes('Journal') || t.includes('Logs')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const status = await apiDhis2.getStatus();
          const historique = status?.config_id
            ? await apiDhis2.getHistorique(status.config_id)
            : [];
          if (historique && historique.length) {
            openModal('Journal de synchronisation',
              `<div class="space-y-2 text-xs font-mono max-h-64 overflow-y-auto">
                ${historique.map(h => {
                  const date = h.date_sync || h.date;
                  const ok = h.statut === 'succes' || h.statut === 'success';
                  return `<div class="${ok ? 'text-green-600' : 'text-red-600'}">[${date ? new Date(date).toLocaleString('fr-FR') : '—'}] ${h.message || h.statut || ''}</div>`;
                }).join('')}
              </div>`,
              { confirmLabel: 'Fermer', cancelLabel: '' }
            );
          } else {
            pushNotification('Aucun historique de synchronisation.', 'info');
          }
        } catch { pushNotification('Erreur lors du chargement de l\'historique.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Configurer') || t.includes('Paramètres')) {
      btn.addEventListener('click', () => {
        window.location.href = 'param-sync.html';
      });
    }

    if (t.includes('Actualiser') || t.includes('Rafraîchir')) {
      btn.addEventListener('click', async () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');
        await refreshStatus();
        if (icon) icon.classList.remove('animate-spin');
        pushNotification('Statut actualisé.', 'success');
      });
    }
  });

  document.getElementById('btn-resolve-conflicts')?.addEventListener('click', () => {
    openModal('Résoudre les conflits de synchronisation', '<p class="text-sm">Les données en conflit vont être ouvertes dans l’écran de validation DHIS2 afin d’être examinées, corrigées puis retransmises.</p>', {
      confirmLabel: 'Ouvrir la validation',
      onConfirm: () => { window.location.href = 'validation-dhis2.html'; },
    });
  });

  const lastUpdateEl = document.querySelector('[data-last-update]');
  if (lastUpdateEl) {
    setInterval(() => {
      lastUpdateEl.textContent = `Mise à jour : ${new Date().toLocaleTimeString('fr-FR')}`;
    }, 10000);
  }
});

function updateConnStatus() {
  const online = navigator.onLine;
  const label = document.getElementById('conn-label');
  const dot = document.getElementById('conn-dot');
  if (label) {
    label.textContent = online ? 'Statut : En ligne' : 'Statut : Hors ligne';
    label.className = online
      ? 'text-status-green dark:text-status-green text-base font-medium leading-normal'
      : 'text-status-red dark:text-status-red text-base font-medium leading-normal';
  }
  if (dot) {
    dot.className = dot.className.replace(/bg-status-green|bg-status-red/g, '');
    dot.classList.add(online ? 'bg-status-green' : 'bg-status-red');
  }
}

async function handleLaunchSync() {
  const btn = document.getElementById('btn-launch-sync');
  if (!btn) return;
  buttonLoading(btn, true);
  const progressEl = document.querySelector('[data-sync-progress]');
  try {
    const status = await apiDhis2.getStatus();
    const configId = status?.config_id || 1;
    const res = await apiDhis2.sync(configId);
    const queueResult = await apiSync.processQueue();
    if (res) {
      pushNotification('Synchronisation terminée.', 'success');
      if (progressEl && status?.sync_percentage !== undefined) {
        progressEl.style.width = `${status.sync_percentage}%`;
      }
      if (queueResult?.errors > 0) {
        pushNotification(`${queueResult.errors} erreur(s) dans la file hors-ligne.`, 'warning');
      }
    }
    await refreshStatus();
  } catch {
    pushNotification('Erreur lors de la synchronisation.', 'error');
  }
  buttonLoading(btn, false);
}

async function refreshStatus() {
  try {
    const status = await apiDhis2.getStatus();
    if (!status) return;

    const lastSyncEl = document.querySelector('[data-last-sync]');
    if (lastSyncEl && status.last_sync) {
      lastSyncEl.textContent = new Date(status.last_sync).toLocaleString('fr-FR');
    }

    const pendingEl = document.querySelector('[data-pending]');
    if (pendingEl) {
      pendingEl.textContent = status.pending_count ?? 0;
    }

    const conflictsEl = document.getElementById('stat-conflicts');
    const conflictCount = status.conflict_count ?? status.queue_error_count ?? 0;
    if (conflictsEl) conflictsEl.textContent = conflictCount;

    const conflictsCard = document.getElementById('conflicts-card');
    const okCard = document.getElementById('sync-ok-card');
    if (conflictsCard && okCard) {
      const hasConflicts = conflictCount > 0;
      conflictsCard.classList.toggle('hidden', !hasConflicts);
      okCard.classList.toggle('hidden', hasConflicts);
      const conflictTitle = document.getElementById('conflicts-title');
      if (conflictTitle) {
        conflictTitle.textContent = `${conflictCount} conflit${conflictCount > 1 ? 's' : ''} à résoudre`;
      }
    }

    const progressEl = document.querySelector('[data-sync-progress]');
    const progress = status.sync_percentage ?? status.progress;
    if (progressEl && progress !== undefined) {
      progressEl.dataset.target = `${progress}%`;
      progressEl.style.width = `${progress}%`;
    }

    const statusEl = document.querySelector('[data-sync-status]');
    const currentStatus = status.last_status ?? status.statut;
    if (statusEl && currentStatus) {
      statusEl.textContent = currentStatus;
      statusEl.className = statusEl.className.replace(/text-\w+-\d+/g, '');
      statusEl.classList.add(
        currentStatus === 'succes' || currentStatus === 'success'
          ? 'text-green-600'
          : currentStatus === 'erreur' || currentStatus === 'echec'
            ? 'text-red-600'
            : 'text-yellow-600'
      );
    }

    const historiques = status.config_id ? await apiDhis2.getHistorique(status.config_id) : [];
    if (historiques && historiques.length > 0) {
      const logContainer = document.querySelector('[data-log-container]');
      if (logContainer) {
        logContainer.innerHTML = historiques.slice(0, 10).map(h => {
          const date = h.date_sync || h.date;
          const ok = h.statut === 'succes' || h.statut === 'success';
          return `<div class="text-xs font-mono ${ok ? 'text-green-600' : 'text-red-600'}">[${date ? new Date(date).toLocaleString('fr-FR') : '—'}] ${h.message || h.statut || ''}</div>`;
        }).join('');
      }
    }
  } catch { /* silencieux */ }
}
