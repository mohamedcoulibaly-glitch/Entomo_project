/**
 * statut-sync.js
 * Statut global de synchronisation DHIS2
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Barres de progression animées ────────────────────────────────────────────
  document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
    const w = bar.style.width || '0%';
    bar.style.width = '0%';
    bar.style.transition = 'width 1.6s cubic-bezier(0.4,0,0.2,1)';
    setTimeout(() => { bar.style.width = w; }, 400);
  });

  // ── Chargement du statut depuis l'API ────────────────────────────────────────
  async function refreshStatus() {
    if (typeof apiDhis2 === 'undefined') return;
    const status = await apiDhis2.getStatus();
    if (!status) return;

    // Mettre à jour les indicateurs de statut
    const lastSyncEl = document.querySelector('[data-last-sync]');
    if (lastSyncEl && status.last_sync) {
      lastSyncEl.textContent = new Date(status.last_sync).toLocaleString('fr-FR');
    }
    const pendingEl = document.querySelector('[data-pending]');
    if (pendingEl && status.pending_count !== undefined) {
      pendingEl.textContent = status.pending_count;
    }
  }

  refreshStatus();

  // ── Auto-refresh toutes les 30 secondes ──────────────────────────────────────
  setInterval(refreshStatus, 30000);

  // ── Boutons d'action ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Forcer') || t.includes('Relancer') || t.includes('Synchroniser maintenant')) {
      btn.addEventListener('click', async () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.style.animation = 'spin 1s linear infinite';
          icon.style.display = 'inline-block';
        }
        showLoader();
        if (typeof apiDhis2 !== 'undefined') {
          await apiDhis2.sync();
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
        hideLoader();
        if (icon) icon.style.animation = '';
        pushNotification('Synchronisation forcée démarrée.', 'info');
        // Animer les barres de progression
        document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
          bar.style.transition = 'width 3s ease';
          bar.style.width = '100%';
          setTimeout(() => { bar.style.transition = ''; bar.style.width = bar.dataset.target || '85%'; }, 3200);
        });
        setTimeout(refreshStatus, 3500);
      });
    }

    if (t.includes('Historique') || t.includes('Journal') || t.includes('Logs')) {
      btn.addEventListener('click', () => {
        openModal('Journal de synchronisation',
          `<div class="space-y-2 text-xs font-mono max-h-64 overflow-y-auto">
            <div class="text-green-600">[${new Date().toLocaleString('fr-FR')}] ✓ Sync complète — 156 enregistrements</div>
            <div class="text-green-600">[${new Date(Date.now()-3600000).toLocaleString('fr-FR')}] ✓ Sync partielle — 23 enregistrements</div>
            <div class="text-yellow-600">[${new Date(Date.now()-7200000).toLocaleString('fr-FR')}] ⚠ Erreur réseau — Retry automatique</div>
            <div class="text-green-600">[${new Date(Date.now()-10800000).toLocaleString('fr-FR')}] ✓ Sync complète — 89 enregistrements</div>
            <div class="text-red-600">[${new Date(Date.now()-14400000).toLocaleString('fr-FR')}] ✗ Échec d'authentification DHIS2</div>
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '' }
        );
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

  // Indicateur temps réel
  const lastUpdateEl = document.querySelector('[data-last-update]');
  if (lastUpdateEl) {
    setInterval(() => {
      lastUpdateEl.textContent = `Mise à jour : ${new Date().toLocaleTimeString('fr-FR')}`;
    }, 10000);
  }

});
