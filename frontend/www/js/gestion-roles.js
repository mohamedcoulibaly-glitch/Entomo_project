/**
 * gestion-roles.js — Gestion des rôles et assignation des permissions réelles.
 * Consomme le vrai contrat API : Role{name, description, permissions[]},
 * Permission{id, code, name, module, action}. La matrice module × action est
 * construite dynamiquement depuis GET /roles/permissions (aucune donnée figée).
 */

// Ordre d'affichage préféré des colonnes d'action ; toute action inconnue est
// ajoutée à la suite, triée alphabétiquement.
const ACTION_ORDER = ['voir', 'creer', 'modifier', 'valider', 'exporter', 'supprimer', 'gestion', 'tout'];
const ACTION_LABELS = {
  voir: 'Voir', creer: 'Créer', modifier: 'Modifier', valider: 'Valider',
  exporter: 'Exporter', supprimer: 'Supprimer', gestion: 'Gestion', tout: 'Tout',
};
const MODULE_LABELS = {
  captures: 'Captures', sites: 'Sites Sentinelles', users: 'Utilisateurs', roles: 'Rôles',
  rapports: 'Rapports', dashboard: 'Tableau de Bord', dhis2: 'DHIS2', interventions: 'Interventions',
  campagnes: 'Campagnes', langues: 'Langues', notifications: 'Notifications', audit: 'Audit',
  reference: 'Données de Référence', datasets: 'Datasets', modeles: 'Modèles ML',
  indicateurs: 'Indicateurs', sync: 'Synchronisation', admin: 'Administration',
};

document.addEventListener('DOMContentLoaded', async () => {
  let roles = [];
  let permissionCatalog = [];  // toutes les permissions du système, telles que définies en base
  let moduleMatrix = [];       // [{ module, label, byAction: Map(action -> permission) }]
  let actionColumns = [];      // colonnes réellement utilisées par au moins une permission
  let editingId = null;
  let selectedRoleId = null;

  function buildMatrix(catalog) {
    const modulesMap = new Map();
    const actionsSeen = new Set();
    catalog.forEach((perm) => {
      const mod = perm.module || 'autre';
      const action = perm.action || perm.code;
      actionsSeen.add(action);
      if (!modulesMap.has(mod)) modulesMap.set(mod, { module: mod, label: MODULE_LABELS[mod] || mod, byAction: new Map() });
      modulesMap.get(mod).byAction.set(action, perm);
    });
    const orderedActions = [
      ...ACTION_ORDER.filter((a) => actionsSeen.has(a)),
      ...[...actionsSeen].filter((a) => !ACTION_ORDER.includes(a)).sort(),
    ];
    return { matrix: [...modulesMap.values()], actions: orderedActions };
  }

  async function loadRoles() {
    try {
      showLoader();
      const [rolesData, permsData] = await Promise.all([apiRoles.list(), apiRoles.permissions()]);
      roles = rolesData || [];
      permissionCatalog = permsData || [];
      const built = buildMatrix(permissionCatalog);
      moduleMatrix = built.matrix;
      actionColumns = built.actions;
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des rôles', 'error');
    }
    if (roles.length) {
      selectedRoleId = roles[0].id;
      renderRoleList();
      renderRoleDetail(roles.find((r) => r.id === selectedRoleId));
    } else {
      renderRoleList();
      renderEmptyDetail();
    }
  }

  function renderRoleList() {
    const container = document.querySelector('.flex.flex-col.gap-2');
    if (!container) return;

    container.innerHTML = roles.map((r) => `
      <div class="flex cursor-pointer items-center gap-4 rounded-lg px-4 min-h-[72px] py-2 justify-between role-list-item
        ${selectedRoleId === r.id
          ? 'bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/50 dark:border-brand-primary/70'
          : 'bg-white dark:bg-background-dark/50 hover:bg-gray-50 dark:hover:bg-white/5'}"
        data-id="${r.id}">
        <div class="flex items-center gap-4">
          <div class="flex items-center justify-center rounded-lg bg-white dark:bg-background-dark shrink-0 size-12 ${selectedRoleId === r.id ? 'text-brand-primary' : 'text-[#111418] dark:text-white'}">
            <span class="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <div class="flex flex-col justify-center">
            <p class="text-base font-semibold leading-normal line-clamp-1 ${selectedRoleId === r.id ? 'text-brand-primary' : 'text-[#111418] dark:text-white'}">${r.name}</p>
            <p class="text-sm font-normal leading-normal line-clamp-2 ${selectedRoleId === r.id ? 'text-brand-primary/80' : 'text-[#617589] dark:text-gray-400'}">
              ${(r.permissions ? r.permissions.length : 0)} permission(s)
            </p>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.role-list-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id, 10);
        const r = roles.find((x) => x.id === id);
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

    const assignedIds = new Set((r.permissions || []).map((p) => p.id));

    container.innerHTML = `
      <h3 class="text-xl font-bold text-[#111418] dark:text-white">Permissions pour « ${r.name} »</h3>
      <p class="text-sm text-[#617589] dark:text-gray-400 mt-1">${r.description || `${assignedIds.size} permission(s) assignée(s)`}</p>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-left">
          <thead class="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="p-3 text-sm font-semibold text-[#617589] dark:text-gray-400">Module</th>
              ${actionColumns.map((a) => `<th class="p-3 text-sm font-semibold text-center text-[#617589] dark:text-gray-400">${ACTION_LABELS[a] || a}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${moduleMatrix.map((mod, modIdx) => `
              <tr class="${modIdx < moduleMatrix.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}">
                <td class="p-3 font-medium text-[#111418] dark:text-white">${mod.label}</td>
                ${actionColumns.map((action) => {
                  const perm = mod.byAction.get(action);
                  if (!perm) return `<td class="p-3 text-center text-gray-300 dark:text-gray-700">—</td>`;
                  const checked = assignedIds.has(perm.id);
                  return `<td class="p-3 text-center">
                    <input type="checkbox" class="perm-checkbox rounded text-brand-primary focus:ring-brand-primary"
                           data-permission-id="${perm.id}" title="${perm.code}" ${checked ? 'checked' : ''}/>
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
        <button id="btn-save-role" class="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-brand-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-brand-primary/90 transition-colors">
          Enregistrer
        </button>
      </div>`;

    document.getElementById('btn-delete-role')?.addEventListener('click', () => {
      confirmDelete(r.name, async () => {
        try {
          const res = await apiRoles.delete(r.id);
          if (res !== null) {
            roles = roles.filter((x) => x.id !== r.id);
            selectedRoleId = roles.length ? roles[0].id : null;
            renderRoleList();
            const next = roles.find((x) => x.id === selectedRoleId);
            if (next) renderRoleDetail(next); else renderEmptyDetail();
            pushNotification(`Rôle « ${r.name} » supprimé.`, 'success');
          }
        } catch (err) {
          pushNotification('Erreur lors de la suppression', 'error');
        }
      });
    });

    document.getElementById('btn-cancel-role')?.addEventListener('click', () => renderRoleDetail(r));

    document.getElementById('btn-save-role')?.addEventListener('click', async () => {
      const permissionIds = Array.from(document.querySelectorAll('.perm-checkbox:checked'))
        .map((cb) => parseInt(cb.dataset.permissionId, 10));
      try {
        showLoader();
        const res = await apiRoles.update(r.id, { permission_ids: permissionIds });
        if (res !== null) {
          const idx = roles.findIndex((x) => x.id === r.id);
          if (idx >= 0) roles[idx] = res;
          renderRoleList();
          renderRoleDetail(res);
          pushNotification(`Permissions du rôle « ${r.name} » mises à jour (${permissionIds.length}).`, 'success');
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
    const r = id ? roles.find((x) => x.id === id) : null;

    const body = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du rôle *</label>
          <input id="f-name" value="${r?.name || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-desc" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${r?.description || ''}</textarea>
        </div>
        ${id ? '' : '<p class="text-xs text-gray-500 dark:text-gray-400">Les permissions se configurent ensuite depuis la matrice, une fois le rôle créé.</p>'}
      </div>`;

    openModal(id ? `Modifier — ${r.name}` : 'Créer un nouveau rôle', body, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const name = document.getElementById('f-name')?.value.trim();
        if (!name) { pushNotification('Le nom du rôle est obligatoire.', 'error'); return; }
        const description = document.getElementById('f-desc')?.value.trim() || '';
        try {
          showLoader();
          if (editingId) {
            const res = await apiRoles.update(editingId, { name, description });
            if (res !== null) { await loadRoles(); pushNotification(`Rôle « ${name} » mis à jour.`, 'success'); }
          } else {
            const res = await apiRoles.create({ name, description, permission_ids: [] });
            if (res !== null) {
              await loadRoles();
              selectedRoleId = res.id;
              renderRoleList();
              renderRoleDetail(res);
              pushNotification(`Rôle « ${name} » créé.`, 'success');
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

  document.querySelectorAll('button').forEach((btn) => {
    if (btn.textContent.includes('Ajouter un nouveau rôle')) {
      btn.addEventListener('click', () => openRoleModal());
    }
  });

  await loadRoles();
});
