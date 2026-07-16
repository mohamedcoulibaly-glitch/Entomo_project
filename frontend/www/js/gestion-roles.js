document.addEventListener('DOMContentLoaded', async () => {
  let roles = [];
  let permissions = [];
  let editingId = null;
  let selectedRoleId = null;

  const moduleRows = [
    { key: 'Collecte Terrain', icon: 'science' },
    { key: 'Analyse Labo', icon: 'biotech' },
    { key: 'Tableaux de Bord', icon: 'dashboard' },
    { key: 'Gestion Utilisateurs', icon: 'people' },
  ];

  const actionCols = ['Voir', 'Créer', 'Modifier', 'Valider', 'Exporter'];

  async function loadRoles() {
    try {
      showLoader();
      const data = await apiRoles.list();
      if (data && data.length) {
        roles = data.map(r => ({
          ...r,
          permissions: r.permissions || r.perms || [],
        }));
      }
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des rôles', 'error');
    }
    if (roles.length) {
      selectedRoleId = roles[0].id;
      renderRoleList();
      renderRoleDetail(roles[0]);
    } else {
      renderRoleList();
      renderEmptyDetail();
    }
  }

  function renderRoleList() {
    const container = document.querySelector('.flex.flex-col.gap-2');
    if (!container) return;

    container.innerHTML = roles.map(r => `
      <div class="flex cursor-pointer items-center gap-4 rounded-lg px-4 min-h-[72px] py-2 justify-between role-list-item 
        ${selectedRoleId === r.id
          ? 'bg-primary/10 dark:bg-primary/20 border border-primary/50 dark:border-primary/70'
          : 'bg-white dark:bg-background-dark/50 hover:bg-gray-50 dark:hover:bg-white/5'}"
        data-id="${r.id}">
        <div class="flex items-center gap-4">
          <div class="flex items-center justify-center rounded-lg bg-white dark:bg-background-dark shrink-0 size-12 ${selectedRoleId === r.id ? 'text-primary' : 'text-[#111418] dark:text-white'}">
            <span class="material-symbols-outlined text-3xl">${r.icon || 'admin_panel_settings'}</span>
          </div>
          <div class="flex flex-col justify-center">
            <p class="text-base font-semibold leading-normal line-clamp-1 ${selectedRoleId === r.id ? 'text-primary' : 'text-[#111418] dark:text-white'}">${r.nom}</p>
            <p class="text-sm font-normal leading-normal line-clamp-2 ${selectedRoleId === r.id ? 'text-primary/80' : 'text-[#617589] dark:text-gray-400'}">
              ${r.description || `${r.permissions ? r.permissions.length : 0} permission(s)`}
            </p>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.role-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        const r = roles.find(x => x.id === id);
        if (r) {
          selectedRoleId = id;
          renderRoleList();
          renderRoleDetail(r);
        }
      });
    });
  }

  function renderRoleDetail(r) {
    const container = document.querySelector('.lg\\:col-span-2 > div, [class*="lg:col-span-2"] > div');
    if (!container) return;

    const perms = r.permissions || [];
    const permCount = perms.length;
    const desc = r.description || `${permCount} permission(s)`;

    container.innerHTML = `
      <h3 class="text-xl font-bold text-[#111418] dark:text-white">Permissions pour "${r.nom}"</h3>
      <p class="text-sm text-[#617589] dark:text-gray-400 mt-1">${desc}</p>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-left">
          <thead class="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="p-3 text-sm font-semibold text-[#617589] dark:text-gray-400">Module</th>
              ${actionCols.map(a => `<th class="p-3 text-sm font-semibold text-center text-[#617589] dark:text-gray-400">${a}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${moduleRows.map((mod, modIdx) => `
              <tr class="${modIdx < moduleRows.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}">
                <td class="p-3 font-medium text-[#111418] dark:text-white">${mod.key}</td>
                ${actionCols.map((col, colIdx) => {
                  const permKey = `${mod.key.toLowerCase().replace(/ /g, '_')}_${col.toLowerCase()}`;
                  const checked = perms.includes(permKey) || perms.includes(modIdx * actionCols.length + colIdx);
                  return `<td class="p-3 text-center">
                    <input type="checkbox" class="perm-checkbox rounded text-primary focus:ring-primary" 
                           data-module="${modIdx}" data-action="${colIdx}" ${checked ? 'checked' : ''}/>
                  </td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-8 flex justify-end gap-3">
        <button id="btn-delete-role" class="flex min-w-[84px] items-center justify-center gap-2 rounded-lg h-10 px-4 bg-transparent text-red-600 dark:text-red-500 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-500/10 transition-colors">
          <span class="material-symbols-outlined">delete</span>
          <span>Supprimer le rôle</span>
        </button>
        <button id="btn-cancel-role" class="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-gray-200 dark:bg-white/10 text-[#111418] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
          Annuler
        </button>
        <button id="btn-save-role" class="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
          Enregistrer
        </button>
      </div>`;

    document.getElementById('btn-delete-role')?.addEventListener('click', () => {
      confirmDelete(r.nom, async () => {
        try {
          const res = await apiRoles.delete(r.id);
          if (res !== null) {
            roles = roles.filter(x => x.id !== r.id);
            if (selectedRoleId === r.id) {
              selectedRoleId = roles.length ? roles[0].id : null;
            }
            renderRoleList();
            if (selectedRoleId) {
              const next = roles.find(x => x.id === selectedRoleId);
              if (next) renderRoleDetail(next);
              else renderEmptyDetail();
            } else {
              renderEmptyDetail();
            }
            pushNotification(`Rôle "${r.nom}" supprimé.`, 'success');
          }
        } catch (err) {
          pushNotification('Erreur lors de la suppression', 'error');
        }
      });
    });

    document.getElementById('btn-cancel-role')?.addEventListener('click', () => {
      const current = roles.find(x => x.id === selectedRoleId);
      if (current) renderRoleDetail(current);
    });

    document.getElementById('btn-save-role')?.addEventListener('click', async () => {
      const checkboxes = document.querySelectorAll('.perm-checkbox');
      const selectedPerms = [];
      checkboxes.forEach(cb => {
        if (cb.checked) {
          const modIdx = parseInt(cb.dataset.module);
          const colIdx = parseInt(cb.dataset.action);
          const permKey = `${moduleRows[modIdx].key.toLowerCase().replace(/ /g, '_')}_${actionCols[colIdx].toLowerCase()}`;
          selectedPerms.push(permKey);
        }
      });
      const data = { permissions: selectedPerms };
      try {
        showLoader();
        const res = await apiRoles.update(r.id, data);
        if (res !== null) {
          const idx = roles.findIndex(x => x.id === r.id);
          if (idx >= 0) {
            roles[idx].permissions = selectedPerms;
            roles[idx].description = `${selectedPerms.length} permission(s)`;
          }
          renderRoleList();
          pushNotification(`Permissions du rôle "${r.nom}" mises à jour.`, 'success');
        }
        hideLoader();
      } catch (err) {
        hideLoader();
        pushNotification('Erreur lors de la sauvegarde', 'error');
      }
    });
  }

  function renderEmptyDetail() {
    const container = document.querySelector('.lg\\:col-span-2 > div, [class*="lg:col-span-2"] > div');
    if (!container) return;
    container.innerHTML = `
      <div class="text-center py-16">
        <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">admin_panel_settings</span>
        <p class="text-gray-500 dark:text-gray-400 text-lg">Sélectionnez un rôle ou créez-en un nouveau</p>
      </div>`;
  }

  function openRoleModal(id = null) {
    editingId = id;
    const r = id ? roles.find(x => x.id === id) : null;

    const body = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du rôle *</label>
          <input id="f-nom" value="${r?.nom || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-desc" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${r?.description || ''}</textarea>
        </div>
      </div>`;

    openModal(id ? `Modifier — ${r.nom}` : 'Créer un nouveau rôle', body, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const nom = document.getElementById('f-nom')?.value.trim();
        if (!nom) { pushNotification('Le nom du rôle est obligatoire.', 'error'); return; }
        const description = document.getElementById('f-desc')?.value.trim() || '';
        const data = { nom, description };
        try {
          showLoader();
          if (editingId) {
            const res = await apiRoles.update(editingId, data);
            if (res !== null) {
              await loadRoles();
              pushNotification(`Rôle "${nom}" mis à jour.`, 'success');
            }
          } else {
            const res = await apiRoles.create(data);
            if (res !== null) {
              await loadRoles();
              pushNotification(`Rôle "${nom}" créé.`, 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la sauvegarde du rôle', 'error');
        }
      },
    });
  }

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Ajouter un nouveau rôle')) {
      btn.addEventListener('click', () => openRoleModal());
    }
  });

  await loadRoles();
});
