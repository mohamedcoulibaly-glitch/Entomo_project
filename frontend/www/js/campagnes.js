document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let campagnes = [];

  async function loadCampagnes() {
    try {
      showLoader();
      const data = await apiRequest('GET', '/campagnes/');
      if (data) campagnes = data;
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des campagnes.', 'error');
    }
    renderCampagnes(campagnes);
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
        </div>
        <div class="flex gap-2 justify-end border-t border-gray-100 dark:border-gray-700 pt-3">
          <button class="btn-status text-xs text-yellow-600 hover:text-yellow-800 font-medium">Changer statut</button>
          <button class="btn-edit text-xs text-primary hover:text-primary/80 font-medium">Modifier</button>
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
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre *</label>
          <input id="f-titre" value="${c?.titre || c?.nom || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date début</label>
            <input id="f-date-debut" type="date" value="${c?.date_debut ? c.date_debut.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date fin</label>
            <input id="f-date-fin" type="date" value="${c?.date_fin ? c.date_fin.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-description" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${c?.description || ''}</textarea>
        </div>
      </div>`, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const titre = document.getElementById('f-titre')?.value.trim();
        if (!titre) { pushNotification('Le titre est obligatoire.', 'error'); return; }
        const data = {
          nom: titre,
          date_debut: document.getElementById('f-date-debut')?.value,
          date_fin: document.getElementById('f-date-fin')?.value,
          description: document.getElementById('f-description')?.value.trim(),
        };
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

  document.getElementById('btn-creer-campagne')?.addEventListener('click', async () => {
    const nom = document.getElementById('camp-titre')?.value.trim();
    if (!nom) { pushNotification('Le titre de la campagne est obligatoire.', 'error'); return; }
    const dateDebut = document.getElementById('camp-date-debut')?.value;
    const dateFin = document.getElementById('camp-date-fin')?.value;
    if (dateDebut && dateFin && dateFin < dateDebut) {
      pushNotification('La date de fin doit être postérieure à la date de début.', 'error');
      return;
    }
    const button = document.getElementById('btn-creer-campagne');
    buttonLoading(button, true);
    try {
      const created = await apiRequest('POST', '/campagnes/', {
        nom,
        type_campagne: document.getElementById('camp-type')?.value || 'collecte',
        region: document.getElementById('camp-region')?.value || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        responsable: document.getElementById('camp-responsable')?.value.trim() || null,
      });
      if (created) {
        document.getElementById('form-nouvelle-campagne')?.reset();
        await loadCampagnes();
        pushNotification('Campagne créée et enregistrée en base.', 'success');
      }
    } catch (error) { pushNotification('La création de la campagne a échoué.', 'error'); }
    finally { buttonLoading(button, false); }
  });

  await loadCampagnes();
});
