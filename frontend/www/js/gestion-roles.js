/**
 * gestion-roles.js
 * Gestion des rôles et permissions — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  const permissions = [
    'Voir le tableau de bord', 'Gérer les utilisateurs', 'Gérer les captures',
    'Gérer les sites', 'Synchroniser DHIS2', 'Gérer les modèles ML',
    'Générer des rapports', 'Administrer la plateforme', 'Accès lecture seule',
    'Exporter les données', 'Importer des données', 'Gérer les datasets',
  ];

  let roles = [
    { id: 1, nom: 'Superviseur National',      description: 'Accès complet à toute la plateforme.',        perms: [0,1,2,3,4,5,6,7,9,10,11], couleur: 'bg-purple-100 text-purple-700' },
    { id: 2, nom: 'Administrateur Régional',   description: 'Gestion régionale des données.',               perms: [0,2,3,5,6,9,11],           couleur: 'bg-blue-100 text-blue-700' },
    { id: 3, nom: 'Technicien de laboratoire', description: 'Saisie et gestion des captures.',              perms: [0,2,8,11],                 couleur: 'bg-green-100 text-green-700' },
    { id: 4, nom: 'Agent de terrain',           description: 'Collecte des données sur le terrain.',         perms: [0,8],                      couleur: 'bg-yellow-100 text-yellow-700' },
    { id: 5, nom: 'Chercheur',                  description: 'Analyse des données et accès aux modèles ML.', perms: [0,5,6,8,9],               couleur: 'bg-pink-100 text-pink-700' },
  ];

  let editingId = null;

  // Charger les rôles depuis l'API
  async function loadRoles() {
    if (typeof apiRoles !== 'undefined') {
      const data = await apiRoles.list();
      if (data && data.length) {
        roles = data.map(r => ({
          ...r,
          perms: r.permissions || [],
          couleur: r.couleur || 'bg-gray-100 text-gray-700',
        }));
      }
    }
    renderRoles(roles);
  }

  function renderRoles(data) {
    const container = document.querySelector('.grid') || document.querySelector('[class*="grid"]');
    const tbody = document.querySelector('tbody');

    // Si présentation en tableau
    if (tbody) {
      tbody.innerHTML = data.map(r => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors" data-id="${r.id}">
          <td class="px-6 py-4">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${r.couleur}">${r.nom}</span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${r.description}</td>
          <td class="px-6 py-4 text-sm text-gray-500">${r.perms.length} permission(s)</td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button class="btn-view p-1 rounded text-gray-500 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}" title="Voir permissions">
                <span class="material-symbols-outlined" style="font-size:18px">visibility</span>
              </button>
              <button class="btn-edit p-1 rounded text-primary hover:text-primary/80 hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}" title="Modifier">
                <span class="material-symbols-outlined" style="font-size:18px">edit</span>
              </button>
              <button class="btn-delete p-1 rounded text-red-600 hover:text-red-800 hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}" title="Supprimer">
                <span class="material-symbols-outlined" style="font-size:18px">delete</span>
              </button>
            </div>
          </td>
        </tr>`).join('');

      attachEvents();
      return;
    }

    // Si présentation en cartes
    if (container) {
      container.innerHTML = data.map(r => `
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow" data-id="${r.id}">
          <div class="flex items-start justify-between mb-3">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${r.couleur}">${r.nom}</span>
            <div class="flex gap-1">
              <button class="btn-view p-1 rounded text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}">
                <span class="material-symbols-outlined" style="font-size:18px">visibility</span>
              </button>
              <button class="btn-edit p-1 rounded text-primary/60 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}">
                <span class="material-symbols-outlined" style="font-size:18px">edit</span>
              </button>
              <button class="btn-delete p-1 rounded text-red-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${r.id}">
                <span class="material-symbols-outlined" style="font-size:18px">delete</span>
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${r.description}</p>
          <div class="flex flex-wrap gap-1">
            ${r.perms.slice(0,4).map(i=>`<span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">${permissions[i]}</span>`).join('')}
            ${r.perms.length > 4 ? `<span class="text-xs text-brand-primary font-medium">+${r.perms.length-4} autres</span>` : ''}
          </div>
        </div>`).join('');
      attachEvents();
    }
  }

  function attachEvents() {
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = roles.find(x => x.id === parseInt(btn.dataset.id));
        if (!r) return;
        openModal(`Permissions — ${r.nom}`,
          `<div class="space-y-2">
            ${permissions.map((p, i) => `
              <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                <span class="material-symbols-outlined text-base ${r.perms.includes(i)?'text-brand-success':'text-gray-300 dark:text-gray-600'}">
                  ${r.perms.includes(i)?'check_circle':'cancel'}
                </span>
                <span class="text-sm ${r.perms.includes(i)?'text-[#111418] dark:text-white':'text-gray-400 dark:text-gray-500'}">${p}</span>
              </label>`).join('')}
          </div>`,
          { confirmLabel: 'Modifier', cancelLabel: 'Fermer', onConfirm: () => openRoleModal(r.id) }
        );
      });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openRoleModal(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = roles.find(x => x.id === parseInt(btn.dataset.id));
        if (!r) return;
        confirmDelete(r.nom, async () => {
          if (typeof apiRoles !== 'undefined') {
            await apiRoles.delete(r.id);
          }
          roles = roles.filter(x => x.id !== r.id);
          renderRoles(roles);
          pushNotification(`Rôle "${r.nom}" supprimé.`, 'info');
        });
      });
    });
  }

  function openRoleModal(id = null) {
    editingId = id;
    const r = id ? roles.find(x => x.id === id) : null;

    const body = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du rôle *</label>
          <input id="f-nom" value="${r?.nom||''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <input id="f-desc" value="${r?.description||''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Permissions</label>
          <div class="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
            ${permissions.map((p, i) => `
              <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" value="${i}" class="perm-check rounded text-brand-primary"
                  ${r?.perms.includes(i)?'checked':''}/>
                <span class="text-sm text-[#111418] dark:text-gray-200">${p}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>`;

    openModal(id ? `Modifier — ${r.nom}` : 'Créer un nouveau rôle', body, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const nom = document.getElementById('f-nom')?.value.trim();
        if (!nom) { pushNotification('Le nom du rôle est obligatoire.', 'error'); return; }
        const perms = Array.from(document.querySelectorAll('.perm-check:checked')).map(c => parseInt(c.value));
        const data = { nom, description: document.getElementById('f-desc')?.value.trim(), perms };

        showLoader();
        if (editingId) {
          if (typeof apiRoles !== 'undefined') {
            await apiRoles.update(editingId, { nom: data.nom, description: data.description });
          }
          const idx = roles.findIndex(x => x.id === editingId);
          roles[idx] = { ...roles[idx], ...data };
          pushNotification(`Rôle "${nom}" mis à jour.`, 'success');
        } else {
          let created = null;
          if (typeof apiRoles !== 'undefined') {
            created = await apiRoles.create({ nom: data.nom, description: data.description });
          }
          data.id = created?.id || Date.now();
          data.couleur = 'bg-gray-100 text-gray-700';
          roles.push(data);
          pushNotification(`Rôle "${nom}" créé.`, 'success');
        }
        hideLoader();
        renderRoles(roles);
      },
    });
  }

  // Bouton ajouter
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Ajouter') || btn.textContent.includes('Créer')) {
      btn.addEventListener('click', () => openRoleModal());
    }
  });

  loadRoles();
});
