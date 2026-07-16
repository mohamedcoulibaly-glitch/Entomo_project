document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let interventions = [];
  let sites = [];

  async function loadInterventions() {
    try {
      showLoader();
      const [data, siteData] = await Promise.all([
        apiRequest('GET', '/interventions/'),
        apiSites.list({ limit: 500 }),
      ]);
      if (data) interventions = data;
      if (Array.isArray(siteData)) sites = siteData;
      const siteSelect = document.getElementById('interv-site');
      if (siteSelect) {
        siteSelect.innerHTML = '<option value="">Sélectionner un site</option>' + sites.map(site => `<option value="${site.id}">${site.code || `SITE-${site.id}`} - ${site.nom}</option>`).join('');
      }
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des interventions.', 'error');
    }
    renderTable(interventions);
  }

  function renderTable(data) {
    const container = document.getElementById('interventions-list');
    if (!container) return;
    if (!data.length) {
      container.innerHTML = '<div class="md:col-span-3 text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">emergency</span>Aucune intervention trouvée</div>';
      return;
    }
    container.innerHTML = data.map(item => {
      const statusColors = { planifiee: 'bg-blue-100 text-blue-800', en_cours: 'bg-yellow-100 text-yellow-800', terminee: 'bg-green-100 text-green-800', annulee: 'bg-red-100 text-red-800' };
      const statusLabel = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
      const site = sites.find(entry => entry.id === item.site_id);
      return `<article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800" data-id="${item.id}">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div><h3 class="font-bold text-gray-900 dark:text-white">${item.titre || 'Intervention'}</h3><p class="text-xs text-gray-500">${item.type_intervention || 'N/A'}</p></div>
          <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.statut] || 'bg-gray-100 text-gray-700'}">${statusLabel[item.statut] || item.statut}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300"><span class="material-symbols-outlined align-middle text-base">location_on</span> ${site?.nom || `Site #${item.site_id || 'N/A'}`}</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300"><span class="material-symbols-outlined align-middle text-base">event</span> ${item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : 'Date non définie'}</p>
        <div class="mt-4 flex gap-2 justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
            <button class="btn-status text-yellow-600 hover:text-yellow-800 p-1 rounded" title="Changer statut"><span class="material-symbols-outlined" style="font-size:20px">sync</span></button>
            <button class="btn-edit text-primary hover:text-primary/80 p-1 rounded" title="Modifier"><span class="material-symbols-outlined" style="font-size:20px">edit</span></button>
            <button class="btn-delete text-red-600 hover:text-red-800 p-1 rounded" title="Supprimer"><span class="material-symbols-outlined" style="font-size:20px">delete</span></button>
        </div>
      </article>`;
    }).join('');

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openInterventionModal(parseInt(btn.closest('[data-id]').dataset.id)));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = interventions.find(x => x.id === parseInt(btn.closest('[data-id]').dataset.id));
        if (!item) return;
        confirmDelete(item.titre || 'intervention', async () => {
          try {
            const res = await apiRequest('DELETE', `/interventions/${item.id}`);
            if (res !== null) {
              interventions = interventions.filter(x => x.id !== item.id);
              renderTable(interventions);
              pushNotification('Intervention supprimée.', 'success');
            }
          } catch (err) {
            pushNotification('Erreur lors de la suppression.', 'error');
          }
        });
      });
    });
    container.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = interventions.find(x => x.id === parseInt(btn.closest('[data-id]').dataset.id));
        if (!item) return;
        openModal('Changer le statut', `
          <div class="space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-400">Intervention: <strong>${item.titre || item.type}</strong></p>
            <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
              <option value="planifiee" ${item.statut === 'planifiee' ? 'selected' : ''}>Planifiée</option>
              <option value="en_cours" ${item.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
              <option value="terminee" ${item.statut === 'terminee' ? 'selected' : ''}>Terminée</option>
              <option value="annulee" ${item.statut === 'annulee' ? 'selected' : ''}>Annulée</option>
            </select>
          </div>`, {
          confirmLabel: 'Mettre à jour',
          onConfirm: async () => {
            const statut = document.getElementById('f-statut')?.value;
            try {
              const res = await apiRequest('PUT', `/interventions/${item.id}`, { statut });
              if (res !== null) {
                item.statut = statut;
                renderTable(interventions);
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

  async function openInterventionModal(id = null) {
    const item = id ? interventions.find(x => x.id === id) : null;
    const typesIntervention = await loadReferenceData('types_intervention');
    openModal(id ? 'Modifier intervention' : 'Nouvelle intervention', `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre *</label>
          <input id="f-titre" value="${item?.titre || item?.type || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
          <select id="f-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${typesIntervention.map(t => `<option ${(item?.type_intervention === t.label || item?.type === t.label) ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Site</label>
          <select id="f-site" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">Aucun site</option>${sites.map(site => `<option value="${site.id}" ${item?.site_id === site.id ? 'selected' : ''}>${site.nom}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date début</label>
          <input id="f-date-debut" type="date" value="${item?.date_prevue ? item.date_prevue.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="planifiee" ${!item || item.statut === 'planifiee' ? 'selected' : ''}>Planifiée</option>
            <option value="en_cours" ${item?.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="terminee" ${item?.statut === 'terminee' ? 'selected' : ''}>Terminée</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-description" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${item?.description || ''}</textarea>
        </div>
      </div>`, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const titre = document.getElementById('f-titre')?.value.trim();
        if (!titre) { pushNotification('Le titre est obligatoire.', 'error'); return; }
        const data = {
          titre,
          type_intervention: document.getElementById('f-type')?.value,
          site_id: Number(document.getElementById('f-site')?.value) || null,
          date_prevue: document.getElementById('f-date-debut')?.value || null,
          description: document.getElementById('f-description')?.value.trim(),
        };
        if (id) data.statut = document.getElementById('f-statut')?.value || 'planifiee';
        try {
          showLoader();
          if (id) {
            const res = await apiRequest('PUT', `/interventions/${id}`, data);
            if (res !== null) {
              await loadInterventions();
              pushNotification('Intervention mise à jour.', 'success');
            }
          } else {
            const res = await apiRequest('POST', '/interventions/', data);
            if (res !== null) {
              await loadInterventions();
              pushNotification('Intervention créée avec succès.', 'success');
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

  let selectedStatus = 'tous';
  let selectedType = 'tous';
  let selectedSite = 'tous';
  const searchInput = document.querySelector('input[type="search"], input[placeholder*="chercher"]');

  function applyFilters() {
    const statusVal = selectedStatus;
    const typeVal = selectedType;
    const q = searchInput?.value.toLowerCase().trim() || '';
    const filtered = interventions.filter(item => {
      const matchStatus = statusVal === 'tous' || item.statut === statusVal;
      const matchType = typeVal === 'tous' || (item.type_intervention || item.type) === typeVal;
      const matchSite = selectedSite === 'tous' || String(item.site_id) === selectedSite;
      const matchSearch = !q || `${item.titre} ${item.type} ${item.site_nom}`.toLowerCase().includes(q);
      return matchStatus && matchType && matchSite && matchSearch;
    });
    renderTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  function bindFilterButton(id, title, options, onSelect) {
    document.getElementById(id)?.addEventListener('click', () => {
      openModal(title, `<select id="intervention-filter-value" class="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700">${options().map(option => `<option value="${option.value}">${option.label}</option>`).join('')}</select>`, {
        confirmLabel: 'Appliquer',
        onConfirm: () => {
          const value = document.getElementById('intervention-filter-value')?.value || 'tous';
          onSelect(value);
          applyFilters();
        },
      });
    });
  }
  bindFilterButton('filter-statut', 'Filtrer par statut', () => [
    { value: 'tous', label: 'Tous les statuts' }, { value: 'planifiee', label: 'Planifiées' },
    { value: 'en_cours', label: 'En cours' }, { value: 'terminee', label: 'Terminées' }, { value: 'annulee', label: 'Annulées' },
  ], value => { selectedStatus = value; });
  bindFilterButton('filter-type', 'Filtrer par type', () => [{ value: 'tous', label: 'Tous les types' }, ...[...new Set(interventions.map(item => item.type_intervention).filter(Boolean))].map(value => ({ value, label: value }))], value => { selectedType = value; });
  bindFilterButton('filter-site', 'Filtrer par site', () => [{ value: 'tous', label: 'Tous les sites' }, ...sites.map(site => ({ value: String(site.id), label: site.nom }))], value => { selectedSite = value; });

  document.getElementById('btn-creer-intervention')?.addEventListener('click', async () => {
    const titre = document.getElementById('interv-titre')?.value.trim();
    const siteId = Number(document.getElementById('interv-site')?.value) || null;
    const datePrevue = document.getElementById('interv-date')?.value;
    if (!titre) { pushNotification("Le titre de l'intervention est obligatoire.", 'error'); return; }
    const button = document.getElementById('btn-creer-intervention');
    buttonLoading(button, true);
    try {
      const created = await apiRequest('POST', '/interventions/', {
        titre,
        site_id: siteId,
        type_intervention: document.getElementById('interv-type')?.value || 'pulverisation',
        date_prevue: datePrevue || null,
      });
      if (created) {
        document.getElementById('form-nouvelle-intervention')?.reset();
        await loadInterventions();
        pushNotification('Intervention créée et enregistrée en base.', 'success');
      }
    } catch (error) { pushNotification("La création de l'intervention a échoué.", 'error'); }
    finally { buttonLoading(button, false); }
  });

  await loadInterventions();
});
