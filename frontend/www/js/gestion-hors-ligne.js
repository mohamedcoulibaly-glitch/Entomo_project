/**
 * gestion-hors-ligne.js
 * Gestion des données hors-ligne (offline sync)
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── État de connectivité ──────────────────────────────────────────────────────
  function updateConnStatus() {
    const online = navigator.onLine;
    const badge = document.querySelector('[data-conn-status], .conn-status');
    if (badge) {
      badge.textContent = online ? 'En ligne' : 'Hors ligne';
      badge.className = badge.className
        .replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '');
      if (online) {
        badge.classList.add('bg-green-100', 'text-green-800');
      } else {
        badge.classList.add('bg-red-100', 'text-red-800');
      }
    }
    const statusIcons = document.querySelectorAll('[class*="rounded-full"][class*="bg-"]');
    statusIcons.forEach(el => {
      if (el.textContent.trim() === '') { // indicateur visuel
        el.classList.toggle('bg-green-500', online);
        el.classList.toggle('bg-red-500', !online);
      }
    });
  }

  window.addEventListener('online',  updateConnStatus);
  window.addEventListener('offline', updateConnStatus);
  updateConnStatus();

  // ── Barre de progression animée ────────────────────────────────────────────
  document.querySelectorAll('[class*="h-2"] > div, [class*="h-3"] > div').forEach(bar => {
    const w = bar.style.width || '0%';
    bar.style.width = '0%';
    bar.style.transition = 'width 1.4s cubic-bezier(0.4,0,0.2,1)';
    setTimeout(() => { bar.style.width = w; }, 300);
  });

  // ── Boutons d'action ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Synchroniser') || t.includes('Envoyer') || t.includes('Uploader')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 2500));
        hideLoader();
        pushNotification('Données hors-ligne synchronisées avec succès.', 'success');
        // Mettre à jour les badges "En attente" → "Synchronisé"
        document.querySelectorAll('[class*="rounded-full"]').forEach(el => {
          if (el.textContent.trim() === 'En attente' || el.textContent.trim() === 'Offline') {
            el.classList.remove('bg-yellow-100', 'text-yellow-800');
            el.classList.add('bg-green-100', 'text-green-800');
            el.textContent = 'Synchronisé';
          }
        });
        // Mettre à jour compteurs
        document.querySelectorAll('[data-pending]').forEach(el => { el.textContent = '0'; });
      });
    }

    if (t.includes('Effacer') || t.includes('Supprimer données') || t.includes('Vider cache')) {
      btn.addEventListener('click', () => {
        confirmDelete('toutes les données hors-ligne en cache', () => {
          localStorage.removeItem('offline_data');
          pushNotification('Cache local effacé.', 'warning');
          document.querySelectorAll('[data-pending]').forEach(el => { el.textContent = '0'; });
        });
      });
    }

    if (t.includes('Paramètres') || t.includes('Configurer')) {
      btn.addEventListener('click', () => {
        openModal('Paramètres hors-ligne',
          `<div class="space-y-4 text-sm">
            <div class="flex items-center justify-between">
              <label class="font-medium">Synchronisation automatique</label>
              <input type="checkbox" class="w-4 h-4 rounded border-gray-300" checked/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Fréquence de synchronisation
              </label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Toutes les 15 minutes</option>
                <option>Toutes les 30 minutes</option>
                <option selected>Toutes les heures</option>
                <option>Manuellement seulement</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Limite de stockage local (MB)
              </label>
              <input type="range" min="10" max="500" value="100" class="w-full"/>
            </div>
            <div class="flex items-center justify-between">
              <label class="font-medium">Synchroniser sur Wi-Fi uniquement</label>
              <input type="checkbox" class="w-4 h-4 rounded border-gray-300"/>
            </div>
          </div>`,
          {
            confirmLabel: 'Sauvegarder',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Paramètres hors-ligne sauvegardés.', 'success'),
          }
        );
      });
    }

    if (t.includes('Voir détails') || t.includes('Détails')) {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        if (!row) return;
        const cells = row.cells;
        openModal('Détails — Données hors-ligne',
          `<div class="space-y-2 text-sm">
            ${Array.from(cells).map(c => `<div class="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
              <span class="text-gray-500">Champ</span>
              <strong>${c.textContent.trim()}</strong>
            </div>`).join('')}
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '' }
        );
      });
    }
  });

  // ── Compteur de données en attente ─────────────────────────────────────────
  const pending = parseInt(localStorage.getItem('offline_pending') || '0');
  document.querySelectorAll('[data-pending]').forEach(el => {
    if (pending > 0) el.textContent = pending;
  });

});
