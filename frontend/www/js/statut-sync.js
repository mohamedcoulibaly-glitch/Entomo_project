document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
    const w = bar.style.width || '0%';
    bar.style.width = '0%';
    bar.style.transition = 'width 1.6s cubic-bezier(0.4,0,0.2,1)';
    setTimeout(() => { bar.style.width = w; }, 400);
  });

  await refreshStatus();
  setInterval(refreshStatus, 30000);

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Forcer') || t.includes('Relancer') || t.includes('Synchroniser maintenant') || btn.id === 'btn-launch-sync') {
      btn.addEventListener('click', async () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.style.animation = 'spin 1s linear infinite';
          icon.style.display = 'inline-block';
        }
        buttonLoading(btn, true);
        try {
          const res = await apiDhis2.sync();
          if (res) {
            pushNotification('Synchronisation forcée démarrée.', 'info');
            document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
              bar.style.transition = 'width 3s ease';
              bar.style.width = '100%';
              setTimeout(() => { bar.style.transition = ''; bar.style.width = bar.dataset.target || '85%'; }, 3200);
            });
            setTimeout(refreshStatus, 3500);
          }
        } catch (err) { pushNotification('Erreur lors de la synchronisation.', 'error'); }
        buttonLoading(btn, false);
        if (icon) icon.style.animation = '';
      });
    }

    if (t.includes('Historique') || t.includes('Journal') || t.includes('Logs')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const historique = await apiDhis2.getHistorique(1);
          if (historique && historique.length) {
            openModal('Journal de synchronisation',
              `<div class="space-y-2 text-xs font-mono max-h-64 overflow-y-auto">
                ${historique.map(h => `<div class="${h.statut === 'succes' || h.statut === 'success' ? 'text-green-600' : h.statut === 'erreur' || h.statut === 'error' ? 'text-red-600' : 'text-yellow-600'}">[${h.date ? new Date(h.date).toLocaleString('fr-FR') : '—'}] ${h.icon || ''} ${h.message || h.statut || ''}</div>`).join('')}
              </div>`,
              { confirmLabel: 'Fermer', cancelLabel: '' }
            );
          } else {
            pushNotification('Aucun historique de synchronisation.', 'info');
          }
        } catch (err) { pushNotification('Erreur lors du chargement de l\'historique.', 'error'); }
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
        if (icon) { icon.classList.add('animate-spin'); setTimeout(() => icon.classList.remove('animate-spin'), 1500); }
        await refreshStatus();
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

  async function refreshStatus() {
    try {
      const status = await apiDhis2.getStatus();
      if (!status) return;
      const lastSyncEl = document.querySelector('[data-last-sync]');
      if (lastSyncEl && status.last_sync) {
        lastSyncEl.textContent = new Date(status.last_sync).toLocaleString('fr-FR');
      }
      const pendingEl = document.querySelector('[data-pending]');
      if (pendingEl && status.pending_count !== undefined) {
        pendingEl.textContent = status.pending_count;
      }
      const progressEl = document.querySelector('[data-sync-progress]');
      const progress = status.sync_percentage ?? status.progress;
      if (progressEl && progress !== undefined) {
        progressEl.style.width = `${progress}%`;
      }
      const statusEl = document.querySelector('[data-sync-status]');
      const currentStatus = status.last_status ?? status.statut;
      if (statusEl && currentStatus) {
        statusEl.textContent = currentStatus;
        statusEl.className = statusEl.className.replace(/text-\w+-\d+/g, '');
        statusEl.classList.add(currentStatus === 'succes' || currentStatus === 'success' ? 'text-green-600' : currentStatus === 'erreur' || currentStatus === 'echec' ? 'text-red-600' : 'text-yellow-600');
      }
      const historiques = status.config_id ? await apiDhis2.getHistorique(status.config_id) : [];
      if (historiques && historiques.length > 0) {
        const logContainer = document.querySelector('[data-log-container]');
        if (logContainer) {
          logContainer.innerHTML = historiques.slice(0, 10).map(h =>
            `<div class="text-xs font-mono ${h.statut === 'succes' || h.statut === 'success' ? 'text-green-600' : h.statut === 'erreur' || h.statut === 'error' ? 'text-red-600' : 'text-yellow-600'}">[${h.date ? new Date(h.date).toLocaleString('fr-FR') : '—'}] ${h.message || h.statut || ''}</div>`
          ).join('');
        }
      }
    } catch (err) { /* silencieux */ }
  }
});
