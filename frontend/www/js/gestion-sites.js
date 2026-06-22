/**
 * gestion-sites.js
 * Gestion des sites sentinelles — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  const FALLBACK = [
    { id: 1, code: 'SITE-KED-01', nom: 'Site Kédougou A',     region: 'Kédougou',    district: 'Kédougou',    type: 'Rural',       actif: true,  coord: '12.5574°N 12.1752°W' },
    { id: 2, code: 'SITE-TAM-01', nom: 'Site Tambacounda B',  region: 'Tambacounda', district: 'Tambacounda', type: 'Périurbain',  actif: true,  coord: '13.7706°N 13.6673°W' },
    { id: 3, code: 'SITE-KOL-01', nom: 'Site Kolda C',        region: 'Kolda',       district: 'Kolda',       type: 'Rural',       actif: false, coord: '12.8944°N 14.9508°W' },
    { id: 4, code: 'SITE-DKR-01', nom: 'Site Dakar D',        region: 'Dakar',       district: 'Pikine',      type: 'Urbain',      actif: true,  coord: '14.6928°N 17.4467°W' },
    { id: 5, code: 'SITE-STL-01', nom: 'Site Saint-Louis E',  region: 'Saint-Louis', district: 'Saint-Louis', type: 'Urbain',      actif: true,  coord: '16.0179°N 16.4896°W' },
    { id: 6, code: 'SITE-ZIG-01', nom: 'Site Ziguinchor F',   region: 'Ziguinchor',  district: 'Ziguinchor',  type: 'Rural',       actif: true,  coord: '12.5682°N 16.2719°W' },
  ];

  function norm(s) {
    return { ...s, statut: s.actif !== false ? 'Actif' : 'Inactif', coord: s.coordonnees || s.coord || '' };
  }

  let sites = [];
  let editingId = null;

  async function loadSites() {
    if (typeof apiSites !== 'undefined') {
      const data = await apiSites.list({ limit: 100 });
      sites = data ? data.map(norm) : FALLBACK.map(norm);
    } else {
      sites = FALLBACK.map(norm);
    }
    applyFilters();
  }

  function renderTable(data) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = data.length === 0
      ? `<tr><td colspan="7" class="text-center py-10 text-gray-400">
           <span class="material-symbols-outlined text-4xl block mb-2">location_off</span>Aucun site trouvé</td></tr>`
      : data.map(s => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors" data-id="${s.id}">
        <td class="px-6 py-4 text-sm font-mono text-brand-primary font-medium">${s.code}</td>
        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${s.nom}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${s.region}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${s.district}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold
            ${s.type==='Rural'?'bg-green-50 text-green-700':''}
            ${s.type==='Urbain'?'bg-blue-50 text-blue-700':''}
            ${s.type==='Périurbain'?'bg-purple-50 text-purple-700':''}">
            ${s.type}
          </span>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5
            ${s.statut==='Actif'
              ?'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
              :'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}">${s.statut}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-1">
            <button class="btn-view p-1 rounded text-gray-500 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${s.id}" title="Voir sur carte">
              <span class="material-symbols-outlined" style="font-size:18px">map</span>
            </button>
            <button class="btn-edit p-1 rounded text-primary hover:text-primary/80 hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${s.id}" title="Modifier">
              <span class="material-symbols-outlined" style="font-size:18px">edit</span>
            </button>
            <button class="btn-delete p-1 rounded text-red-600 hover:text-red-800 hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${s.id}" title="Supprimer">
              <span class="material-symbols-outlined" style="font-size:18px">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = sites.find(x => x.id === parseInt(btn.dataset.id));
        if (!s) return;
        openModal(`📍 ${s.nom}`,
          `<div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div><p class="text-gray-500">Code</p><strong>${s.code}</strong></div>
              <div><p class="text-gray-500">Statut</p><strong>${s.statut}</strong></div>
              <div><p class="text-gray-500">Région</p><strong>${s.region}</strong></div>
              <div><p class="text-gray-500">District</p><strong>${s.district}</strong></div>
              <div><p class="text-gray-500">Type</p><strong>${s.type}</strong></div>
              <div><p class="text-gray-500">Coordonnées</p><strong class="font-mono text-xs">${s.coord}</strong></div>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
              <span class="material-symbols-outlined text-4xl text-brand-primary block mb-1">satellite_alt</span>
              <p class="text-xs text-gray-500">Vue cartographique disponible dans le tableau de bord</p>
            </div>
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
        );
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openSiteModal(parseInt(btn.dataset.id)));
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = sites.find(x => x.id === parseInt(btn.dataset.id));
        if (!s) return;
        confirmDelete(s.nom, async () => {
          if (typeof apiSites !== 'undefined') {
            await apiSites.delete(s.id);
          }
          sites = sites.filter(x => x.id !== s.id);
          applyFilters();
          pushNotification(`Site "${s.nom}" supprimé.`, 'info');
        });
      });
    });
  }

  function openSiteModal(id = null) {
    editingId = id;
    const s = id ? sites.find(x => x.id === id) : null;

    const body = `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code *</label>
          <input id="f-code" value="${s?.code||''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du site *</label>
          <input id="f-nom" value="${s?.nom||''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Région</label>
          <input id="f-region" value="${s?.region||''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">District</label>
          <input id="f-district" value="${s?.district||''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
          <select id="f-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${['Rural','Urbain','Périurbain'].map(t=>`<option ${s?.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            <option ${s?.statut==='Actif'?'selected':''}>Actif</option>
            <option ${s?.statut==='Inactif'?'selected':''}>Inactif</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Coordonnées GPS</label>
          <input id="f-coord" value="${s?.coord||''}" placeholder="ex: 12.5574°N 12.1752°W"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 font-mono"/>
        </div>
      </div>`;

    openModal(id ? `Modifier ${s.nom}` : 'Ajouter un site sentinelle', body, {
      confirmLabel: id ? 'Enregistrer' : 'Ajouter',
      onConfirm: async () => {
        const code = document.getElementById('f-code')?.value.trim();
        const nom  = document.getElementById('f-nom')?.value.trim();
        if (!code || !nom) { pushNotification('Code et nom obligatoires.', 'error'); return; }
        const data = {
          code, nom,
          region:      document.getElementById('f-region')?.value.trim(),
          district:    document.getElementById('f-district')?.value.trim(),
          type_zone:   document.getElementById('f-type')?.value,
          actif:       document.getElementById('f-statut')?.value === 'Actif',
          coordonnees: document.getElementById('f-coord')?.value.trim(),
        };
        showLoader();
        if (editingId) {
          if (typeof apiSites !== 'undefined') {
            await apiSites.update(editingId, data);
          }
          const idx = sites.findIndex(x => x.id === editingId);
          sites[idx] = { ...sites[idx], ...data, statut: data.actif ? 'Actif' : 'Inactif', coord: data.coordonnees };
          pushNotification(`Site "${nom}" mis à jour.`, 'success');
        } else {
          let created = null;
          if (typeof apiSites !== 'undefined') {
            created = await apiSites.create(data);
          }
          const displayData = { ...data, id: created?.id || Date.now(), statut: data.actif ? 'Actif' : 'Inactif', coord: data.coordonnees, type: data.type_zone };
          sites.unshift(displayData);
          pushNotification(`Site "${nom}" ajouté.`, 'success');
        }
        hideLoader();
        applyFilters();
      },
    });
  }

  // Bouton ajouter
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Ajouter') && !btn.classList.contains('btn-edit')) {
      btn.addEventListener('click', () => openSiteModal());
    }
  });

  const searchInput = document.querySelector('input[placeholder]');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  let filterType = 'Tous', filterStatut = 'Tous';

  document.querySelectorAll('button').forEach(btn => {
    const p = btn.querySelector('p');
    if (!p) return;
    if (p.textContent.startsWith('Type')) {
      btn.addEventListener('click', () =>
        showDD(btn, ['Tous','Rural','Urbain','Périurbain'], v => { filterType = v; p.textContent = `Type: ${v}`; applyFilters(); }));
    }
    if (p.textContent.startsWith('Statut')) {
      btn.addEventListener('click', () =>
        showDD(btn, ['Tous','Actif','Inactif'], v => { filterStatut = v; p.textContent = `Statut: ${v}`; applyFilters(); }));
    }
  });

  function showDD(anchor, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'filter-dd absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[150px] py-1';
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
    renderTable(sites.filter(s => {
      const matchQ = !q || `${s.nom} ${s.code} ${s.region} ${s.district}`.toLowerCase().includes(q);
      const matchT = filterType   === 'Tous' || s.type   === filterType;
      const matchS = filterStatut === 'Tous' || s.statut === filterStatut;
      return matchQ && matchT && matchS;
    }));
  }

  initTableSort('table');
  loadSites();

});
