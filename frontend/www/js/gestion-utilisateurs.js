/**
 * gestion-utilisateurs.js
 * Comportements interactifs pour la page Gestion des Utilisateurs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Données simulées (fallback) ──────────────────────────────────────────────
  const FALLBACK = [
    { id: 1, full_name: 'Mouss Dethie Sarr',  email: 'md.sarr@example.com',     role: { nom: 'Agent de terrain' },          region: 'Kédougou', is_active: true },
    { id: 2, full_name: 'Ousmane Faye',        email: 'ousmane.faye@example.com', role: { nom: 'Technicien de laboratoire' }, region: 'Thiès',    is_active: true },
    { id: 3, full_name: 'Fatou Ndiaye',        email: 'fatou.ndiaye@example.com', role: { nom: 'Administrateur Régional' },  region: 'Dakar',    is_active: false },
    { id: 4, full_name: 'Ibrahima Diop',       email: 'i.diop@example.com',       role: { nom: 'Chercheur' },                region: 'Dakar',    is_active: true },
    { id: 5, full_name: 'Aminata Cissé',       email: 'a.cisse@example.com',      role: { nom: 'Superviseur National' },     region: 'Dakar',    is_active: true },
  ];

  function norm(u) {
    return {
      ...u,
      nom:    u.full_name || u.nom || u.username || 'N/A',
      role:   u.role?.nom || u.role || 'N/A',
      statut: u.is_active !== false ? 'Actif' : 'Inactif',
    };
  }

  let users = [];
  let editingId = null;

  async function loadUsers() {
    if (typeof apiUsers !== 'undefined') {
      const data = await apiUsers.list({ limit: 100 });
      users = data ? data.map(norm) : FALLBACK.map(norm);
    } else {
      users = FALLBACK.map(norm);
    }
    applyFilters();
  }

  // ── Rendu du tableau ────────────────────────────────────────────────────────
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
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${u.region}</td>
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
            <button class="btn-edit text-primary hover:text-primary/80 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
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

    attachRowEvents();
  }

  // ── Événements sur les lignes ───────────────────────────────────────────────
  function attachRowEvents() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openUserModal(parseInt(btn.dataset.id)));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === parseInt(btn.dataset.id));
        if (!u) return;
        confirmDelete(u.nom, async () => {
          if (typeof apiUsers !== 'undefined') {
            await apiUsers.delete(u.id);
          }
          users = users.filter(x => x.id !== u.id);
          applyFilters();
          pushNotification(`Utilisateur "${u.nom}" supprimé.`, 'info');
        });
      });
    });

    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = users.find(x => x.id === parseInt(btn.dataset.id));
        if (!u) return;
        const newActive = u.statut !== 'Actif';
        if (typeof apiUsers !== 'undefined') {
          await apiUsers.update(u.id, { is_active: newActive });
        }
        u.statut = newActive ? 'Actif' : 'Inactif';
        u.is_active = newActive;
        applyFilters();
        pushNotification(`Statut de "${u.nom}" changé en ${u.statut}.`, newActive ? 'success' : 'warning');
      });
    });
  }

  // ── Modale ajout / modification ─────────────────────────────────────────────
  function openUserModal(id = null) {
    editingId = id;
    const u = id ? users.find(x => x.id === id) : null;

    const body = `
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom complet *</label>
          <input id="f-nom" type="text" value="${u?.nom || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
          <input id="f-email" type="email" value="${u?.email || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rôle</label>
          <select id="f-role" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary">
            ${['Agent de terrain','Technicien de laboratoire','Administrateur Régional','Chercheur','Superviseur National']
              .map(r => `<option ${u?.role===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Établissement</label>
          <input id="f-etab" type="text" value="${u?.etablissement || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région / District</label>
          <input id="f-region" type="text" value="${u?.region || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary">
            <option ${u?.statut==='Actif'?'selected':''}>Actif</option>
            <option ${u?.statut==='Inactif'?'selected':''}>Inactif</option>
          </select>
        </div>
        <p id="f-error" class="text-red-500 text-xs hidden">Veuillez remplir tous les champs obligatoires.</p>
      </div>`;

    openModal(id ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur', body, {
      confirmLabel: id ? 'Enregistrer' : 'Ajouter',
      onConfirm: saveUser,
    });
  }

  function saveUser() {
    const nom   = document.getElementById('f-nom')?.value.trim();
    const email = document.getElementById('f-email')?.value.trim();
    if (!nom || !email) {
      document.getElementById('f-error')?.classList.remove('hidden');
      return;
    }

    const data = {
      full_name:     nom,
      email,
      role_nom:      document.getElementById('f-role')?.value,
      etablissement: document.getElementById('f-etab')?.value.trim(),
      region:        document.getElementById('f-region')?.value.trim(),
      is_active:     document.getElementById('f-statut')?.value === 'Actif',
    };

    (async () => {
      showLoader();
      if (editingId) {
        if (typeof apiUsers !== 'undefined') {
          await apiUsers.update(editingId, data);
        }
        const idx = users.findIndex(x => x.id === editingId);
        users[idx] = { ...users[idx], ...data, nom, statut: data.is_active ? 'Actif' : 'Inactif', role: data.role_nom };
        pushNotification(`Utilisateur "${nom}" modifié avec succès.`, 'success');
      } else {
        let created = null;
        if (typeof apiUsers !== 'undefined') {
          created = await apiUsers.create({ ...data, username: email.split('@')[0], password: 'ChangeMe123!' });
        }
        users.unshift({ ...data, id: created?.id || Date.now(), nom, statut: data.is_active ? 'Actif' : 'Inactif', role: data.role_nom });
        pushNotification(`Utilisateur "${nom}" ajouté.`, 'success');
      }
      hideLoader();
      applyFilters();
    })();
  }

  // ── Bouton "Ajouter" ────────────────────────────────────────────────────────
  document.querySelector('button:has(> span.material-symbols-outlined + span)')
    ?.addEventListener('click', () => openUserModal());

  // Alternative si le sélecteur ci-dessus ne matche pas
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Ajouter un Utilisateur')) {
      btn.addEventListener('click', () => openUserModal());
    }
  });

  // ── Recherche en temps réel ─────────────────────────────────────────────────
  const searchInput = document.querySelector('input[placeholder*="Rechercher"]');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // ── Filtres dropdown (Rôle / Région / Statut) ───────────────────────────────
  let activeFilters = { role: 'Tous', statut: 'Tous' };

  const filterButtons = document.querySelectorAll('.flex.flex-wrap.gap-3 button');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.querySelector('p')?.textContent || '';
      if (text.startsWith('Rôle')) showFilterDropdown(btn, 'role', ['Tous','Agent de terrain','Technicien de laboratoire','Administrateur Régional','Chercheur','Superviseur National']);
      if (text.startsWith('Statut')) showFilterDropdown(btn, 'statut', ['Tous','Actif','Inactif']);
    });
  });

  function showFilterDropdown(btn, key, options) {
    document.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = `filter-dropdown absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl
                    border border-gray-200 dark:border-gray-700 min-w-[160px] py-1`;
    dd.style.top  = btn.offsetTop + btn.offsetHeight + 4 + 'px';
    dd.style.left = btn.offsetLeft + 'px';

    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = `w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                        text-[#111418] dark:text-gray-200 ${activeFilters[key]===opt?'font-bold text-brand-primary':''}`;
      item.textContent = opt;
      item.addEventListener('click', () => {
        activeFilters[key] = opt;
        const label = btn.querySelector('p');
        if (label) label.textContent = `${key.charAt(0).toUpperCase()+key.slice(1)}: ${opt}`;
        dd.remove();
        applyFilters();
      });
      dd.appendChild(item);
    });

    btn.closest('.flex').style.position = 'relative';
    btn.closest('.flex').appendChild(dd);
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }), 100);
  }

  // ── Application de tous les filtres ─────────────────────────────────────────
  function applyFilters() {
    const q = searchInput?.value.toLowerCase().trim() || '';
    let filtered = users.filter(u => {
      const matchSearch = !q || `${u.nom} ${u.email}`.toLowerCase().includes(q);
      const matchRole   = activeFilters.role   === 'Tous' || u.role   === activeFilters.role;
      const matchStatut = activeFilters.statut === 'Tous' || u.statut === activeFilters.statut;
      return matchSearch && matchRole && matchStatut;
    });
    renderTable(filtered);
  }

  // ── Tri colonnes ─────────────────────────────────────────────────────────────
  initTableSort('table');

  // ── Rendu initial ────────────────────────────────────────────────────────────
  loadUsers();

});
