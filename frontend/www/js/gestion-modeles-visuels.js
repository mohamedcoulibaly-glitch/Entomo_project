document.addEventListener('DOMContentLoaded', async () => {
  function makeLightbox(el) {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center cursor-zoom-out';
      const src = el.tagName === 'IMG' ? el.src : (el.style.backgroundImage.match(/url\("?(.+?)"?\)/)?.[1] || '');
      overlay.innerHTML = `
        <div class="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden">
          <img src="${src}" class="max-w-full max-h-[80vh] object-contain rounded-xl" alt="Aperçu"/>
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

  async function loadModels() {
    try {
      const allModels = await apiModels.list();
      const models = (allModels || []).filter(model => model.type_modele !== 'audio');
      if (!models) return;
      const countEl = document.querySelector('[data-count="models"]');
      if (countEl) countEl.textContent = models.length || '0';
      const container = document.querySelector('[data-visual-container]');
      if (container) {
        container.innerHTML = models.length ? models.map(m => `
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow" data-id="${m.id}">
            <div class="aspect-video bg-gray-100 dark:bg-gray-700 bg-cover bg-center" style="background-image: url('${m.image_url || 'https://placehold.co/400x225/e2e8f0/94a3b8?text=Modèle'}')"></div>
            <div class="p-3">
              <h3 class="font-bold text-sm text-[#111418] dark:text-white">${m.nom || 'Modèle'}</h3>
              <p class="text-xs text-gray-500 mb-2">v${m.version || '1.0.0'}</p>
              ${m.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${m.description}</p>` : ''}
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.deploye ? 'bg-green-100 text-green-800' : !m.actif ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'}">${m.deploye ? 'déployé' : !m.actif ? 'archivé' : 'actif'}</span>
                <div class="flex gap-1">
                  <button class="px-2 py-1 text-xs rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Déployer</button>
                  <button class="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">Supprimer</button>
                </div>
              </div>
            </div>
          </div>`).join('') : '<div class="col-span-full text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">image</span>Aucun modèle visuel trouvé</div>';
      }
    } catch (err) { pushNotification('Erreur lors du chargement des modèles.', 'error'); }
  }
});
