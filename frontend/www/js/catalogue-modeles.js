document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-model-container]');
  const searchInput = document.querySelector('input[placeholder*="Rechercher"]');
  const state = { models: [], query: '', status: 'tous', type: 'tous' };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);

  const modelStatus = model => !model.actif ? 'archive' : model.deploye ? 'deploye' : 'en_test';
  const statusLabel = status => ({ deploye: 'Déployé', archive: 'Archivé', en_test: 'En test' })[status] || status;
  const statusClasses = status => ({
    deploye: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    archive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    en_test: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  })[status];

  function visibleModels() {
    return state.models.filter(model => {
      const haystack = `${model.nom || ''} ${model.type_modele || ''} ${model.architecture || ''}`.toLowerCase();
      return (!state.query || haystack.includes(state.query))
        && (state.status === 'tous' || modelStatus(model) === state.status)
        && (state.type === 'tous' || model.type_modele === state.type);
    });
  }

  function updateStats() {
    const set = (name, value) => { const el = document.querySelector(`[data-stat="${name}"]`); if (el) el.textContent = value; };
    set('total_models', state.models.length);
    set('deployed_models', state.models.filter(model => model.deploye && model.actif).length);
    set('testing_models', state.models.filter(model => model.actif && !model.deploye).length);
    set('archived_models', state.models.filter(model => !model.actif).length);
  }

  function render() {
    if (!container) return;
    const models = visibleModels();
    if (!models.length) {
      container.innerHTML = `<div class="col-span-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center text-gray-500">
        <span class="material-symbols-outlined text-4xl mb-2">model_training</span>
        <p class="font-medium">Aucun modèle ne correspond à ces critères</p>
        <p class="text-xs mt-1">Ajoutez un modèle ou modifiez les filtres.</p>
      </div>`;
      return;
    }
    container.innerHTML = models.map(model => {
      const status = modelStatus(model);
      const icon = model.type_modele === 'audio' ? 'graphic_eq' : model.type_modele === 'detection' ? 'center_focus_strong' : 'image_search';
      return `<article class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-lg transition-shadow" data-model-id="${model.id}">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-11 shrink-0 rounded-xl bg-brand-primary/10 flex items-center justify-center"><span class="material-symbols-outlined text-brand-primary">${icon}</span></div>
            <div class="min-w-0"><h3 class="font-bold text-[#111418] dark:text-white truncate">${escapeHtml(model.nom)}</h3><p class="text-xs text-gray-500">v${escapeHtml(model.version || '1.0.0')} · ${escapeHtml(model.architecture || model.type_modele || 'ML')}</p></div>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(status)}">${statusLabel(status)}</span>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-10">${escapeHtml(model.description || 'Aucune description')}</p>
        <div class="grid grid-cols-3 gap-2 my-4 text-center text-xs">
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700/60 p-2"><strong class="block text-sm text-gray-900 dark:text-white">${model.precision != null ? `${(model.precision * 100).toFixed(1)}%` : '—'}</strong>Précision</div>
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700/60 p-2"><strong class="block text-sm text-gray-900 dark:text-white">${model.f1_score != null ? model.f1_score.toFixed(2) : '—'}</strong>F1</div>
          <div class="rounded-lg bg-gray-50 dark:bg-gray-700/60 p-2"><strong class="block text-sm text-gray-900 dark:text-white">${model.taille_mb != null ? `${model.taille_mb} MB` : '—'}</strong>Taille</div>
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          <button data-action="details" class="text-sm font-medium text-brand-primary hover:underline">Voir les détails</button>
          <div class="flex gap-2">
            <button data-action="test" title="Tester" class="size-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center"><span class="material-symbols-outlined text-lg">science</span></button>
            <button data-action="deploy" title="${model.deploye ? 'Retirer' : 'Déployer'}" class="size-9 rounded-lg ${model.deploye ? 'bg-amber-50 text-amber-700' : 'bg-brand-primary text-white'} flex items-center justify-center"><span class="material-symbols-outlined text-lg">${model.deploye ? 'pause' : 'rocket_launch'}</span></button>
            <button data-action="archive" title="Archiver" class="size-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><span class="material-symbols-outlined text-lg">archive</span></button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  async function loadModels() {
    if (!container) return;
    container.setAttribute('aria-busy', 'true');
    try {
      state.models = await apiModels.list() || [];
      updateStats();
      render();
    } catch (error) {
      container.innerHTML = '<div class="col-span-full rounded-xl bg-red-50 text-red-700 p-6 text-center">Impossible de charger les modèles. Vérifiez la connexion au backend.</div>';
      pushNotification('Erreur lors du chargement des modèles.', 'error');
    } finally {
      container.removeAttribute('aria-busy');
    }
  }

  function showTestResults(result) {
    openModal('Résultats du test', `<div class="space-y-4">
      <p class="font-medium">${escapeHtml(result.modele_nom || 'Modèle')}</p>
      <div class="grid grid-cols-2 gap-3">${[
        ['Accuracy', result.accuracy], ['Précision', result.precision], ['Rappel', result.rappel], ['Score F1', result.f1_score],
      ].map(([label, value]) => `<div class="rounded-xl bg-gray-50 dark:bg-gray-700 p-3"><p class="text-xs text-gray-500">${label}</p><p class="text-xl font-bold">${value != null ? `${(value * 100).toFixed(1)}%` : '—'}</p></div>`).join('')}</div>
      <p class="text-xs text-gray-500">${result.echantillon_test || 0} échantillons · ${result.temps_inference || '—'} ms par inférence</p>
    </div>`, { confirmLabel: 'Fermer', cancelLabel: '' });
  }

  container?.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('[data-model-id]');
    if (!button || !card) return;
    const id = Number(card.dataset.modelId);
    const model = state.models.find(item => item.id === id);
    if (!model) return;
    const action = button.dataset.action;
    if (action === 'details') { window.location.href = `details-modele.html?id=${id}`; return; }
    if (action === 'test') {
      buttonLoading(button, true);
      try { const result = await apiModels.test(id); if (!result) throw new Error('Test indisponible'); showTestResults(result); } catch (error) { pushNotification('Le test du modèle a échoué.', 'error'); }
      finally { buttonLoading(button, false); }
      return;
    }
    if (action === 'deploy') {
      buttonLoading(button, true);
      try {
        const result = await apiModels.deploy(id, !model.deploye);
        if (!result) throw new Error('Déploiement indisponible');
        pushNotification(model.deploye ? 'Modèle retiré du déploiement.' : 'Modèle déployé avec succès.', 'success');
        await loadModels();
      } catch (error) { pushNotification('Le statut de déploiement n’a pas pu être modifié.', 'error'); }
      finally { buttonLoading(button, false); }
      return;
    }
    if (action === 'archive') {
      confirmDelete(`archiver « ${escapeHtml(model.nom)} »`, async () => {
        const result = await apiModels.update(id, { actif: false, deploye: false });
        if (!result) throw new Error('Archivage indisponible');
        pushNotification('Modèle archivé.', 'success');
        await loadModels();
      });
    }
  });

  document.getElementById('btn-ajouter-modele')?.addEventListener('click', () => {
    openModal('Ajouter un modèle ML', `<form id="model-create-form" class="grid grid-cols-1 md:grid-cols-2 gap-4" novalidate>
      <label class="md:col-span-2 text-sm font-medium">Nom *<input id="model-nom" required class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3" placeholder="Ex. YOLOv8 Anophèles"></label>
      <label class="text-sm font-medium">Type *<select id="model-type" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"><option value="classification">Classification visuelle</option><option value="detection">Détection visuelle</option><option value="audio">Détection audio</option></select></label>
      <label class="text-sm font-medium">Version *<input id="model-version" required value="1.0.0" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"></label>
      <label class="text-sm font-medium">Architecture<input id="model-architecture" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3" placeholder="Ex. ResNet50"></label>
      <label class="text-sm font-medium">Dataset<select id="model-dataset" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"><option value="">Non associé</option></select></label>
      <label class="md:col-span-2 text-sm font-medium">Description<textarea id="model-description" rows="3" class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"></textarea></label>
      <p id="model-form-error" class="hidden md:col-span-2 text-sm text-red-600">Le nom et la version sont obligatoires.</p>
    </form>`, {
      confirmLabel: 'Créer le modèle', confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const nom = document.getElementById('model-nom')?.value.trim();
        const version = document.getElementById('model-version')?.value.trim();
        if (!nom || !version) { document.getElementById('model-form-error')?.classList.remove('hidden'); return false; }
        const result = await apiModels.create({
          nom, version,
          type_modele: document.getElementById('model-type')?.value,
          architecture: document.getElementById('model-architecture')?.value.trim() || null,
          description: document.getElementById('model-description')?.value.trim() || null,
          dataset_id: Number(document.getElementById('model-dataset')?.value) || null,
        });
        if (!result) return false;
        pushNotification('Modèle créé et enregistré en base.', 'success');
        await loadModels();
        return true;
      },
    });
    apiDatasets.list().then(datasets => {
      const select = document.getElementById('model-dataset');
      (datasets || []).forEach(dataset => select?.insertAdjacentHTML('beforeend', `<option value="${dataset.id}">${escapeHtml(dataset.nom)}</option>`));
    }).catch(() => {});
  });

  document.getElementById('btn-tester-tous')?.addEventListener('click', async event => {
    const active = state.models.filter(model => model.actif);
    if (!active.length) { pushNotification('Aucun modèle actif à tester.', 'warning'); return; }
    buttonLoading(event.currentTarget, true);
    const results = await Promise.allSettled(active.map(model => apiModels.test(model.id)));
    const success = results.filter(result => result.status === 'fulfilled').length;
    buttonLoading(event.currentTarget, false);
    pushNotification(`${success}/${active.length} modèles testés avec succès.`, success === active.length ? 'success' : 'warning');
  });

  searchInput?.addEventListener('input', () => { state.query = searchInput.value.trim().toLowerCase(); render(); });
  const filterButtons = Array.from(document.querySelectorAll('button')).filter(button => button.querySelector('p')?.textContent.includes('Statut') || button.querySelector('p')?.textContent.includes('Type de modèle'));
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const isStatus = button.querySelector('p')?.textContent.includes('Statut');
    const options = isStatus
      ? [['Tous', 'tous'], ['Déployés', 'deploye'], ['En test', 'en_test'], ['Archivés', 'archive']]
      : [['Tous les types', 'tous'], ['Classification', 'classification'], ['Détection', 'detection'], ['Audio', 'audio']];
    openModal(isStatus ? 'Filtrer par statut' : 'Filtrer par type', `<div class="grid gap-2">${options.map(([label, value]) => `<button type="button" data-filter-value="${value}" class="filter-choice rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-left hover:border-brand-primary">${label}</button>`).join('')}</div>`, { confirmLabel: 'Fermer', cancelLabel: '' });
    document.querySelectorAll('.filter-choice').forEach(choice => choice.addEventListener('click', () => {
      if (isStatus) state.status = choice.dataset.filterValue; else state.type = choice.dataset.filterValue;
      button.querySelector('p').textContent = `${isStatus ? 'Statut' : 'Type'}: ${choice.textContent}`;
      render();
      document.getElementById('modal-close')?.click();
    }));
  }));

  loadModels();
});
