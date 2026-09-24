document.addEventListener('DOMContentLoaded', async () => {
  let users = [];
  let editingId = null;
  let roles = [];

  async function loadRoles() {
    try {
      const data = await apiRoles.list();
      if (data) roles = data;
    } catch (err) {
      console.warn('Erreur chargement rôles:', err);
    }
  }

  async function loadUsers() {
    try {
      showLoader();
      const data = await apiUsers.list({ limit: 200 });
      if (data) users = data.map(norm);
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des utilisateurs', 'error');
    }
    applyFilters();
  }

  function norm(u) {
    return {
      ...u,
      nom: u.full_name || u.nom || u.username || 'N/A',
      email: u.email || '',
      role: typeof u.role === 'object' && u.role ? u.role.nom || u.role.name || '' : u.role_nom || u.role || '',
      role_id: typeof u.role === 'object' && u.role ? u.role.id : u.role_id || null,
      region: u.region || '',
      district: u.district || '',
      etablissement: u.etablissement || u.etablissement_nom || '',
      statut: u.is_active !== false ? 'Actif' : 'Inactif',
      is_active: u.is_active !== false,
    };
  }

  function renderTable(data) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-400 dark:text-gray-500">
        <span class="material-symbols-outlined text-4xl block mb-2">person_off</span>
        Aucun utilisateur trouvé
      </td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(u => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors" data-id="${u.id}">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="h-10 w-10 flex-shrink-0 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <span class="text-brand-primary font-bold text-sm">${u.nom.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${u.nom}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${u.email}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${u.role}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${u.etablissement}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${u.region}${u.district ? ' / ' + u.district : ''}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5
            ${u.statut === 'Actif'
              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'}">${u.statut}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div class="flex items-center justify-end gap-2">
            <button class="btn-toggle-status text-yellow-600 hover:text-yellow-800 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-id="${u.id}" title="${u.statut === 'Actif' ? 'Désactiver' : 'Activer'}">
              <span class="material-symbols-outlined" style="font-size:20px">${u.statut === 'Actif' ? 'person_off' : 'person_check'}</span>
            </button>
            <button class="btn-edit text-brand-primary hover:text-brand-primary/80 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-id="${u.id}" title="Modifier">
              <span class="material-symbols-outlined" style="font-size:20px">edit</span>
            </button>
            <button class="btn-delete text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    data-id="${u.id}" title="Supprimer">
              <span class="material-symbols-outlined" style="font-size:20px">delete</span>
            </button>
          </div>
        </td>
    </tr>`).join('');

    initPagination('tbody', 10);

    attachRowEvents();
  }

  function attachRowEvents() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openUserModal(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === parseInt(btn.dataset.id));
        if (!u) return;
        confirmDelete(u.nom, async () => {
          try {
            const res = await apiUsers.delete(u.id);
            if (res !== null) {
              users = users.filter(x => x.id !== u.id);
              applyFilters();
              pushNotification(`Utilisateur "${u.nom}" supprimé.`, 'success');
            }
          } catch (err) {
            pushNotification('Erreur lors de la suppression', 'error');
          }
        });
      });
    });

    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = users.find(x => x.id === parseInt(btn.dataset.id));
        if (!u) return;
        const newActive = u.statut !== 'Actif';
        try {
          const res = await apiUsers.update(u.id, { is_active: newActive });
          if (res !== null) {
            u.is_active = newActive;
            u.statut = newActive ? 'Actif' : 'Inactif';
            applyFilters();
            pushNotification(`Statut de "${u.nom}" changé en ${u.statut}.`, newActive ? 'success' : 'warning');
          }
        } catch (err) {
          pushNotification('Erreur lors du changement de statut', 'error');
        }
      });
    });
  }

  function openUserModal(id = null) {
    editingId = id;
    const u = id ? users.find(x => x.id === id) : null;

    // L'API renvoie "name", pas "nom" — cause du "undefined" qui s'affichait ici.
    const roleOptions = roles.length
      ? roles.map(r => `<option value="${r.id}" ${u && (u.role_id === r.id || u.role === (r.name || r.nom)) ? 'selected' : ''}>${r.name || r.nom}</option>`).join('')
      : `<option value="">Sélectionner un rôle</option>`;

    const body = `
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom complet *</label>
          <input id="f-nom" type="text" value="${u?.nom || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
          <input id="f-email" type="email" value="${u?.email || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom d'utilisateur${id ? '' : ' *'}</label>
          <input id="f-username" type="text" value="${u?.username || ''}" ${id ? 'disabled' : ''}
            placeholder="généré depuis l'email si laissé vide"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60"/>
        </div>
        ${!id ? `
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe initial *</label>
          <div class="flex gap-2">
            <input id="f-password" type="text" value=""
              placeholder="Saisir ou générer un mot de passe"
              class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 text-sm px-3 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
            <button type="button" id="f-password-generate" class="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">Générer</button>
          </div>
          <p class="mt-1 text-xs text-gray-500">Communiquez-le à l'utilisateur — il ne sera plus affiché ensuite.</p>
        </div>` : ''}
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Téléphone</label>
          <input id="f-telephone" type="tel" value="${u?.telephone || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rôle</label>
          <select id="f-role" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary">
            ${roleOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Établissement</label>
          <input id="f-etab" type="text" value="${u?.etablissement || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région</label>
          <input id="f-region" type="text" value="${u?.region || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">District</label>
          <input id="f-district" type="text" value="${u?.district || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary">
            <option ${!u || u.statut === 'Actif' ? 'selected' : ''}>Actif</option>
            <option ${u?.statut === 'Inactif' ? 'selected' : ''}>Inactif</option>
          </select>
        </div>
        <p id="f-error" class="text-red-500 text-xs hidden">Veuillez remplir tous les champs obligatoires.</p>
      </div>`;

    openModal(id ? "Modifier l'utilisateur" : 'Ajouter un utilisateur', body, {
      confirmLabel: id ? 'Enregistrer' : 'Ajouter',
      onConfirm: async () => {
        const nom = document.getElementById('f-nom')?.value.trim();
        const email = document.getElementById('f-email')?.value.trim();
        const password = document.getElementById('f-password')?.value.trim() || '';
        if (!nom || !email || (!id && !password)) {
          document.getElementById('f-error')?.classList.remove('hidden');
          return;
        }
        const roleSelect = document.getElementById('f-role');
        const roleId = roleSelect?.value ? parseInt(roleSelect.value) : null;
        const data = {
          full_name: nom,
          email,
          role_id: roleId || undefined,
          etablissement: document.getElementById('f-etab')?.value.trim(),
          region: document.getElementById('f-region')?.value.trim(),
          district: document.getElementById('f-district')?.value.trim(),
          telephone: document.getElementById('f-telephone')?.value.trim() || undefined,
          is_active: document.getElementById('f-statut')?.value === 'Actif',
        };
        try {
          showLoader();
          if (editingId) {
            const res = await apiUsers.update(editingId, data);
            if (res !== null) {
              await loadUsers();
              pushNotification(`Utilisateur "${nom}" modifié avec succès.`, 'success');
            }
          } else {
            const username = document.getElementById('f-username')?.value.trim() || email.split('@')[0];
            const res = await apiUsers.create({ ...data, username, password });
            if (res !== null) {
              await loadUsers();
              pushNotification(`Utilisateur "${nom}" ajouté — identifiant : ${username}.`, 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la sauvegarde', 'error');
        }
      },
    });

    if (!id) {
      setTimeout(() => {
        document.getElementById('f-password-generate')?.addEventListener('click', () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
          let pwd = '';
          const bytes = new Uint32Array(12);
          (window.crypto || window.msCrypto).getRandomValues(bytes);
          for (let i = 0; i < 12; i++) pwd += chars[bytes[i] % chars.length];
          const input = document.getElementById('f-password');
          if (input) { input.type = 'text'; input.value = pwd; }
        });
      }, 50);
    }
  }

  window.openUserModal = openUserModal;

  const addBtn = document.querySelector('button:has(> .truncate)');
  if (addBtn) addBtn.addEventListener('click', () => openUserModal());

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Ajouter un Utilisateur')) {
      btn.addEventListener('click', () => openUserModal());
    }
  });

  const searchInput = document.querySelector('input[placeholder*="Rechercher"]');

  const filters = { role: 'Tous', region: 'Toutes', district: 'Tous', statut: 'Tous' };

  const filterPButtons = document.querySelectorAll('.flex.flex-wrap.gap-3 button, .flex-wrap.gap-3 button');
  filterPButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.querySelector('p');
      if (!p) return;
      const text = p.textContent || '';
      if (text.startsWith('Rôle')) {
        const options = ['Tous', ...roles.map(r => r.name || r.nom)];
        showFilterDD(btn, options, val => { filters.role = val; p.textContent = `Rôle: ${val}`; applyFilters(); });
      } else if (text.startsWith('Région')) {
        const regions = [...new Set(users.map(u => u.region).filter(Boolean))];
        showFilterDD(btn, ['Toutes', ...regions], val => { filters.region = val; p.textContent = `Région: ${val}`; applyFilters(); });
      } else if (text.startsWith('District')) {
        const districts = [...new Set(users.map(u => u.district).filter(Boolean))];
        showFilterDD(btn, ['Tous', ...districts], val => { filters.district = val; p.textContent = `District: ${val}`; applyFilters(); });
      } else if (text.startsWith('Statut')) {
        showFilterDD(btn, ['Tous', 'Actif', 'Inactif'], val => { filters.statut = val; p.textContent = `Statut: ${val}`; applyFilters(); });
      }
    });
  });

  function showFilterDD(anchor, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'filter-dd absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] py-1';
    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = 'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-[#111418] dark:text-gray-200';
      item.textContent = opt;
      item.addEventListener('click', () => { onSelect(opt); dd.remove(); });
      dd.appendChild(item);
    });
    anchor.style.position = 'relative';
    anchor.appendChild(dd);
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }), 100);
  }

  function applyFilters() {
    const q = searchInput?.value.toLowerCase().trim() || '';
    let filtered = users.filter(u => {
      const matchSearch = !q || `${u.nom} ${u.email} ${u.role} ${u.region} ${u.etablissement}`.toLowerCase().includes(q);
      const matchRole = filters.role === 'Tous' || u.role === filters.role;
      const matchRegion = filters.region === 'Toutes' || u.region === filters.region;
      const matchDistrict = filters.district === 'Tous' || u.district === filters.district;
      const matchStatut = filters.statut === 'Tous' || u.statut === filters.statut;
      return matchSearch && matchRole && matchRegion && matchDistrict && matchStatut;
    });
    renderTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  initTableSort('table');

  await loadRoles();
  await loadUsers();
});
