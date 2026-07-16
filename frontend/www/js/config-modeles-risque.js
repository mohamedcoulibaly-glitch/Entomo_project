document.addEventListener('DOMContentLoaded', async () => {
  await loadRiskFactors();

  let dragging = null;
  document.querySelectorAll('[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', () => {
      dragging = item;
      item.classList.add('opacity-50', 'scale-95');
    });
    item.addEventListener('dragend', () => {
      dragging = null;
      item.classList.remove('opacity-50', 'scale-95');
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      item.classList.add('ring-2', 'ring-brand-primary/50', 'bg-brand-primary/5');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('ring-2', 'ring-brand-primary/50', 'bg-brand-primary/5');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('ring-2', 'ring-brand-primary/50', 'bg-brand-primary/5');
      if (dragging && dragging !== item) {
        dragging.parentElement.insertBefore(dragging, item);
        saveFactorOrder();
      }
    });
  });

  document.querySelectorAll('input[type="range"]').forEach(range => {
    let output = range.parentElement.querySelector('.range-val');
    if (!output) {
      output = document.createElement('span');
      output.className = 'range-val ml-2 text-sm font-bold text-brand-primary min-w-[3rem] inline-block';
      range.parentElement.appendChild(output);
    }
    output.textContent = `${range.value}%`;
    range.addEventListener('input', () => {
      output.textContent = `${range.value}%`;
      checkTotalWeights();
    });
  });

  function checkTotalWeights() {
    const sliders = document.querySelectorAll('input[type="range"]');
    const total = Array.from(sliders).reduce((s, r) => s + parseInt(r.value), 0);
    const warningEl = document.querySelector('[data-weight-warning]');
    if (warningEl) {
      warningEl.textContent = `Total : ${total}%${total !== 100 ? ' ⚠ Doit être égal à 100%' : ' ✓'}`;
      warningEl.className = total === 100 ? 'text-green-600 text-xs font-medium' : 'text-yellow-600 text-xs font-medium';
    }
  }

  async function saveFactorOrder() {
    const items = document.querySelectorAll('[draggable="true"]');
    const order = Array.from(items).map((item, idx) => ({ id: item.dataset.id, ordre: idx + 1 }));
    try {
      const RiskFactor = { update: (data) => apiRequest('PUT', '/indicateurs/reorder', data) };
      await RiskFactor.update({ order });
    } catch (err) { /* silencieux */ }
  }

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Sauvegarder') || t.includes('Appliquer') || t.includes('Enregistrer')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        const factors = [];
        document.querySelectorAll('[draggable="true"]').forEach(item => {
          const id = item.dataset.id;
          const weight = item.querySelector('input[type="range"]')?.value || 0;
          const seuil = item.querySelector('input[type="number"]')?.value || 0;
          factors.push({ id, poids: parseInt(weight), seuil_alerte: parseFloat(seuil) });
        });
        try {
          const res = await apiRequest('POST', '/indicateurs/config', { facteurs: factors });
          if (res) pushNotification('Configuration des modèles de risque sauvegardée.', 'success');
        } catch (err) { pushNotification('Erreur lors de la sauvegarde.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Ajouter facteur') || t.includes('Nouveau facteur')) {
      btn.addEventListener('click', () => {
        openModal('Ajouter un facteur de risque',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du facteur *</label>
              <input id="rf-nom" type="text" placeholder="ex: Précipitations mensuelles"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Source des données</label>
              <select id="rf-source" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Captures entomologiques</option>
                <option>Données météo</option>
                <option>Données géographiques</option>
                <option>DHIS2</option>
                <option>Externe</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pondération initiale (%)</label>
              <input id="rf-poids" type="number" min="0" max="100" value="10"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Seuil d'alerte</label>
              <input id="rf-seuil" type="number" step="0.1" placeholder="ex: 0.7"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
          </div>`,
          {
            confirmLabel: 'Ajouter',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              const nom = document.getElementById('rf-nom')?.value.trim();
              if (!nom) { pushNotification('Nom requis.', 'warning'); return; }
              try {
                const res = await apiRequest('POST', '/indicateurs/', {
                  nom,
                  description: `Source: ${document.getElementById('rf-source')?.value || ''}`,
                  formule: `poids_${document.getElementById('rf-poids')?.value || '10'}`,
                  unite: 'indice',
                  seuil_bas: parseFloat(document.getElementById('rf-seuil')?.value || '0.7'),
                  seuil_moyen: 50,
                  seuil_eleve: 90,
                });
                if (res) {
                  pushNotification('Facteur de risque ajouté.', 'success');
                  await loadRiskFactors();
                }
              } catch (err) { pushNotification('Erreur lors de l\'ajout.', 'error'); }
            },
          }
        );
      });
    }

    if (t.includes('Simuler') || t.includes('Tester le modèle') || t.includes('Prédiction')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const factors = [];
          document.querySelectorAll('[draggable="true"]').forEach(item => {
            const id = item.dataset.id;
            const weight = item.querySelector('input[type="range"]')?.value || 0;
            factors.push({ id, poids: parseInt(weight) });
          });
          const res = await apiModels.simulerRisque({ facteurs: factors });
          if (res) {
            openModal('Résultats de simulation',
              `<div class="space-y-3 text-sm">
                <p class="font-medium text-gray-700 dark:text-gray-300">Scénario : ${res.scenario || 'Simulation standard'}</p>
                <div class="${res.risque_global >= 0.7 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : res.risque_global >= 0.4 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'} rounded-lg p-3 border">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-bold ${res.risque_global >= 0.7 ? 'text-red-700 dark:text-red-300' : res.risque_global >= 0.4 ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}">Indice de risque global</span>
                    <span class="text-2xl font-black ${res.risque_global >= 0.7 ? 'text-red-600' : res.risque_global >= 0.4 ? 'text-yellow-600' : 'text-green-600'}">${res.risque_global?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <p class="text-xs ${res.risque_global >= 0.7 ? 'text-red-600' : res.risque_global >= 0.4 ? 'text-yellow-600' : 'text-green-600'}">${res.message || ''}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <p class="text-xs text-gray-500">Régions à haut risque</p>
                    <p class="font-bold text-lg">${res.regions_risque_eleve || res.regions_haut_risque || 'N/A'}</p>
                  </div>
                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <p class="text-xs text-gray-500">Population exposée</p>
                    <p class="font-bold text-lg">${res.population_exposee ? '~' + res.population_exposee.toLocaleString('fr-FR') : 'N/A'}</p>
                  </div>
                </div>
              </div>`,
              { confirmLabel: 'Exporter rapport', cancelLabel: 'Fermer',
                confirmClass: 'bg-brand-primary text-white',
                onConfirm: () => pushNotification('Rapport de simulation exporté.', 'success') }
            );
          }
        } catch (err) { pushNotification('Erreur lors de la simulation.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Réinitialiser') || t.includes('Par défaut')) {
      btn.addEventListener('click', () => {
        confirmDelete('la configuration des modèles de risque', async () => {
          try {
            const res = await apiRequest('POST', '/indicateurs/reinitialiser');
            document.querySelectorAll('input[type="range"]').forEach(r => {
              r.value = r.defaultValue || '10';
              r.dispatchEvent(new Event('input'));
            });
            pushNotification('Configuration réinitialisée.', 'warning');
          } catch (err) { pushNotification('Erreur lors de la réinitialisation.', 'error'); }
        });
      });
    }
  });

  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      if (!isNaN(min) && !isNaN(max) && (val < min || val > max)) {
        input.classList.add('ring-2', 'ring-red-400', 'border-red-400');
      } else {
        input.classList.remove('ring-2', 'ring-red-400', 'border-red-400');
      }
    });
  });

  async function loadRiskFactors() {
    showLoader();
    try {
      const models = await apiRequest('GET', '/indicateurs/');
      hideLoader();
      if (!models || !models.length) return;
      const container = document.querySelector('[data-factors-container]');
      if (container) {
        container.innerHTML = models.map((m, idx) => {
          const poids = m.formule ? parseInt(m.formule.replace('poids_', '')) : 10;
          const seuil = m.seuil_bas || 0.7;
          const source = m.description ? m.description.replace('Source: ', '') : 'N/A';
          return `<div draggable="true" data-id="${m.id}" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow">
            <span class="material-symbols-outlined text-gray-400 text-base">drag_indicator</span>
            <div class="flex-1">
              <p class="font-medium text-sm text-[#111418] dark:text-white">${m.nom || 'Facteur'}</p>
              <p class="text-xs text-gray-500">Source: ${source} • Seuil: ${seuil}</p>
            </div>
            <input type="range" min="0" max="100" value="${poids}" class="w-24 h-1.5 rounded-full accent-brand-primary"/>
            <span class="range-val text-sm font-bold text-brand-primary min-w-[3rem] inline-block">${poids}%</span>
          </div>`;
        }).join('');
      }
      document.querySelectorAll('input[type="range"]').forEach(range => {
        let output = range.parentElement.querySelector('.range-val');
        if (!output) {
          output = document.createElement('span');
          output.className = 'range-val ml-2 text-sm font-bold text-brand-primary min-w-[3rem] inline-block';
          range.parentElement.appendChild(output);
        }
        output.textContent = `${range.value}%`;
        range.addEventListener('input', () => {
          output.textContent = `${range.value}%`;
          checkTotalWeights();
        });
      });
      checkTotalWeights();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des facteurs.', 'error');
    }
  }

  async function loadRiskModels() {
    showLoader();
    try {
      const models = await apiModels.listRisque();
      hideLoader();
      const container = document.querySelector('[data-risk-models-container]');
      if (!container) return;
      if (!models || !models.length) {
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucun modèle de risque configuré.</p>';
        return;
      }
      container.innerHTML = models.map(m => {
        const algoColors = {
          'XGBoost': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          'LightGBM': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          'Random Forest': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
          'Réseau de neurones': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        };
        const algoClass = algoColors[m.algorithme] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        const statusBadge = m.actif
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Actif</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Inactif</span>';
        const deployBadge = m.deploye
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Déployé</span>'
          : '';
        return `<div data-risk-model-id="${m.id}" class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="font-semibold text-sm text-[#111418] dark:text-white truncate">${m.nom || 'Modèle sans nom'}</h3>
                ${statusBadge}
                ${deployBadge}
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">v${m.version || '1.0.0'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${algoClass}">${m.algorithme || 'N/A'}</span>
          </div>
          ${m.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">${m.description}</p>` : ''}
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">Précision</p>
              <p class="font-bold text-sm ${m.precision >= 0.8 ? 'text-green-600 dark:text-green-400' : m.precision >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">${m.precision != null ? (m.precision * 100).toFixed(1) + '%' : 'N/A'}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">F1 Score</p>
              <p class="font-bold text-sm ${m.f1_score >= 0.8 ? 'text-green-600 dark:text-green-400' : m.f1_score >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">${m.f1_score != null ? (m.f1_score * 100).toFixed(1) + '%' : 'N/A'}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button data-action="edit-model" data-model='${JSON.stringify(m).replace(/'/g, "&#39;")}' class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <span class="material-symbols-outlined text-sm">edit</span> Modifier
            </button>
            <button data-action="simulate-model" data-model-id="${m.id}" data-model-name="${m.nom || ''}" class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-primary/30 text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors">
              <span class="material-symbols-outlined text-sm">science</span> Simuler
            </button>
            <button data-action="delete-model" data-model-id="${m.id}" data-model-name="${m.nom || ''}" class="inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des modèles de risque.', 'error');
    }
  }

  document.querySelector('[data-risk-models-container]')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'edit-model') {
      try {
        const model = JSON.parse(btn.dataset.model);
        openModal('Modifier le modèle de risque',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom *</label>
              <input id="rm-nom" type="text" value="${(model.nom || '').replace(/"/g, '&quot;')}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Version</label>
              <input id="rm-version" type="text" value="${(model.version || '1.0.0').replace(/"/g, '&quot;')}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Algorithme</label>
              <select id="rm-algorithme" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                ${['XGBoost','LightGBM','Random Forest','Réseau de neurones','Autre'].map(a => `<option ${model.algorithme === a ? 'selected' : ''}>${a}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea id="rm-description" rows="3" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">${(model.description || '').replace(/</g, '&lt;')}</textarea>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="rm-actif" type="checkbox" ${model.actif ? 'checked' : ''} class="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"/>
                <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Actif</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input id="rm-deploye" type="checkbox" ${model.deploye ? 'checked' : ''} class="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"/>
                <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Déployé</span>
              </label>
            </div>
          </div>`,
          {
            confirmLabel: 'Enregistrer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              const nom = document.getElementById('rm-nom')?.value.trim();
              if (!nom) { pushNotification('Nom requis.', 'warning'); return; }
              try {
                const data = {
                  nom,
                  version: document.getElementById('rm-version')?.value.trim() || '1.0.0',
                  algorithme: document.getElementById('rm-algorithme')?.value,
                  description: document.getElementById('rm-description')?.value.trim(),
                  actif: document.getElementById('rm-actif')?.checked ?? false,
                  deploye: document.getElementById('rm-deploye')?.checked ?? false,
                };
                const res = await apiModels.updateRisque(model.id, data);
                if (res) {
                  pushNotification('Modèle de risque mis à jour.', 'success');
                  await loadRiskModels();
                }
              } catch (err) { pushNotification('Erreur lors de la mise à jour.', 'error'); }
            },
          }
        );
      } catch (err) { pushNotification('Erreur lors du chargement du modèle.', 'error'); }
    }

    if (action === 'simulate-model') {
      const modelId = btn.dataset.modelId;
      const modelName = btn.dataset.modelName;
      openModal(`Simuler : ${modelName}`,
        `<div class="space-y-3 text-sm">
          <p class="text-gray-600 dark:text-gray-400">Configurez les facteurs d'entrée pour la simulation.</p>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Facteurs (séparés par des virgules)</label>
            <input id="sim-facteurs" type="text" placeholder="ex: precipitation, temperature, humidite"
              class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Paramètres (JSON optionnel)</label>
            <textarea id="sim-parametres" rows="2" placeholder='{"seuil": 0.7}'
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"></textarea>
          </div>
        </div>`,
        {
          confirmLabel: 'Lancer la simulation',
          confirmClass: 'bg-brand-primary text-white',
          onConfirm: async () => {
            try {
              const facteursRaw = document.getElementById('sim-facteurs')?.value.trim();
              const facteurs = facteursRaw ? facteursRaw.split(',').map(f => f.trim()).filter(Boolean) : [];
              let parametres = {};
              const paramRaw = document.getElementById('sim-parametres')?.value.trim();
              if (paramRaw) {
                try { parametres = JSON.parse(paramRaw); }
                catch { pushNotification('Paramètres JSON invalides.', 'warning'); return; }
              }
              const res = await apiModels.simulerRisque({ model_id: modelId, facteurs, parametres });
              if (res) {
                openModal('Résultats de simulation',
                  `<div class="space-y-3 text-sm">
                    <p class="font-medium text-gray-700 dark:text-gray-300">Modèle : ${modelName}</p>
                    <div class="${res.risque_global >= 0.7 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : res.risque_global >= 0.4 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'} rounded-lg p-3 border">
                      <div class="flex justify-between items-center mb-2">
                        <span class="font-bold ${res.risque_global >= 0.7 ? 'text-red-700 dark:text-red-300' : res.risque_global >= 0.4 ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}">Indice de risque global</span>
                        <span class="text-2xl font-black ${res.risque_global >= 0.7 ? 'text-red-600' : res.risque_global >= 0.4 ? 'text-yellow-600' : 'text-green-600'}">${res.risque_global?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <p class="text-xs ${res.risque_global >= 0.7 ? 'text-red-600' : res.risque_global >= 0.4 ? 'text-yellow-600' : 'text-green-600'}">${res.message || ''}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                        <p class="text-xs text-gray-500">Régions à haut risque</p>
                        <p class="font-bold text-lg">${res.regions_risque_eleve || res.regions_haut_risque || 'N/A'}</p>
                      </div>
                      <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                        <p class="text-xs text-gray-500">Population exposée</p>
                        <p class="font-bold text-lg">${res.population_exposee ? '~' + res.population_exposee.toLocaleString('fr-FR') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>`,
                  { confirmLabel: 'Fermer', cancelLabel: 'Exporter',
                    confirmClass: 'bg-brand-primary text-white',
                    onConfirm: () => pushNotification('Rapport de simulation exporté.', 'success') }
                );
              }
            } catch (err) { pushNotification('Erreur lors de la simulation.', 'error'); }
          },
        }
      );
    }

    if (action === 'delete-model') {
      const modelId = btn.dataset.modelId;
      const modelName = btn.dataset.modelName;
      confirmDelete(`le modèle de risque "${modelName}"`, async () => {
        try {
          await apiModels.updateRisque(modelId, { actif: false });
          pushNotification(`Modèle "${modelName}" supprimé.`, 'success');
          await loadRiskModels();
        } catch (err) { pushNotification('Erreur lors de la suppression.', 'error'); }
      });
    }
  });

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();
    if (t.includes('Nouveau Modèle de Risque') || t.includes('Ajouter un modèle de risque')) {
      btn.addEventListener('click', () => {
        openModal('Nouveau Modèle de Risque',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du modèle *</label>
              <input id="rm-new-nom" type="text" placeholder="ex: Prédiction Dengue v2"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Version</label>
              <input id="rm-new-version" type="text" value="1.0.0"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Algorithme</label>
              <select id="rm-new-algorithme" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>XGBoost</option>
                <option>LightGBM</option>
                <option>Random Forest</option>
                <option>Réseau de neurones</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea id="rm-new-description" rows="3" placeholder="Description du modèle..."
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Créer le modèle',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              const nom = document.getElementById('rm-new-nom')?.value.trim();
              if (!nom) { pushNotification('Nom requis.', 'warning'); return; }
              try {
                const data = {
                  nom,
                  version: document.getElementById('rm-new-version')?.value.trim() || '1.0.0',
                  algorithme: document.getElementById('rm-new-algorithme')?.value,
                  description: document.getElementById('rm-new-description')?.value.trim(),
                  actif: true,
                  deploye: false,
                };
                const res = await apiModels.createRisque(data);
                if (res) {
                  pushNotification('Modèle de risque créé.', 'success');
                  await loadRiskModels();
                }
              } catch (err) { pushNotification('Erreur lors de la création.', 'error'); }
            },
          }
        );
      });
    }
  });

  await loadRiskModels();
});
