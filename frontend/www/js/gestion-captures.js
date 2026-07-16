document.addEventListener('DOMContentLoaded', async () => {
  let captures = [];

  const STATUT_LABEL = {
    'a_valider': 'À valider',
    'valide': 'Validé',
    'validee': 'Validé',
    'corrige': 'Corrigé',
    'rejete': 'Rejeté',
    'en_attente': 'À valider',
    'analyse': 'Analysé',
  };

  const STATUT_COLORS = {
    'À valider': 'bg-[#FFC107]/20 text-[#D98A00]',
    'Validé': 'bg-[#4CAF50]/20 text-[#2E7D32]',
    'Corrigé': 'bg-[#D32F2F]/20 text-[#B71C1C]',
    'Rejeté': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
    'Analysé': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  };

  function norm(c) {
    const statut = STATUT_LABEL[c.statut] || c.statut || 'À valider';
    return {
      ...c,
      id_specimen: c.id_specimen || c.id || 0,
      code: c.code || c.id_specimen_code || `SPN-${String(c.id || 0).padStart(5, '0')}`,
      specimen_image: c.specimen_image || c.image_url || c.photo_url || '',
      identification_ia: c.identification_ia || c.espece_identifiee || c.espece || 'Non identifié',
      confiance: c.confiance || c.confidence || 0,
      confiance_pct: c.confiance ? `${Math.round(c.confiance * 100)}%` : c.confidence_pct || '0%',
      statut,
      sexe: c.sexe || '',
      site: c.site?.nom || c.site_nom || c.site || '',
      date_capture: c.date_capture || c.date || '',
      technicien: c.technicien || c.utilisateur?.nom_complet || '',
      espece: c.espece_identifiee || c.espece || c.identification_ia || '',
      localisation: c.localisation || c.region || '',
      notes: c.notes || '',
    };
  }

  async function loadCaptures() {
    try {
      showLoader();
      const data = await apiCaptures.list({ limit: 200 });
      if (data) captures = data.map(norm);
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des captures', 'error');
    }
    renderTable(captures);
  }

  function renderTable(data) {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">search_off</span>Aucun spécimen trouvé</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr class="border-t border-t-[#dbe0e6] dark:border-t-white/10 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer" data-id="${c.id}">
        <td class="h-[72px] px-4 py-2 w-16">
          <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-md w-10 h-10"
               style="${c.specimen_image ? `background-image: url('${c.specimen_image}')` : 'background-color: #e5e7eb; display:flex; align-items:center; justify-content:center;'}">
            ${!c.specimen_image ? '<span class="material-symbols-outlined text-gray-400 text-lg">bug_report</span>' : ''}
          </div>
        </td>
        <td class="h-[72px] px-4 py-2 text-[#617589] dark:text-white/60 text-sm font-mono leading-normal">${c.code}</td>
        <td class="h-[72px] px-4 py-2 text-[#111418] dark:text-white text-sm font-medium leading-normal">${c.identification_ia}${c.sexe ? ', ' + c.sexe : ''}</td>
        <td class="h-[72px] px-4 py-2 w-24 text-[#617589] dark:text-white/60 text-sm font-normal leading-normal">${c.confiance_pct}</td>
        <td class="h-[72px] px-4 py-2 w-32">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[c.statut] || 'bg-gray-100 text-gray-700'}">${c.statut}</span>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = parseInt(row.dataset.id);
        const c = captures.find(x => x.id === id);
        if (c) openValidationModal(c);
      });
    });
  }

  async function openValidationModal(c) {
    const especes = await loadReferenceData('especes');
    const body = `
      <div class="space-y-4">
        <div class="flex items-start gap-4">
          <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-20 h-20 flex-shrink-0"
               style="${c.specimen_image ? `background-image: url('${c.specimen_image}')` : 'background-color: #e5e7eb; display:flex; align-items:center; justify-content:center;'}">
            ${!c.specimen_image ? '<span class="material-symbols-outlined text-gray-400 text-3xl">bug_report</span>' : ''}
          </div>
          <div class="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div><span class="text-gray-500">ID:</span> <strong class="font-mono">${c.code}</strong></div>
            <div><span class="text-gray-500">Confiance:</span> <strong>${c.confiance_pct}</strong></div>
            <div><span class="text-gray-500">Identification IA:</span> <strong>${c.identification_ia}${c.sexe ? ' (' + c.sexe + ')' : ''}</strong></div>
            <div><span class="text-gray-500">Statut:</span> <strong>${c.statut}</strong></div>
            ${c.site ? `<div class="col-span-2"><span class="text-gray-500">Site:</span> <strong>${c.site}</strong></div>` : ''}
            ${c.date_capture ? `<div class="col-span-2"><span class="text-gray-500">Date:</span> <strong>${new Date(c.date_capture).toLocaleDateString('fr-FR')}</strong></div>` : ''}
          </div>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Action de validation</label>
          <div class="flex gap-2 mb-3">
            <button id="val-action-valider" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">Valider</button>
            <button id="val-action-corriger" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Corriger</button>
            <button id="val-action-rejeter" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">Rejeter</button>
          </div>
          <div id="val-correction-section" class="hidden">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce corrigée</label>
            <select id="f-espece-corrigee" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 mb-2">
              ${especes.map(e => `<option ${c.espece === e.label ? 'selected' : ''}>${e.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commentaire</label>
            <textarea id="f-commentaire" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-16 resize-none" placeholder="Notes optionnelles...">${c.notes || ''}</textarea>
          </div>
          <p id="val-error" class="text-red-500 text-xs hidden mt-1"></p>
        </div>
      </div>`;

    openModal(`Validation — ${c.code}`, body, {
      confirmLabel: 'Soumettre',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const actionEl = document.querySelector('#val-action-valider.bg-green-200, #val-action-corriger.bg-yellow-200, #val-action-rejeter.bg-red-200');
        let action = 'valider';
        if (actionEl) {
          if (actionEl.id === 'val-action-corriger') action = 'corriger';
          else if (actionEl.id === 'val-action-rejeter') action = 'rejeter';
        }
        const commentaire = document.getElementById('f-commentaire')?.value.trim() || '';
        const especeCorrigee = document.getElementById('f-espece-corrigee')?.value || '';

        const validationData = {
          action,
          commentaire,
          espece_corrigee: action === 'corriger' ? especeCorrigee : undefined,
        };

        try {
          showLoader();
          const res = await apiCaptures.valider(c.id, validationData);
          if (res !== null) {
            await loadCaptures();
            pushNotification(`Spécimen ${c.code} ${action === 'valider' ? 'validé' : action === 'corriger' ? 'corrigé' : 'rejeté'} avec succès.`, 'success');
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification("Erreur lors de la validation", 'error');
        }
      },
    });

    setTimeout(() => {
      const validerBtn = document.getElementById('val-action-valider');
      const corrigerBtn = document.getElementById('val-action-corriger');
      const rejeterBtn = document.getElementById('val-action-rejeter');
      const correctionSection = document.getElementById('val-correction-section');
      const errorEl = document.getElementById('val-error');

      function setAction(btn) {
        [validerBtn, corrigerBtn, rejeterBtn].forEach(b => {
          if (b) {
            b.classList.remove('bg-green-200', 'bg-yellow-200', 'bg-red-200', 'ring-2', 'ring-offset-1');
            if (b.id === 'val-action-valider') b.classList.add('bg-green-100');
            else if (b.id === 'val-action-corriger') b.classList.add('bg-yellow-100');
            else if (b.id === 'val-action-rejeter') b.classList.add('bg-red-100');
          }
        });
        if (btn) {
          btn.classList.remove('bg-green-100', 'bg-yellow-100', 'bg-red-100');
          btn.classList.add('ring-2', 'ring-offset-1');
          if (btn.id === 'val-action-valider') btn.classList.add('bg-green-200');
          else if (btn.id === 'val-action-corriger') btn.classList.add('bg-yellow-200');
          else if (btn.id === 'val-action-rejeter') btn.classList.add('bg-red-200');
        }
        if (correctionSection) {
          correctionSection.classList.toggle('hidden', !btn || btn.id !== 'val-action-corriger');
        }
      }

      if (validerBtn) validerBtn.addEventListener('click', () => setAction(validerBtn));
      if (corrigerBtn) corrigerBtn.addEventListener('click', () => setAction(corrigerBtn));
      if (rejeterBtn) rejeterBtn.addEventListener('click', () => setAction(rejeterBtn));
    }, 50);
  }

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Valider en masse')) {
      btn.addEventListener('click', async () => {
        try {
          const data = await apiCaptures.aValider();
          if (data && data.length) {
            for (const c of data) {
              await apiCaptures.valider(c.id, { action: 'valider' });
            }
            await loadCaptures();
            pushNotification(`${data.length} spécimen(s) validé(s) en masse.`, 'success');
          } else {
            pushNotification('Aucun spécimen à valider.', 'info');
          }
        } catch (err) {
          pushNotification('Erreur lors de la validation en masse', 'error');
        }
      });
    }
  });

  async function openCreateCaptureModal() {
    showLoader();
    let sitesOptions = '<option value="">Sélectionner un site</option>';
    try {
      const sitesList = await apiSites.list({ limit: 200 });
      if (sitesList && sitesList.length) {
        sitesOptions = '<option value="">Sélectionner un site</option>' +
          sitesList.map(s => `<option value="${s.id}">${s.nom} (${s.region || ''})</option>`).join('');
      }
    } catch(e) {}
    hideLoader();

    const today = new Date().toISOString().split('T')[0];
    const body = `
      <div class="grid grid-cols-1 gap-4 text-sm">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Site sentinelle *</label>
          <select id="nc-site" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
            ${sitesOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date de capture *</label>
          <input id="nc-date" type="date" value="${today}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce *</label>
            <input id="nc-espece" type="text" placeholder="ex: An. gambiae" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nb. individus *</label>
            <input id="nc-nb" type="number" min="1" value="1" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Méthode de capture</label>
          <select id="nc-methode" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
            <option value="CDC Light Trap">CDC Light Trap</option>
            <option value="BG-Sentinel">BG-Sentinel</option>
            <option value="Filet à moustiques">Filet à moustiques</option>
            <option value="Aspirateur à bouche">Aspirateur à bouche</option>
            <option value="PSC">PSC (Pulvérisation intra-domiciliaire)</option>
            <option value="Pièges lumineux">Pièges lumineux</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
          <textarea id="nc-notes" rows="2" placeholder="Observations complémentaires..." class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 resize-none"></textarea>
        </div>
        <p id="nc-error" class="text-red-500 text-xs hidden">Veuillez remplir tous les champs obligatoires.</p>
      </div>`;

    openModal('Nouvelle Capture', body, {
      confirmLabel: 'Enregistrer',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const siteId = parseInt(document.getElementById('nc-site')?.value);
        const dateCapture = document.getElementById('nc-date')?.value;
        const espece = document.getElementById('nc-espece')?.value.trim();
        const nb = parseInt(document.getElementById('nc-nb')?.value) || 1;
        if (!siteId || !dateCapture || !espece) {
          document.getElementById('nc-error')?.classList.remove('hidden');
          return;
        }
        const data = {
          site_id: siteId,
          date_capture: dateCapture,
          espece,
          nombre_individus: nb,
          methode_capture: document.getElementById('nc-methode')?.value || 'CDC Light Trap',
          notes: document.getElementById('nc-notes')?.value.trim() || '',
          statut: 'a_valider',
        };
        try {
          showLoader();
          const res = await apiCaptures.create(data);
          if (res) {
            await loadCaptures();
            pushNotification('Capture enregistrée avec succès.', 'success');
          }
          hideLoader();
        } catch(err) {
          hideLoader();
          pushNotification('Erreur lors de la création de la capture.', 'error');
        }
      },
    });
  }

  const dateFilter = document.getElementById('date-filter');
  const statusFilter = document.getElementById('status-filter');
  const speciesFilter = document.getElementById('species-filter');
  const locationFilter = document.getElementById('location-filter');

  function applyFilters() {
    const dateVal = dateFilter?.value || '';
    const statusVal = statusFilter?.value || 'Tous';
    const speciesVal = speciesFilter?.value || 'Toutes';
    const locationVal = locationFilter?.value || 'Toutes';

    const filtered = captures.filter(c => {
      const matchDate = !dateVal || (c.date_capture && c.date_capture.startsWith(dateVal)) || (c.date && c.date.startsWith(dateVal));
      const statutValMap = { 'À valider': ['À valider', 'a_valider'], 'Validé': ['Validé', 'valide', 'validee'], 'Corrigé': ['Corrigé', 'corrige'], 'Rejeté': ['Rejeté', 'rejete'] };
      const matchStatus = statusVal === 'Tous' || (statutValMap[statusVal] || [statusVal]).includes(c.statut);
      const matchSpecies = speciesVal === 'Toutes' || c.espece === speciesVal || c.identification_ia === speciesVal || c.identification_ia.startsWith(speciesVal);
      const matchLocation = locationVal === 'Toutes' || c.localisation === locationVal || c.site === locationVal || c.region === locationVal;
      return matchDate && matchStatus && matchSpecies && matchLocation;
    });
    renderTable(filtered);
  }

  [dateFilter, statusFilter, speciesFilter, locationFilter].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });

  const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  await loadCaptures();

  // Attacher le bouton Nouvelle Capture (par ID en priorité)
  const btnNouvCapture = document.getElementById('btn-nouvelle-capture');
  if (btnNouvCapture) {
    btnNouvCapture.addEventListener('click', () => openCreateCaptureModal());
  } else {
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim().includes('Nouvelle Capture') && !btn.dataset.attached) {
        btn.dataset.attached = '1';
        btn.addEventListener('click', () => openCreateCaptureModal());
      }
    });
  }

  // Bouton Valider en masse
  const btnValiderMasse = document.getElementById('btn-valider-masse');
  if (btnValiderMasse) {
    btnValiderMasse.addEventListener('click', async () => {
      try {
        const data = await apiCaptures.aValider();
        if (data && data.length) {
          buttonLoading(btnValiderMasse, true);
          for (const c of data) {
            await apiCaptures.valider(c.id, { action: 'valider' });
          }
          await loadCaptures();
          pushNotification(`${data.length} spécimen(s) validé(s) en masse.`, 'success');
          buttonLoading(btnValiderMasse, false);
        } else {
          pushNotification('Aucun spécimen à valider.', 'info');
        }
      } catch (err) {
        pushNotification('Erreur lors de la validation en masse', 'error');
      }
    });
  }
});
