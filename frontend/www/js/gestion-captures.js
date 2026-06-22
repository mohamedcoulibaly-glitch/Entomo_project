/**
 * gestion-captures.js
 * Gestion des captures de laboratoire — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  // Données fallback (mode hors-ligne)
  const FALLBACK = [
    { id: 1, code: 'CAP-2024-001', site: 'Site Kédougou A',      date_capture: '2024-06-15', technicien: 'Ousmane Faye',  espece: 'An. gambiae',   quantite: 45, statut: 'analyse' },
    { id: 2, code: 'CAP-2024-002', site: 'Site Tambacounda B',   date_capture: '2024-06-14', technicien: 'Mouss Sarr',    espece: 'An. funestus',  quantite: 12, statut: 'en_attente' },
    { id: 3, code: 'CAP-2024-003', site: 'Site Kolda C',         date_capture: '2024-06-13', technicien: 'Ibrahima Diop', espece: 'Culex sp.',     quantite: 78, statut: 'analyse' },
    { id: 4, code: 'CAP-2024-004', site: 'Site Dakar D',         date_capture: '2024-06-12', technicien: 'Aminata Cissé', espece: 'An. arabiensis',quantite: 23, statut: 'rejete' },
    { id: 5, code: 'CAP-2024-005', site: 'Site Saint-Louis E',   date_capture: '2024-06-11', technicien: 'Rokhaya Sarr',  espece: 'An. gambiae',   quantite: 56, statut: 'en_attente' },
    { id: 6, code: 'CAP-2024-006', site: 'Site Ziguinchor F',    date_capture: '2024-06-10', technicien: 'Mamadou Bah',   espece: 'An. funestus',  quantite: 33, statut: 'analyse' },
  ];

  // Normaliser les statuts API → affichage
  const STATUT_LABEL = { 'analyse': 'Analysé', 'en_attente': 'En attente', 'rejete': 'Rejeté', 'Analysé': 'Analysé', 'En attente': 'En attente', 'Rejeté': 'Rejeté' };
  const STATUT_API   = { 'Analysé': 'analyse', 'En attente': 'en_attente', 'Rejeté': 'rejete' };

  function norm(c) {
    return {
      ...c,
      date:       c.date_capture || c.date || '',
      technicien: c.technicien || c.utilisateur?.nom_complet || 'N/A',
      site:       c.site?.nom || c.site || 'N/A',
      statut:     STATUT_LABEL[c.statut] || c.statut,
      espece:     c.espece_identifiee || c.espece || 'N/A',
    };
  }

  let captures = [];
  let editingId = null;

  // Charger depuis l'API (ou fallback)
  async function loadCaptures() {
    if (typeof apiCaptures !== 'undefined') {
      const data = await apiCaptures.list({ limit: 100 });
      captures = data ? data.map(norm) : FALLBACK.map(norm);
    } else {
      captures = FALLBACK.map(norm);
    }
    applyFilters();
  }

  function renderTable(data) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">search_off</span>Aucune capture trouvée</td></tr>`;
      return;
    }

    const statutColors = {
      'Analysé':    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      'En attente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      'Rejeté':     'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };

    tbody.innerHTML = data.map(c => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" data-id="${c.id}">
        <td class="px-6 py-4 text-sm font-mono font-medium text-brand-primary">${c.code}</td>
        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${c.site}</td>
        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${c.technicien}</td>
        <td class="px-6 py-4 text-sm italic text-gray-600 dark:text-gray-400">${c.espece}</td>
        <td class="px-6 py-4 text-sm font-bold text-[#111418] dark:text-white text-center">${c.quantite}</td>
        <td class="px-6 py-4">
          <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statutColors[c.statut] || ''}">${c.statut}</span>
        </td>
        <td class="px-6 py-4 text-right text-sm font-medium">
          <div class="flex items-center justify-end gap-1">
            <button class="btn-view text-gray-500 hover:text-brand-primary p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${c.id}" title="Voir détails">
              <span class="material-symbols-outlined" style="font-size:18px">visibility</span>
            </button>
            <button class="btn-edit text-primary hover:text-primary/80 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${c.id}" title="Modifier">
              <span class="material-symbols-outlined" style="font-size:18px">edit</span>
            </button>
            <button class="btn-delete text-red-600 hover:text-red-800 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" data-id="${c.id}" title="Supprimer">
              <span class="material-symbols-outlined" style="font-size:18px">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join('');

    // Événements
    tbody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); viewCapture(parseInt(btn.dataset.id)); });
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openCaptureModal(parseInt(btn.dataset.id)); });
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const c = captures.find(x => x.id === parseInt(btn.dataset.id));
        if (!c) return;
        confirmDelete(c.code, async () => {
          if (typeof apiCaptures !== 'undefined') {
            await apiCaptures.delete(c.id);
          }
          captures = captures.filter(x => x.id !== c.id);
          applyFilters();
          pushNotification(`Capture "${c.code}" supprimée.`, 'info');
        });
      });
    });
  }

  function viewCapture(id) {
    const c = captures.find(x => x.id === id);
    if (!c) return;
    openModal(`Détails — ${c.code}`,
      `<div class="grid grid-cols-2 gap-3 text-sm">
        <div><span class="text-gray-500">Code :</span><br/><strong>${c.code}</strong></div>
        <div><span class="text-gray-500">Site :</span><br/><strong>${c.site}</strong></div>
        <div><span class="text-gray-500">Date :</span><br/><strong>${new Date(c.date).toLocaleDateString('fr-FR')}</strong></div>
        <div><span class="text-gray-500">Technicien :</span><br/><strong>${c.technicien}</strong></div>
        <div><span class="text-gray-500">Espèce :</span><br/><strong><em>${c.espece}</em></strong></div>
        <div><span class="text-gray-500">Quantité :</span><br/><strong>${c.quantite}</strong></div>
        <div class="col-span-2"><span class="text-gray-500">Statut :</span> <strong>${c.statut}</strong></div>
      </div>`,
      { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
    );
  }

  function openCaptureModal(id = null) {
    editingId = id;
    const c = id ? captures.find(x => x.id === id) : null;

    const body = `
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code capture *</label>
          <input id="f-code" type="text" value="${c?.code || `CAP-2024-00${captures.length+1}`}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Site</label>
          <input id="f-site" type="text" value="${c?.site || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
          <input id="f-date" type="date" value="${c?.date || new Date().toISOString().split('T')[0]}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Technicien</label>
          <input id="f-tech" type="text" value="${c?.technicien || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce</label>
          <select id="f-espece" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${['An. gambiae','An. funestus','An. arabiensis','Culex sp.'].map(e=>`<option ${c?.espece===e?'selected':''}>${e}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantité</label>
          <input id="f-qty" type="number" min="0" value="${c?.quantite || 0}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${['En attente','Analysé','Rejeté'].map(s=>`<option ${c?.statut===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>`;

    openModal(id ? `Modifier ${c.code}` : 'Nouvelle capture', body, {
      confirmLabel: id ? 'Enregistrer' : 'Ajouter',
      onConfirm: async () => {
        const code = document.getElementById('f-code')?.value.trim();
        if (!code) return;
        const data = {
          code,
          site_nom:   document.getElementById('f-site')?.value.trim(),
          date_capture: document.getElementById('f-date')?.value,
          technicien: document.getElementById('f-tech')?.value.trim(),
          espece_identifiee: document.getElementById('f-espece')?.value,
          quantite: parseInt(document.getElementById('f-qty')?.value || 0),
          statut:   STATUT_API[document.getElementById('f-statut')?.value] || 'en_attente',
        };

        showLoader();
        if (editingId) {
          let updated = null;
          if (typeof apiCaptures !== 'undefined') {
            updated = await apiCaptures.update(editingId, data);
          }
          const displayData = {
            ...data,
            id: editingId,
            statut: STATUT_LABEL[data.statut] || document.getElementById('f-statut')?.value,
            date: data.date_capture,
            espece: data.espece_identifiee,
            site: data.site_nom,
          };
          const idx = captures.findIndex(x => x.id === editingId);
          if (idx >= 0) captures[idx] = displayData;
          pushNotification(`Capture "${code}" mise à jour.`, 'success');
        } else {
          let created = null;
          if (typeof apiCaptures !== 'undefined') {
            created = await apiCaptures.create(data);
          }
          const displayData = {
            ...data,
            id: created?.id || Date.now(),
            statut: STATUT_LABEL[data.statut] || 'En attente',
            date: data.date_capture,
            espece: data.espece_identifiee,
            site: data.site_nom,
          };
          captures.unshift(displayData);
          pushNotification(`Capture "${code}" ajoutée.`, 'success');
        }
        hideLoader();
        applyFilters();
      },
    });
  }

  // Bouton ajouter
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Nouvelle capture') || btn.textContent.includes('Ajouter') || btn.textContent.includes('Enregistrer')) {
      if (btn.closest('header') || btn.parentElement?.classList.contains('flex-wrap')) {
        btn.addEventListener('click', () => openCaptureModal());
      }
    }
  });

  // Recherche
  const searchInput = document.querySelector('input[type="text"], input[placeholder]');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  let filterStatut = 'Tous';
  document.querySelectorAll('.flex.flex-wrap button').forEach(btn => {
    if (btn.textContent.includes('Statut')) {
      btn.addEventListener('click', () => {
        showFilterDD(btn, ['Tous','Analysé','En attente','Rejeté'], val => {
          filterStatut = val;
          if (btn.querySelector('p')) btn.querySelector('p').textContent = `Statut: ${val}`;
          applyFilters();
        });
      });
    }
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
    const filtered = captures.filter(c => {
      const matchQ = !q || `${c.code} ${c.site} ${c.technicien} ${c.espece}`.toLowerCase().includes(q);
      const matchS = filterStatut === 'Tous' || c.statut === filterStatut;
      return matchQ && matchS;
    });
    renderTable(filtered);
  }

  initTableSort('table');
  loadCaptures();

});
