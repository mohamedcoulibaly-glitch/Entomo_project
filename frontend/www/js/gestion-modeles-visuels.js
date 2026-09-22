document.addEventListener('DOMContentLoaded', async () => {
  function makeLightbox(el) {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/85 flex items-center justify-center cursor-zoom-out';
      overlay.style.zIndex = '9999';
      const src = el.tagName === 'IMG' ? el.src : (el.style.backgroundImage.match(/url\("?(.+?)"?\)/)?.[1] || '');
      overlay.innerHTML = `
        <div class="relative max-w-3xl rounded-xl overflow-hidden" style="max-height:85vh">
          <img src="${src}" class="max-w-full object-contain rounded-xl" style="max-height:80vh" alt="Aperçu"/>
          <button class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>`;
      overlay.querySelector('button').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    });
  }

  document.querySelectorAll('img[class*="rounded"], [class*="aspect"][class*="bg-cover"]').forEach(makeLightbox);

  await loadModels();
  await loadRegistry();

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Ajouter') || t.includes('Importer') || t.includes('Nouveau modèle')) {
      btn.addEventListener('click', () => {
        openModal('Ajouter un modèle visuel',
          `<div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du modèle *</label>
              <input id="mv-nom" type="text" placeholder="ex: Classification An. gambiae v3"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Version</label>
              <input id="mv-version" type="text" placeholder="ex: 3.0.1"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fichier modèle (.pt / .onnx)</label>
              <input id="mv-file" type="file" accept=".pt,.onnx,.h5,.pkl"
                class="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-brand-primary/10 file:text-brand-primary"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea id="mv-desc" rows="2" placeholder="Description du modèle..."
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 resize-none"></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Importer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              const nom = document.getElementById('mv-nom')?.value.trim();
              if (!nom) { pushNotification('Nom requis.', 'warning'); return; }
              try {
                const data = {
                  nom,
                  version: document.getElementById('mv-version')?.value.trim() || '1.0.0',
                  description: document.getElementById('mv-desc')?.value.trim(),
                  type_modele: 'classification',
                  architecture: 'VGG16',
                };
                const fileInput = document.getElementById('mv-file');
                if (fileInput?.files?.[0]) {
                  const formData = new FormData();
                  formData.append('nom', data.nom);
                  formData.append('version', data.version);
                  formData.append('description', data.description || '');
                  formData.append('type_modele', data.type_modele);
                  formData.append('architecture', data.architecture);
                  formData.append('fichier', fileInput.files[0]);
                  const res = await apiRequest('POST', '/modeles/ml/importer', formData, true);
                  if (res) { pushNotification(`Modèle "${nom}" importé.`, 'success'); await loadModels(); }
                } else {
                  const res = await apiModels.create(data);
                  if (res) { pushNotification(`Modèle "${nom}" importé.`, 'success'); await loadModels(); }
                }
              } catch (err) { pushNotification('Erreur lors de l\'import.', 'error'); }
            },
          }
        );
      });
    }

    if (t.includes('Déployer') || t.includes('Activer')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded"]');
        const id = card?.dataset?.id;
        const name = card?.querySelector('h3, h4, p')?.textContent || 'ce modèle';
        if (!id) { pushNotification('ID modèle introuvable.', 'error'); return; }
        openModal('Déployer le modèle',
          `<div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-brand-primary text-3xl">rocket_launch</span>
            <div>
              <p class="font-medium">Déployer <strong>${name}</strong> en production ?</p>
              <p class="text-sm text-gray-500">Le modèle précédent sera archivé.</p>
            </div>
          </div>`,
          {
            confirmLabel: 'Déployer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              buttonLoading(btn, true);
              try {
                const res = await apiModels.deploy(parseInt(id));
                if (res) {
                  pushNotification(`Modèle "${name}" déployé en production.`, 'success');
                  btn.textContent = 'Actif';
                  btn.classList.add('bg-green-100', 'text-green-800');
                  await loadModels();
                }
              } catch (err) { pushNotification('Erreur lors du déploiement.', 'error'); }
              buttonLoading(btn, false);
            },
          }
        );
      });
    }

    if (t.includes('Supprimer') || t.includes('Archiver')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded"]');
        const id = card?.dataset?.id;
        const name = card?.querySelector('h3, h4, p')?.textContent || 'ce modèle';
        if (!id) { pushNotification('ID modèle introuvable.', 'error'); return; }
        confirmDelete(name, async () => {
          try {
            const res = await apiModels.delete(parseInt(id));
            if (res) {
              card?.remove();
              pushNotification(`Modèle "${name}" supprimé.`, 'info');
            }
          } catch (err) { pushNotification('Erreur lors de la suppression.', 'error'); }
        });
      });
    }

    if (t.includes('Tester') || t.includes('Évaluer')) {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[class*="rounded"]');
        const id = card?.dataset?.id;
        if (!id) { pushNotification('ID modèle introuvable.', 'error'); return; }
        buttonLoading(btn, true);
        try {
          const res = await apiModels.test(parseInt(id));
          if (res) {
            openModal('Résultats du test',
              `<div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">Précision (Accuracy)</span><strong class="text-brand-success">${(res.accuracy * 100).toFixed(1) || 'N/A'}%</strong></div>
                <div class="flex justify-between"><span class="text-gray-500">Précision (Precision)</span><strong>${(res.precision * 100).toFixed(1) || 'N/A'}%</strong></div>
                <div class="flex justify-between"><span class="text-gray-500">Rappel (Recall)</span><strong>${(res.rappel * 100).toFixed(1) || 'N/A'}%</strong></div>
                <div class="flex justify-between"><span class="text-gray-500">F1 Score</span><strong>${(res.f1_score * 100).toFixed(1) || 'N/A'}%</strong></div>
                <div class="flex justify-between"><span class="text-gray-500">Temps d'inférence moyen</span><strong>${res.temps_inference || 'N/A'}ms</strong></div>
              </div>`,
              { confirmLabel: 'Fermer', cancelLabel: '' }
            );
          }
        } catch (err) { pushNotification('Erreur lors du test.', 'error'); }
        buttonLoading(btn, false);
      });
    }
  });

  async function loadRegistry() {
    try {
      const registry = await apiModels.registry();
      const precisionEl = document.querySelector('[data-registry-precision]');
      const labelsEl = document.querySelector('[data-registry-labels]');
      if (precisionEl && registry?.image?.metrics?.precision != null) {
        precisionEl.textContent = `${(registry.image.metrics.precision * 100).toFixed(1)}%`;
      }
      if (labelsEl && registry?.image?.labels?.length) {
        labelsEl.textContent = registry.image.labels.join(', ');
      }
    } catch (err) {
      console.warn('Registre ML indisponible', err);
    }
  }

  function modelPlaceholderStyle(model) {
    const hue = (Number(model.id) || 1) * 47 % 360;
    return `background: linear-gradient(135deg, hsl(${hue} 45% 35%), hsl(${(hue + 40) % 360} 55% 55%))`;
  }

  async function loadModels() {
    try {
      const allModels = await apiModels.list();
      const models = (allModels || []);
      if (!models) return;
      const countEl = document.querySelector('[data-count="models"]');
      if (countEl) countEl.textContent = models.length || '0';
      const container = document.querySelector('[data-visual-container]');
      if (container) {
        container.innerHTML = models.length ? models.map(m => `
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow" data-id="${m.id}">
            <div class="aspect-video flex items-center justify-center text-white text-sm font-semibold" style="${modelPlaceholderStyle(m)}">
              <span class="material-symbols-outlined text-4xl opacity-80">image_search</span>
            </div>
            <div class="p-3">
              <h3 class="font-bold text-sm text-[#111418] dark:text-white">${m.nom || 'Modèle'}</h3>
              <p class="text-xs text-gray-500 mb-2">v${m.version || '1.0.0'}${m.precision != null ? ` • précision ${(m.precision * 100).toFixed(1)}%` : ''}</p>
              ${m.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${m.description}</p>` : ''}
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.deploye ? 'bg-green-100 text-green-800' : !m.actif ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'}">${m.deploye ? 'déployé' : !m.actif ? 'archivé' : 'actif'}</span>
                <div class="flex gap-1">
                  <button class="px-2 py-1 text-xs rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Déployer</button>
                  <button class="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">Tester</button>
                  <button class="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">Supprimer</button>
                </div>
              </div>
            </div>
          </div>`).join('') : '<div class="col-span-full text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">image</span>Aucun modèle visuel trouvé</div>';
      }
    } catch (err) { pushNotification('Erreur lors du chargement des modèles.', 'error'); }
  }

  let activePipelineId = null;
  let pipelinePollTimer = null;

  function updatePipelineProgress(pipeline) {
    const bar = document.querySelector('[data-pipeline-progress]');
    const status = document.querySelector('[data-pipeline-status]');
    const logs = document.querySelector('[data-pipeline-logs]');
    if (bar) bar.style.width = `${pipeline.progression || 0}%`;
    if (status) status.textContent = pipeline.statut || '—';
    if (logs && pipeline.logs) logs.textContent = pipeline.logs.split('\n').slice(-4).join('\n');
  }

  function stopPipelinePolling() {
    if (pipelinePollTimer) {
      clearInterval(pipelinePollTimer);
      pipelinePollTimer = null;
    }
  }

  function startPipelinePolling(pipelineId) {
    stopPipelinePolling();
    pipelinePollTimer = setInterval(async () => {
      try {
        const pipeline = await apiModels.getPipeline(pipelineId);
        if (!pipeline) return;
        updatePipelineProgress(pipeline);
        if (['termine', 'erreur', 'arrete'].includes(pipeline.statut)) {
          stopPipelinePolling();
          activePipelineId = null;
          await Promise.all([loadModels(), loadRegistry()]);
        }
      } catch {
        stopPipelinePolling();
      }
    }, 1500);
  }

  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();
    if (text.includes('Lancer l\'entraînement') || text.includes("Lancer l'entraînement")) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const models = (await apiModels.list()) || [];
          const model = models[0];
          if (!model) { pushNotification('Aucun modèle visuel disponible.', 'warning'); return; }
          const pipeline = await apiModels.createPipeline({
            nom: `Entraînement ${model.nom}`,
            type_pipeline: 'entrainement',
            ml_model_id: model.id,
          });
          if (!pipeline) return;
          activePipelineId = pipeline.id;
          const started = await apiModels.runPipeline(pipeline.id);
          pushNotification(`Pipeline "${started?.nom || pipeline.nom}" démarré.`, 'success');
          startPipelinePolling(pipeline.id);
        } catch {
          pushNotification('Impossible de lancer l\'entraînement.', 'error');
        } finally {
          buttonLoading(btn, false);
        }
      });
    }
    if (text.includes('Arrêter')) {
      btn.addEventListener('click', async () => {
        if (!activePipelineId) { pushNotification('Aucun entraînement en cours.', 'warning'); return; }
        try {
          await apiModels.stopPipeline(activePipelineId);
          pushNotification('Entraînement arrêté.', 'success');
          stopPipelinePolling();
          activePipelineId = null;
        } catch {
          pushNotification('Impossible d\'arrêter le pipeline.', 'error');
        }
      });
    }
  });
});
