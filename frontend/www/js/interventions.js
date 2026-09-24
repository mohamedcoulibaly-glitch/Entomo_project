document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let interventions = [];
  let sites = [];
  let campagnes = [];

  async function loadInterventions() {
    try {
      showLoader();
      const [data, siteData, campagneData] = await Promise.all([
        apiRequest('GET', '/interventions/'),
        apiSites.list({ limit: 500 }),
        apiCampagnes.list(),
      ]);
      if (data) interventions = data;
      if (Array.isArray(siteData)) sites = siteData;
      if (Array.isArray(campagneData)) campagnes = campagneData;
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des interventions.', 'error');
    }
    renderTable(interventions);
  }

  // Tableau en 3 colonnes par statut (Planifiées / En cours / Terminées),
  // conforme à la maquette d'origine — l'ancien rendu remplaçait cette
  // maquette par une simple grille plate de cartes identiques, perdant le
  // regroupement par colonne et les actions rapides propres à chaque statut.
  async function setStatut(id, statut, extra = {}) {
    try {
      const res = await apiRequest('PUT', `/interventions/${id}`, { statut, ...extra });
      if (res !== null) {
        const item = interventions.find(x => x.id === id);
        if (item) Object.assign(item, res);
        renderTable(interventions);
        pushNotification('Statut mis à jour.', 'success');
      }
    } catch (err) {
      pushNotification('Erreur lors de la mise à jour.', 'error');
    }
  }

  function cardMeta(item) {
    const site = sites.find(entry => entry.id === item.site_id);
    const campagne = campagnes.find(entry => entry.id === item.campagne_id);
    return { site, campagne };
  }

  function renderCard(item) {
    const { site, campagne } = cardMeta(item);
    const siteLine = `<p class="text-xs text-gray-500 dark:text-gray-400">Site: ${site?.nom || 'Non défini'}</p>`;
    const campagneLine = campagne ? `<p class="text-xs text-brand-primary">Campagne: ${campagne.nom}</p>` : '';
    const codeLabel = `INT-${String(item.id).padStart(3, '0')}`;

    if (item.statut === 'terminee' || item.statut === 'annulee') {
      const isCancelled = item.statut === 'annulee';
      const icon = isCancelled
        ? '<span class="material-symbols-outlined text-brand-alert-critical text-sm">cancel</span>'
        : '<span class="material-symbols-outlined text-brand-success text-sm">check_circle</span>';
      const dateLabel = isCancelled ? 'Annulée' : 'Terminée';
      const dateVal = item.date_realisee ? new Date(item.date_realisee).toLocaleDateString('fr-FR') : (item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : '—');
      return `<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 opacity-75 cursor-pointer group relative" data-id="${item.id}">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-semibold text-[#111418] dark:text-white flex items-center gap-1">${icon} ${item.titre || item.type_intervention || 'Intervention'}</p>
          <span class="text-xs text-gray-400">${codeLabel}</span>
        </div>
        ${siteLine}
        <p class="text-xs text-gray-500 dark:text-gray-400">${dateLabel}: ${dateVal}</p>
        ${campagneLine}
        <button class="btn-delete absolute top-1 right-1 hidden group-hover:block text-red-500 hover:text-red-700 p-1" title="Supprimer"><span class="material-symbols-outlined text-base">delete</span></button>
      </div>`;
    }

    if (item.statut === 'en_cours') {
      return `<div class="p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 cursor-pointer group relative" data-id="${item.id}">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-semibold text-[#111418] dark:text-white">${item.titre || item.type_intervention || 'Intervention'}</p>
          <span class="text-xs text-gray-400">${codeLabel}</span>
        </div>
        ${siteLine}
        <p class="text-xs text-gray-500 dark:text-gray-400">Prévue: ${item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : 'Non définie'}</p>
        ${campagneLine}
        <div class="flex gap-1 mt-2">
          <button class="btn-terminer flex items-center gap-1 h-6 px-2 text-xs rounded bg-brand-success/10 text-brand-success hover:bg-brand-success/20">Marquer terminée</button>
          <button class="btn-delete text-red-500 hover:text-red-700 p-1 ml-auto hidden group-hover:block" title="Supprimer"><span class="material-symbols-outlined text-base">delete</span></button>
        </div>
      </div>`;
    }

    // planifiee (defaut)
    return `<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer group relative" data-id="${item.id}">
      <div class="flex items-center justify-between mb-1">
        <p class="text-sm font-semibold text-[#111418] dark:text-white">${item.titre || item.type_intervention || 'Intervention'}</p>
        <span class="text-xs text-gray-400">${codeLabel}</span>
      </div>
      ${siteLine}
      <p class="text-xs text-gray-500 dark:text-gray-400">Date: ${item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : 'Non définie'}</p>
      ${campagneLine}
      <div class="flex gap-1 mt-2">
        <button class="btn-en-cours flex items-center gap-1 h-6 px-2 text-xs rounded bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Marquer en cours</button>
        <button class="btn-annuler flex items-center gap-1 h-6 px-2 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500">Annuler</button>
        <button class="btn-delete text-red-500 hover:text-red-700 p-1 ml-auto hidden group-hover:block" title="Supprimer"><span class="material-symbols-outlined text-base">delete</span></button>
      </div>
    </div>`;
  }

  function renderTable(data) {
    const container = document.getElementById('interventions-list');
    if (!container) return;
    if (!data.length) {
      container.innerHTML = '<div class="md:col-span-3 text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">emergency</span>Aucune intervention trouvée</div>';
      return;
    }

    const planifiees = data.filter(i => i.statut === 'planifiee' || !i.statut);
    const enCours = data.filter(i => i.statut === 'en_cours');
    const terminees = data.filter(i => i.statut === 'terminee' || i.statut === 'annulee');

    const columns = [
      { titre: 'Planifiées', items: planifiees, colorText: 'text-brand-alert-warning', colorBadge: 'bg-brand-alert-warning/10 text-brand-alert-warning' },
      { titre: 'En Cours', items: enCours, colorText: 'text-brand-primary', colorBadge: 'bg-brand-primary/10 text-brand-primary' },
      { titre: 'Terminées', items: terminees, colorText: 'text-brand-success', colorBadge: 'bg-brand-success/10 text-brand-success' },
    ];

    container.innerHTML = columns.map(col => `
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold ${col.colorText}">${col.titre}</h3>
          <span class="text-xs font-semibold ${col.colorBadge} px-2 py-0.5 rounded-full">${col.items.length}</span>
        </div>
        <div class="space-y-3">
          ${col.items.length ? col.items.map(renderCard).join('') : '<p class="text-xs text-gray-400 text-center py-4">Aucune intervention</p>'}
        </div>
      </div>`).join('');

    container.querySelectorAll('[data-id]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        openInterventionModal(parseInt(card.dataset.id));
      });
    });
    container.querySelectorAll('.btn-en-cours').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); setStatut(parseInt(btn.closest('[data-id]').dataset.id), 'en_cours'); });
    });
    container.querySelectorAll('.btn-terminer').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); setStatut(parseInt(btn.closest('[data-id]').dataset.id), 'terminee', { date_realisee: new Date().toISOString() }); });
    });
    container.querySelectorAll('.btn-annuler').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); setStatut(parseInt(btn.closest('[data-id]').dataset.id), 'annulee'); });
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
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
  }

  async function openInterventionModal(id = null) {
    const item = id ? interventions.find(x => x.id === id) : null;
    const defaultTypes = [
      { code: 'pulverisation_irs', label: 'Pulvérisation IRS' },
      { code: 'distribution_mii', label: 'Distribution MII' },
      { code: 'traitement_larvicide', label: 'Traitement larvicide' },
      { code: 'sensibilisation', label: 'Sensibilisation' },
    ];
    const referenceTypes = await loadReferenceData('types_intervention');
    const typesIntervention = referenceTypes.length ? referenceTypes : defaultTypes;
    const currentType = String(item?.type_intervention || item?.type || '').trim().toLowerCase();
    const typeOptions = typesIntervention.map(type => {
      const label = type.label || type.code || '';
      const value = label;
      const selected = currentType === String(label).trim().toLowerCase()
        || currentType === String(value).trim().toLowerCase();
      return `<option value="${value}" ${selected ? 'selected' : ''}>${label}</option>`;
    }).join('');
    openModal(id ? 'Modifier intervention' : 'Nouvelle intervention', `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre *</label>
          <input id="f-titre" value="${item?.titre || item?.type || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
          <select id="f-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${typeOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Site</label>
          <select id="f-site" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">Aucun site</option>${sites.map(site => `<option value="${site.id}" ${item?.site_id === site.id ? 'selected' : ''}>${site.nom}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campagne</label>
          <select id="f-campagne" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">Aucune campagne</option>${campagnes.map(c => `<option value="${c.id}" ${item?.campagne_id === c.id ? 'selected' : ''}>${c.nom}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date prévue</label>
          <input id="f-date-debut" type="date" value="${item?.date_prevue ? item.date_prevue.split('T')[0] : ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Responsable</label>
          <input id="f-responsable" value="${item?.responsable || item?.agent || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priorité</label>
          <select id="f-priorite" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="normale" ${item?.priorite === 'normale' ? 'selected' : ''}>Normale</option>
            <option value="haute" ${item?.priorite === 'haute' ? 'selected' : ''}>Haute</option>
            <option value="urgente" ${item?.priorite === 'urgente' ? 'selected' : ''}>Urgente</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région</label>
          <input id="f-region" value="${item?.region || ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="planifiee" ${!item || item.statut === 'planifiee' ? 'selected' : ''}>Planifiée</option>
            <option value="en_cours" ${item?.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="terminee" ${item?.statut === 'terminee' ? 'selected' : ''}>Terminée</option>
          </select>
        </div>
        <div class="md:col-span-2">
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
          campagne_id: Number(document.getElementById('f-campagne')?.value) || null,
          date_prevue: document.getElementById('f-date-debut')?.value || null,
          responsable: document.getElementById('f-responsable')?.value.trim() || '',
          priorite: document.getElementById('f-priorite')?.value || 'normale',
          region: document.getElementById('f-region')?.value.trim() || '',
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

  window.openInterventionModal = openInterventionModal;

  let selectedStatus = 'tous';
  let selectedType = 'tous';
  let selectedSite = 'tous';
  let selectedCampagne = 'tous';
  const searchInput = document.querySelector('input[type="search"], input[placeholder*="chercher"]');

  function applyFilters() {
    const statusVal = selectedStatus;
    const typeVal = selectedType;
    const q = searchInput?.value.toLowerCase().trim() || '';
    const filtered = interventions.filter(item => {
      const matchStatus = statusVal === 'tous' || item.statut === statusVal;
      const matchType = typeVal === 'tous' || (item.type_intervention || item.type) === typeVal;
      const matchSite = selectedSite === 'tous' || String(item.site_id) === selectedSite;
      const matchCampagne = selectedCampagne === 'tous' || String(item.campagne_id) === selectedCampagne;
      const matchSearch = !q || `${item.titre} ${item.type} ${item.site_nom}`.toLowerCase().includes(q);
      return matchStatus && matchType && matchSite && matchCampagne && matchSearch;
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
  bindFilterButton('filter-campagne', 'Filtrer par campagne', () => [{ value: 'tous', label: 'Toutes les campagnes' }, ...campagnes.map(c => ({ value: String(c.id), label: c.nom }))], value => { selectedCampagne = value; });

  document.getElementById('btn-nouvelle-intervention')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof window.openInterventionModal === 'function') {
      window.openInterventionModal();
      return;
    }
    pushNotification('Le formulaire d’intervention est indisponible.', 'warning');
  });

  await loadInterventions();
});
