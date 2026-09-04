document.addEventListener('DOMContentLoaded', async () => {
  let sites = [];
  let editingId = null;
  let selectedSiteId = null;

  function norm(s) {
    let region = s.region || '';
    let district = s.district || '';
    if (s.localisation && typeof s.localisation === 'object') {
      region = s.localisation.region || region;
      district = s.localisation.district || district;
    }
    return {
      ...s,
      nom: s.nom || s.name || '',
      code: s.code || '',
      region,
      district,
      type_zone: s.type_zone || s.type || '',
      environnement: s.environnement || '',
      statut: s.actif !== false ? 'Actif' : 'Inactif',
      actif: s.actif !== false,
      coord: s.coordonnees || s.coord || '',
    };
  }

  async function loadSites() {
    try {
      showLoader();
      const data = await apiSites.list({ limit: 200 });
      if (data) sites = data.map(norm);
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des sites', 'error');
    }
    applyFilters();
    if (sites.length) {
      selectedSiteId = sites[0].id;
      loadTimeline(sites[0].id);
    }
  }

  function renderTable(data) {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    tbody.innerHTML = data.length === 0
      ? `<tr><td colspan="5" class="text-center py-10 text-gray-400">
           <span class="material-symbols-outlined text-4xl block mb-2">location_off</span>Aucun site trouvé</td></tr>`
      : data.map(s => `
      <tr class="border-b bg-transparent dark:border-gray-700 hover:bg-gray-300/50 dark:hover:bg-gray-600/20 transition-colors cursor-pointer ${selectedSiteId === s.id ? 'bg-primary/10 dark:bg-primary/20' : ''}" data-id="${s.id}">
        <th class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white" scope="row">${s.nom}</th>
        <td class="px-6 py-4">${s.type_zone}</td>
        <td class="px-6 py-4">${s.region}</td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5
            ${s.statut === 'Actif'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}">${s.statut}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex gap-4 justify-end">
            <button class="btn-edit font-medium text-primary hover:underline" data-id="${s.id}">
              <span class="material-symbols-outlined text-xl">edit</span>
            </button>
            <button class="btn-delete font-medium text-red-500 hover:underline" data-id="${s.id}">
              <span class="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        </td>
        </tr>`).join('');

    initPagination('table tbody', 10);

    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        const id = parseInt(this.dataset.id);
        selectedSiteId = id;
        loadTimeline(id);
        renderTable(sites);
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openSiteModal(parseInt(btn.dataset.id)); });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const s = sites.find(x => x.id === parseInt(btn.dataset.id));
        if (!s) return;
        confirmDelete(s.nom, async () => {
          try {
            const res = await apiSites.delete(s.id);
            if (res !== null) {
              sites = sites.filter(x => x.id !== s.id);
              if (selectedSiteId === s.id) {
                selectedSiteId = sites.length ? sites[0].id : null;
                if (selectedSiteId) loadTimeline(selectedSiteId);
              }
              applyFilters();
              pushNotification(`Site "${s.nom}" supprimé.`, 'success');
            }
          } catch (err) {
            pushNotification('Erreur lors de la suppression', 'error');
          }
        });
      });
    });
  }

  async function loadTimeline(siteId) {
    const timelineContainer = document.querySelector('.flex-grow.space-y-4') || document.querySelector('.overflow-y-auto.pr-2');
    if (!timelineContainer) return;
    try {
      const data = await apiSites.activites(siteId);
      if (data && data.length) {
        const colors = ['bg-primary', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
        timelineContainer.innerHTML = data.map((act, i) => `
          <div class="relative pl-6">
            <div class="absolute left-0 top-1 h-full w-0.5 bg-gray-300 dark:bg-gray-700"></div>
            <div class="absolute left-[-5px] top-1.5 w-3 h-3 rounded-full ${colors[i % colors.length]}"></div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">${act.titre || act.type || 'Activité'}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${act.date ? new Date(act.date).toLocaleDateString('fr-FR') : ''}${act.utilisateur ? ' par ' + act.utilisateur : ''}</p>
            ${act.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${act.description}</p>` : ''}
          </div>`).join('');
      } else {
        timelineContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">Aucune activité pour ce site</p>`;
      }
    } catch (err) {
      timelineContainer.innerHTML = `<p class="text-sm text-red-400 text-center py-4">Erreur de chargement des activités</p>`;
    }
  }

  async function openSiteModal(id = null) {
    editingId = id;
    const s = id ? sites.find(x => x.id === id) : null;

    // Utiliser les données statiques de référence pour les selects
    const regions = (typeof REFERENCE_DATA_STATIC !== 'undefined' && REFERENCE_DATA_STATIC.regions)
      ? REFERENCE_DATA_STATIC.regions
      : [{ code: 'dakar', label: 'Dakar' }, { code: 'thies', label: 'Thiès' }];

    const typesZones = (typeof REFERENCE_DATA_STATIC !== 'undefined' && REFERENCE_DATA_STATIC.types_zones)
      ? REFERENCE_DATA_STATIC.types_zones
      : [{ code: 'urbain', label: 'Urbain' }, { code: 'rural', label: 'Rural' }];

    const environnements = (typeof REFERENCE_DATA_STATIC !== 'undefined' && REFERENCE_DATA_STATIC.environnements)
      ? REFERENCE_DATA_STATIC.environnements
      : [{ code: 'interieur', label: 'Intérieur' }, { code: 'exterieur', label: 'Extérieur' }];

    const body = `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code *</label>
          <input id="f-code" value="${s?.code || ''}" placeholder="ex: SITE-KDG-01"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du site *</label>
          <input id="f-nom" value="${s?.nom || ''}" placeholder="ex: Site Kédougou-1"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région</label>
          <select id="f-region" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">-- Sélectionner --</option>
            ${regions.map(r => `<option value="${r.label}" ${s?.region === r.label ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">District</label>
          <input id="f-district" value="${s?.district || ''}" placeholder="ex: Kédougou"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type de zone</label>
          <select id="f-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">-- Sélectionner --</option>
            ${typesZones.map(t => `<option value="${t.label}" ${s?.type_zone === t.label ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Environnement</label>
          <select id="f-env" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option value="">-- Sélectionner --</option>
            ${environnements.map(e => `<option value="${e.label}" ${s?.environnement === e.label ? 'selected' : ''}>${e.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option ${!s || s.statut === 'Actif' ? 'selected' : ''}>Actif</option>
            <option ${s?.statut === 'Inactif' ? 'selected' : ''}>Inactif</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Coordonnées GPS</label>
          <input id="f-coord" value="${s?.coord || ''}" placeholder="ex: 12.5574°N 12.1752°W"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 font-mono"/>
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes / Description</label>
          <textarea id="f-notes" rows="2" placeholder="Informations complémentaires sur le site..."
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 resize-none">${s?.notes || s?.description || ''}</textarea>
        </div>
      </div>`;

    openModal(id ? `Modifier — ${s.nom}` : 'Ajouter un site sentinelle', body, {
      confirmLabel: id ? 'Enregistrer' : 'Ajouter',
      onConfirm: async () => {
        const code = document.getElementById('f-code')?.value.trim();
        const nom = document.getElementById('f-nom')?.value.trim();
        if (!code || !nom) { pushNotification('Code et nom obligatoires.', 'error'); return; }
        const data = {
          code, nom,
          region: document.getElementById('f-region')?.value || '',
          district: document.getElementById('f-district')?.value.trim() || '',
          type_zone: document.getElementById('f-type')?.value || '',
          environnement: document.getElementById('f-env')?.value || '',
          actif: document.getElementById('f-statut')?.value === 'Actif',
          coordonnees: document.getElementById('f-coord')?.value.trim() || '',
          notes: document.getElementById('f-notes')?.value.trim() || '',
        };
        try {
          showLoader();
          if (editingId) {
            const res = await apiSites.update(editingId, data);
            if (res !== null) {
              await loadSites();
              pushNotification(`Site "${nom}" mis à jour.`, 'success');
            }
          } else {
            const res = await apiSites.create(data);
            if (res !== null) {
              await loadSites();
              pushNotification(`Site "${nom}" ajouté.`, 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la sauvegarde', 'error');
        }
      },
    });
  }

  window.openSiteModal = openSiteModal;

  // Connexion du bouton "Nouveau Site" — cible d'abord l'id dédié
  const btnNouveauSite = document.getElementById('btn-nouveau-site');
  if (btnNouveauSite) {
    btnNouveauSite.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof window.openSiteModal === 'function') {
        window.openSiteModal();
        return;
      }
      window.location.href = 'nouveau-site.html';
    });
  } else {
    document.querySelectorAll('button').forEach(btn => {
      const t = btn.textContent.trim();
      if (t.includes('Ajouter un Site') || t.includes('Nouveau Site') || t.includes('Ajouter')) {
        btn.addEventListener('click', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (typeof window.openSiteModal === 'function') {
            window.openSiteModal();
            return;
          }
          window.location.href = 'nouveau-site.html';
        });
      }
    });
  }

  const searchInput = document.getElementById('search-sites') || document.querySelector('input[placeholder*="Rechercher"]');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  const regionFilter = document.getElementById('region-filter');
  const districtFilter = document.getElementById('district-filter');
  const zoneTypeFilter = document.getElementById('zone-type-filter');
  const envFilter = document.getElementById('environment-filter');

  [regionFilter, districtFilter, zoneTypeFilter, envFilter].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });

  function applyFilters() {
    const q = searchInput?.value.toLowerCase().trim() || '';
    const region = regionFilter?.value || '';
    const district = districtFilter?.value || '';
    const zoneType = zoneTypeFilter?.value || '';
    const env = envFilter?.value || '';

    const filtered = sites.filter(s => {
      const matchQ = !q || `${s.nom} ${s.code} ${s.region} ${s.district}`.toLowerCase().includes(q);
      const matchRegion = !region || region === 'Toutes les régions' || s.region.toLowerCase() === region.toLowerCase();
      const matchDistrict = !district || district === 'Tous les districts' || s.district.toLowerCase() === district.toLowerCase();
      const matchType = !zoneType || zoneType === 'Tous types' || s.type_zone.toLowerCase() === zoneType.toLowerCase().replace('aine', '');
      const matchEnv = !env || env === 'Tous environnements' || (s.environnement && s.environnement.toLowerCase() === env.toLowerCase());
      return matchQ && matchRegion && matchDistrict && matchType && matchEnv;
    });
    renderTable(filtered);
  }

  await loadSites();
});
