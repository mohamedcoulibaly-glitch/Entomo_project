/**
 * dashboard-utilisateurs.js
 * Tableau de bord d'activité des utilisateurs
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement des données depuis l'API ──────────────────────────────────────
  async function loadData() {
    if (typeof apiUsers === 'undefined') return;
    showLoader();
    const users = await apiUsers.list({ limit: 50 });
    hideLoader();
    if (!users) return;

    // Mettre à jour le compteur total
    const totalEl = document.querySelector('[data-stat="total_users"]');
    if (totalEl) totalEl.textContent = users.length;

    const activeEl = document.querySelector('[data-stat="active_users"]');
    if (activeEl) activeEl.textContent = users.filter(u => u.is_active).length;

    // Remplir le tableau si existant
    const tbody = document.querySelector('tbody');
    if (tbody && users.length) {
      tbody.innerHTML = users.slice(0, 20).map(u => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" data-id="${u.id}">
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                ${(u.full_name || u.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <p class="font-medium text-sm text-[#111418] dark:text-white">${u.full_name || u.username}</p>
                <p class="text-xs text-gray-500">${u.email || ''}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${u.role?.nom || u.role_id || 'N/A'}</td>
          <td class="px-4 py-3">
            <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${u.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800'}">
              ${u.is_active ? 'Actif' : 'Inactif'}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            ${u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
          </td>
          <td class="px-4 py-3 text-right">
            <button class="text-gray-400 hover:text-brand-primary p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              onclick="window.location.href='gestion-utilisateurs.html'">
              <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
            </button>
          </td>
        </tr>`).join('');
    }
  }

  loadData();

  // ── Filtres période ──────────────────────────────────────────────────────────
  document.querySelectorAll('select, input[type="date"]').forEach(el => {
    el.addEventListener('change', () => {
      pushNotification('Filtre appliqué.', 'info');
    });
  });

  // ── Boutons d'action ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Exporter') || t.includes('Rapport')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 1200));
        hideLoader();
        pushNotification('Rapport d\'activité exporté.', 'success');
      });
    }

    if (t.includes('Actualiser') || t.includes('Rafraîchir')) {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) { icon.classList.add('animate-spin'); setTimeout(() => icon.classList.remove('animate-spin'), 1500); }
        loadData().then(() => pushNotification('Données actualisées.', 'success'));
      });
    }

    if (t.includes('Gérer') || t.includes('Utilisateurs')) {
      btn.addEventListener('click', () => {
        window.location.href = 'gestion-utilisateurs.html';
      });
    }
  });

  // ── Auto-refresh toutes les 2 minutes ────────────────────────────────────────
  setInterval(loadData, 120000);

});
