document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = '../login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const modelId = params.get('id');
  let currentModel = null;

  if (!modelId) {
    pushNotification('Aucun modèle spécifié', 'error');
    return;
  }

  async function loadModel() {
    showLoader();
    try {
      const model = await apiModels.get(parseInt(modelId));
      if (!model) {
        pushNotification('Modèle non trouvé', 'error');
        return;
      }
      currentModel = model;
      displayModel(model);
    } catch (err) {
      pushNotification('Erreur lors du chargement du modèle', 'error');
    }
    hideLoader();
  }

  function displayModel(model) {
    document.getElementById('model-name').textContent = model.nom || '—';
    document.getElementById('model-name-field').textContent = model.nom || '—';
    document.getElementById('model-version').textContent = model.version || '—';
    document.getElementById('model-version-field').textContent = model.version || '—';
    document.getElementById('model-architecture').textContent = model.architecture || '—';
    document.getElementById('model-type').textContent = model.type_modele || '—';
    document.getElementById('model-type-field').textContent = model.type_modele || '—';
    document.getElementById('model-description').textContent = model.description || 'Aucune description';

    document.getElementById('model-precision').textContent = model.precision ? `${(model.precision * 100).toFixed(1)}%` : '—';
    document.getElementById('model-rappel').textContent = model.rappel ? `${(model.rappel * 100).toFixed(1)}%` : '—';
    document.getElementById('model-f1').textContent = model.f1_score ? `${(model.f1_score * 100).toFixed(1)}%` : '—';
    document.getElementById('model-taillemb').textContent = model.taille_mb ? `${model.taille_mb} MB` : '—';

    if (model.precision != null) document.getElementById('bar-precision').style.width = `${(model.precision * 100).toFixed(1)}%`;
    if (model.rappel != null) document.getElementById('bar-rappel').style.width = `${(model.rappel * 100).toFixed(1)}%`;
    if (model.f1_score != null) document.getElementById('bar-f1').style.width = `${(model.f1_score * 100).toFixed(1)}%`;
    if (model.taille_mb != null) {
      const pct = Math.min(100, (model.taille_mb / 500) * 100);
      document.getElementById('bar-taille').style.width = `${pct.toFixed(1)}%`;
    }

    const statusBadge = document.getElementById('model-status');
    const statusBadge2 = document.getElementById('model-status-badge');
    if (model.deploye) {
      const html = '<span class="size-2 rounded-full bg-green-500"></span> Déployé';
      const cls = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400';
      statusBadge.className = cls;
      statusBadge.innerHTML = html;
      statusBadge2.className = cls;
      statusBadge2.innerHTML = html;
    } else {
      const html = '<span class="size-2 rounded-full bg-gray-400"></span> Non déployé';
      const cls = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
      statusBadge.className = cls;
      statusBadge.innerHTML = html;
      statusBadge2.className = cls;
      statusBadge2.innerHTML = html;
    }

    document.getElementById('model-context').textContent = model.contexte_deploiement || '—';
    document.getElementById('model-deploy-date').textContent = model.date_deploiement || '—';
    document.getElementById('model-dataset').textContent = model.dataset_id ? `Dataset #${model.dataset_id}` : '—';
    document.getElementById('model-images-count').textContent = model.nb_images != null ? `${model.nb_images}` : '—';
  }

  document.getElementById('btn-deploy')?.addEventListener('click', async () => {
    const model = await apiModels.get(parseInt(modelId));
    if (!model) return;
    const deploy = !model.deploye;
    showLoader();
    try {
      const res = await apiModels.deploy(parseInt(modelId), deploy);
      if (res) {
        pushNotification(deploy ? 'Modèle déployé avec succès' : 'Modèle retiré du déploiement', 'success');
        loadModel();
      }
    } catch (err) {
      pushNotification('Erreur lors du déploiement', 'error');
    }
    hideLoader();
  });

  document.getElementById('btn-test')?.addEventListener('click', async () => {
    showLoader();
    try {
      const result = await apiModels.test(parseInt(modelId));
      hideLoader();
      if (result) {
        openModal('Résultats du Test',
          `<div class="space-y-3">
            <p class="font-medium">Modèle : ${result.modele_nom || 'N/A'}</p>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span class="text-gray-500">Accuracy</span><p class="text-xl font-bold">${(result.accuracy * 100).toFixed(1)}%</p></div>
              <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span class="text-gray-500">Precision</span><p class="text-xl font-bold">${(result.precision * 100).toFixed(1)}%</p></div>
              <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span class="text-gray-500">Rappel</span><p class="text-xl font-bold">${(result.rappel * 100).toFixed(1)}%</p></div>
              <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span class="text-gray-500">F1 Score</span><p class="text-xl font-bold">${(result.f1_score * 100).toFixed(1)}%</p></div>
            </div>
            <p class="text-sm text-gray-500">Temps d\'inférence : ${result.temps_inference}ms</p>
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '' }
        );
      }
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du test', 'error');
    }
  });

  document.getElementById('btn-archive')?.addEventListener('click', () => {
    confirmDelete(`archiver « ${currentModel?.nom || 'ce modèle'} »`, async () => {
      await apiModels.update(parseInt(modelId), { actif: false, deploye: false });
      pushNotification('Modèle archivé avec succès', 'success');
      await loadModel();
    });
  });

  document.getElementById('btn-download')?.addEventListener('click', () => {
    if (!currentModel?.chemin) {
      pushNotification('Aucun artefact de modèle n’est associé à cette version.', 'warning');
      return;
    }
    pushNotification(`Artefact disponible sur le serveur : ${currentModel.chemin}`, 'info');
  });

  async function loadPipelines() {
    try {
      const pipelines = await apiModels.listPipelines();
      if (!pipelines) return;
      const list = document.getElementById('pipeline-list');
      const filtered = pipelines.filter(p => p.ml_model_id === parseInt(modelId));
      if (filtered.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-sm py-4 text-center">Aucun pipeline pour ce modèle</p>';
        return;
      }
      list.innerHTML = filtered.map(p => `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <p class="text-sm font-medium">${p.nom || 'Pipeline'}</p>
            <p class="text-xs text-gray-500">${p.type_pipeline || '—'} · ${p.statut || '—'}</p>
          </div>
          <span class="text-xs ${p.statut === 'termine' ? 'text-green-600' : p.statut === 'erreur' ? 'text-red-600' : 'text-yellow-600'}">${p.progression || 0}%</span>
        </div>
      `).join('');
    } catch (err) {}
  }

  await loadModel();
  await loadPipelines();
});
