document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let campagnes = [];
  let interventionCounts = {};

  async function loadCampagnes() {
    try {
      showLoader();
      const [data, interventions] = await Promise.all([
        apiRequest('GET', '/campagnes/'),
        apiRequest('GET', '/interventions/'),
      ]);
      if (data) campagnes = data;
      interventionCounts = {};
      (interventions || []).forEach(i => {
        if (i.campagne_id) interventionCounts[i.campagne_id] = (interventionCounts[i.campagne_id] || 0) + 1;
      });
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des campagnes.', 'error');
    }
    updateFilterCounts();
    renderCampagnes(campagnes);
  }

  function updateFilterCounts() {
    const counts = { planifiee: 0, en_cours: 0, terminee: 0 };
    campagnes.forEach(c => { if (counts[c.statut] !== undefined) counts[c.statut]++; });
    const setCount = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setCount('count-planifiees', counts.planifiee);
    setCount('count-en-cours', counts.en_cours);
    setCount('count-terminees', counts.terminee);
  }

  function renderCampagnes(data) {
    const container = document.getElementById('campagnes-container') || document.querySelector('main .grid, main .row');
    if (!container) {
      const tbody = document.querySelector('table tbody');
      if (tbody) return renderTable(data, tbody);
      return;
    }
    if (!data.length) {
      container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">campaign</span>Aucune campagne trouvée</div>';
      return;
    }
    container.innerHTML = data.map(c => {
      const statusColors = { planifiee: 'bg-blue-100 text-blue-800', en_cours: 'bg-yellow-100 text-yellow-800', terminee: 'bg-green-100 text-green-800', annulee: 'bg-red-100 text-red-800' };
      const statusLabel = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
      return `<div data-id="${c.id}" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-bold text-gray-900 dark:text-white">${c.titre || c.nom || 'Campagne'}</h3>
          <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.statut] || 'bg-gray-100 text-gray-700'}">${statusLabel[c.statut] || c.statut}</span>
        </div>
        ${c.description ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${c.description}</p>` : ''}
        <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          ${c.date_debut ? `<span><span class="material-symbols-outlined text-xs align-text-bottom">calendar_today</span> ${new Date(c.date_debut).toLocaleDateString('fr-FR')}</span>` : ''}
          ${c.date_fin ? `<span>— ${new Date(c.date_fin).toLocaleDateString('fr-FR')}</span>` : ''}
          ${c.site_nom || c.site?.nom ? `<span><span class="material-symbols-outlined text-xs align-text-bottom">location_on</span> ${c.site_nom || c.site?.nom}</span>` : ''}
          <span><span class="material-symbols-outlined text-xs align-text-bottom">emergency</span> ${interventionCounts[c.id] || 0} intervention${(interventionCounts[c.id] || 0) > 1 ? 's' : ''}</span>
        </div>
        <div class="flex gap-2 justify-end border-t border-gray-100 dark:border-gray-700 pt-3">
          <button class="btn-status text-xs text-yellow-600 hover:text-yellow-800 font-medium">Changer statut</button>
          <button class="btn-edit text-xs text-brand-primary hover:text-brand-primary/80 font-medium">Modifier</button>
          <button class="btn-delete text-xs text-red-600 hover:text-red-800 font-medium">Supprimer</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openCampagneModal(parseInt(btn.closest('[data-id]')?.dataset.id || btn.closest('.bg-white')?.querySelector('[data-id]')?.dataset.id)));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-id]') || btn.closest('.bg-white');
        const id = parseInt(card?.dataset.id);
        const c = campagnes.find(x => x.id === id);
        if (!c) return;
        confirmDelete(c.titre || c.nom || 'campagne', async () => {
          try {
            const res = await apiRequest('DELETE', `/campagnes/${id}`);
            if (res !== null) {
              campagnes = campagnes.filter(x => x.id !== id);
              renderCampagnes(campagnes);
              pushNotification('Campagne supprimée.', 'success');
            }
          } catch (err) {
            pushNotification('Erreur lors de la suppression.', 'error');
          }
        });
      });
    });
    container.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-id]') || btn.closest('.bg-white');
        const id = parseInt(card?.dataset.id);
        const c = campagnes.find(x => x.id === id);
        if (!c) return;
        openModal('Changer le statut', `
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="planifiee" ${c.statut === 'planifiee' ? 'selected' : ''}>Planifiée</option>
            <option value="en_cours" ${c.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="terminee" ${c.statut === 'terminee' ? 'selected' : ''}>Terminée</option>
            <option value="annulee" ${c.statut === 'annulee' ? 'selected' : ''}>Annulée</option>
          </select>`, {
          confirmLabel: 'Mettre à jour',
          onConfirm: async () => {
            const statut = document.getElementById('f-statut')?.value;
            try {
              const res = await apiRequest('PUT', `/campagnes/${id}`, { statut });
              if (res !== null) {
                c.statut = statut;
                renderCampagnes(campagnes);
                pushNotification('Statut mis à jour.', 'success');
              }
            } catch (err) {
              pushNotification('Erreur lors de la mise à jour.', 'error');
            }
          },
        });
      });
    });
  }

  function renderTable(data, tbody) {
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400">Aucune campagne</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(c => `
      <tr data-id="${c.id}">
        <td class="px-4 py-3 text-sm font-medium">${c.titre || c.nom}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${c.date_debut ? new Date(c.date_debut).toLocaleDateString('fr-FR') : ''}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : ''}</td>
        <td class="px-4 py-3">${c.statut}</td>
        <td class="px-4 py-3 text-right">...</td>
      </tr>`).join('');
  }

  function openCampagneModal(id = null) {
    const c = id ? campagnes.find(x => x.id === id) : null;
    openModal(id ? 'Modifier campagne' : 'Nouvelle campagne', `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre *</label>
          <input id="f-titre" value="${c?.titre || c?.nom || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
          <select id="f-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="collecte" ${c?.type_campagne === 'collecte' ? 'selected' : ''}>Collecte</option>
            <option value="traitement" ${c?.type_campagne === 'traitement' ? 'selected' : ''}>Traitement</option>
            <option value="surveillance" ${c?.type_campagne === 'surveillance' ? 'selected' : ''}>Surveillance</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région</label>
          <input id="f-region" value="${c?.region || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date début</label>
          <input id="f-date-debut" type="date" value="${c?.date_debut ? c.date_debut.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date fin</label>
          <input id="f-date-fin" type="date" value="${c?.date_fin ? c.date_fin.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Responsable</label>
          <input id="f-responsable" value="${c?.responsable || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="planifiee" ${!c || c.statut === 'planifiee' ? 'selected' : ''}>Planifiée</option>
            <option value="en_cours" ${c?.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="terminee" ${c?.statut === 'terminee' ? 'selected' : ''}>Terminée</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-description" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${c?.description || ''}</textarea>
        </div>
      </div>`, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const titre = document.getElementById('f-titre')?.value.trim();
        const dateDebut = document.getElementById('f-date-debut')?.value;
        const dateFin = document.getElementById('f-date-fin')?.value;
        if (!titre) { pushNotification('Le titre est obligatoire.', 'error'); return; }
        if (!dateDebut) { pushNotification('La date de début est obligatoire.', 'error'); return; }
        if (dateFin && dateFin < dateDebut) { pushNotification('La date de fin doit être postérieure à la date de début.', 'error'); return; }
        const data = {
          nom: titre,
          type_campagne: document.getElementById('f-type')?.value || 'collecte',
          region: document.getElementById('f-region')?.value.trim() || '',
          date_debut: dateDebut,
          date_fin: dateFin || undefined,
          responsable: document.getElementById('f-responsable')?.value.trim() || '',
          description: document.getElementById('f-description')?.value.trim(),
        };
        if (id) data.statut = document.getElementById('f-statut')?.value || 'planifiee';
        try {
          showLoader();
          if (id) {
            const res = await apiRequest('PUT', `/campagnes/${id}`, data);
            if (res !== null) {
              await loadCampagnes();
              pushNotification('Campagne mise à jour.', 'success');
            }
          } else {
            const res = await apiRequest('POST', '/campagnes/', data);
            if (res !== null) {
              await loadCampagnes();
              pushNotification('Campagne créée avec succès.', 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la sauvegarde.', 'error');
        }
      },
    });
  }

  window.openCampagneModal = openCampagneModal;

  const filterMap = {
    'filter-toutes-campagnes': 'tous',
    'filter-planifiees': 'planifiee',
    'filter-en-cours': 'en_cours',
    'filter-terminees': 'terminee',
  };
  let selectedStatus = 'tous';
  const filterButtons = document.querySelectorAll(Object.keys(filterMap).map(id => `#${id}`).join(','));
  filterButtons.forEach(button => button.addEventListener('click', () => {
    selectedStatus = filterMap[button.id];
    filterButtons.forEach(item => {
      item.classList.remove('bg-brand-primary', 'text-white');
      item.classList.add('bg-brand-background', 'text-[#111418]');
    });
    button.classList.add('bg-brand-primary', 'text-white');
    button.classList.remove('bg-brand-background', 'text-[#111418]');
    applyFilters();
  }));

  const searchInput = document.querySelector('input[type="search"], input[placeholder*="chercher"]');

  function applyFilters() {
    const statusVal = selectedStatus;
    const q = searchInput?.value.toLowerCase().trim() || '';
    const filtered = campagnes.filter(c => {
      const matchStatus = statusVal === 'tous' || c.statut === statusVal;
      const matchSearch = !q || `${c.titre} ${c.nom} ${c.description}`.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    renderCampagnes(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  document.getElementById('btn-nouvelle-campagne')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampagneModal();
  });

  await loadCampagnes();
});
