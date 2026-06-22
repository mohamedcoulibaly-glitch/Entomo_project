/**
 * gestion-modeles-visuels.js
 * Gestion des modèles visuels (images de spécimens)
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Lightbox pour les aperçus ────────────────────────────────────────────────
  function makeLightbox(el) {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center cursor-zoom-out';
      const src = el.tagName === 'IMG' ? el.src : (el.style.backgroundImage.match(/url\("?(.+?)"?\)/)?.[1] || '');
      overlay.innerHTML = `
        <div class="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden">
          <img src="${src}" class="max-w-full max-h-[80vh] object-contain rounded-xl"/>
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

  // ── Bouton upload modèle ─────────────────────────────────────────────────────
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
              <input type="file" accept=".pt,.onnx,.h5,.pkl"
                class="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3
                       file:rounded file:border-0 file:text-sm file:bg-brand-primary/10 file:text-brand-primary"/>
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
              if (typeof apiModels !== 'undefined') {
                showLoader();
                const res = await apiModels.create({
                  nom,
                  version: document.getElementById('mv-version')?.value.trim() || '1.0.0',
                  description: document.getElementById('mv-desc')?.value.trim(),
                  type: 'visuel',
                  statut: 'actif',
                });
                hideLoader();
                if (res) pushNotification(`Modèle "${nom}" importé.`, 'success');
              } else {
                pushNotification(`Modèle "${nom}" importé (simulation).`, 'success');
              }
            },
          }
        );
      });
    }

    if (t.includes('Déployer') || t.includes('Activer')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded"]');
        const name = card?.querySelector('h3, h4, p')?.textContent || 'ce modèle';
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
              showLoader();
              await new Promise(r => setTimeout(r, 1500));
              hideLoader();
              pushNotification(`Modèle "${name}" déployé en production.`, 'success');
              btn.textContent = 'Actif';
              btn.classList.add('bg-green-100', 'text-green-800');
            },
          }
        );
      });
    }

    if (t.includes('Supprimer') || t.includes('Archiver')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded"]');
        const name = card?.querySelector('h3, h4, p')?.textContent || 'ce modèle';
        confirmDelete(name, async () => {
          showLoader();
          await new Promise(r => setTimeout(r, 800));
          hideLoader();
          card?.remove();
          pushNotification(`Modèle "${name}" supprimé.`, 'info');
        });
      });
    }

    if (t.includes('Tester') || t.includes('Évaluer')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 2000));
        hideLoader();
        openModal('Résultats du test',
          `<div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Précision (Accuracy)</span><strong class="text-brand-success">94.7%</strong></div>
            <div class="flex justify-between"><span class="text-gray-500">Précision (Precision)</span><strong>92.1%</strong></div>
            <div class="flex justify-between"><span class="text-gray-500">Rappel (Recall)</span><strong>91.8%</strong></div>
            <div class="flex justify-between"><span class="text-gray-500">F1 Score</span><strong>91.9%</strong></div>
            <div class="flex justify-between"><span class="text-gray-500">Temps d'inférence moyen</span><strong>23ms</strong></div>
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '' }
        );
      });
    }
  });

  // ── Chargement des modèles depuis l'API ──────────────────────────────────────
  if (typeof apiModels !== 'undefined') {
    const models = await apiModels.list({ type: 'visuel' });
    if (models && models.length) {
      // Les données sont déjà dans le HTML statique ; on met juste à jour les compteurs
      const countEl = document.querySelector('[data-count="models"]');
      if (countEl) countEl.textContent = models.length;
    }
  }

});
