/**
 * catalogue-modeles.js
 * Catalogue des modèles ML déployés — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement des modèles depuis l'API ──────────────────────────────────────
  if (typeof apiModels !== 'undefined') {
    const models = await apiModels.list();
    if (models && models.length) {
      const countEl = document.querySelector('[data-stat="total_models"]');
      if (countEl) countEl.textContent = models.length;
      const deployedEl = document.querySelector('[data-stat="deployed_models"]');
      if (deployedEl) deployedEl.textContent = models.filter(m => m.deploye).length;
    }
  }

  // ── Vue grille / liste ────────────────────────────────────────────────────────
  let viewMode = 'grid';

  const viewBtns = document.querySelectorAll('[data-view], button[title="Grille"], button[title="Liste"]');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view || (btn.title === 'Grille' ? 'grid' : 'list');
      viewBtns.forEach(b => b.classList.remove('bg-brand-primary', 'text-white'));
      btn.classList.add('bg-brand-primary', 'text-white');
    });
  });

  // ── Cartes modèles cliquables ─────────────────────────────────────────────────
  const modelCards = document.querySelectorAll('[class*="rounded-xl"][class*="border"] [class*="cursor-pointer"], [class*="rounded-xl"][class*="hover:shadow"]');

  modelCards.forEach(card => {
    if (!card.querySelector('button')) return; // ignore si déjà des boutons interactifs

    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const name = card.querySelector('h3, p.font-bold, .text-lg')?.textContent?.trim() || 'Modèle';
      openModelDetail(name, card);
    });
  });

  function openModelDetail(name, card) {
    const accuracy = card.querySelector('[class*="text-brand-success"]')?.textContent || '~92%';
    openModal(`Détails — ${name}`,
      `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-gray-500 text-xs">Précision</p>
            <p class="text-lg font-bold text-brand-success">${accuracy}</p>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-gray-500 text-xs">Statut</p>
            <p class="text-lg font-bold text-green-600">Déployé ✓</p>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-gray-500 text-xs">Version</p>
            <p class="text-sm font-bold">v2.3.1</p>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-gray-500 text-xs">Déployé le</p>
            <p class="text-sm font-bold">${new Date(Date.now()-7*86400000).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div>
          <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Métriques d'évaluation</p>
          <div class="space-y-2">
            ${[['Précision','0.924'],['Rappel','0.891'],['F1-Score','0.907'],['AUC-ROC','0.962']].map(([k,v]) => `
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500 w-20">${k}</span>
                <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-brand-primary rounded-full transition-all duration-700" style="width:${parseFloat(v)*100}%"></div>
                </div>
                <span class="text-xs font-bold w-10 text-right">${v}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`,
      {
        confirmLabel: 'Déployer une nouvelle version',
        confirmClass: 'bg-brand-primary text-white',
        onConfirm: () => {
          showLoader();
          setTimeout(() => { hideLoader(); pushNotification(`Nouvelle version de "${name}" déployée.`, 'success'); }, 2500);
        },
      }
    );

    // Animer les barres de progression dans la modale
    setTimeout(() => {
      document.querySelectorAll('#universal-modal .h-full.bg-brand-primary').forEach(bar => {
        const w = bar.style.width;
        bar.style.width = '0%';
        requestAnimationFrame(() => requestAnimationFrame(() => bar.style.width = w));
      });
    }, 100);
  }

  // ── Boutons d'action sur les modèles ────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Déployer') || text.includes('Activer')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const name = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Modèle';
        openModal(`Déployer "${name}"`,
          `<div class="space-y-3 text-sm">
            <p>Sélectionnez l'environnement de déploiement :</p>
            <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="env" value="prod" checked class="text-brand-primary"/> Production
            </label>
            <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="env" value="staging" class="text-brand-primary"/> Staging
            </label>
            <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="env" value="test" class="text-brand-primary"/> Test uniquement
            </label>
          </div>`,
          {
            confirmLabel: 'Déployer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => {
              showLoader();
              setTimeout(() => { hideLoader(); pushNotification(`Modèle "${name}" déployé avec succès.`, 'success'); }, 2000);
            },
          }
        );
      });
    }

    if (text.includes('Archiver') || text.includes('Désactiver')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const name = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Modèle';
        confirmDelete(`archiver "${name}"`, () => {
          pushNotification(`Modèle "${name}" archivé.`, 'warning');
          btn.closest('[class*="rounded-xl"]')?.classList.add('opacity-50', 'pointer-events-none');
        });
      });
    }
  });

  // ── Recherche dans le catalogue ───────────────────────────────────────────────
  const searchInput = document.querySelector('input[placeholder]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll('[class*="rounded-xl"][class*="border"][data-model], [class*="rounded-xl"][class*="p-4"]').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) || !q ? '' : 'none';
      });
    });
  }

  // ── Filtre par statut ─────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const p = btn.querySelector('p');
    if (p?.textContent.startsWith('Statut')) {
      btn.addEventListener('click', () => {
        showDD(btn, ['Tous','Déployé','En test','Archivé'], val => {
          if (p) p.textContent = `Statut: ${val}`;
          pushNotification(`Filtre statut : ${val}`, 'info');
        });
      });
    }
  });

  function showDD(anchor, options, onSelect) {
    document.querySelectorAll('.model-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'model-dd absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[150px] py-1';
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

});
