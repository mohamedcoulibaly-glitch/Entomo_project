/**
 * generateur-rapports.js
 * Générateur de rapports personnalisés — comportements interactifs
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Étapes du générateur (wizard) ────────────────────────────────────────────
  let currentStep = 1;
  const totalSteps = 4;

  function getStepButtons() {
    return document.querySelectorAll('[class*="step"], [data-step]');
  }

  // ── Sélection du type de rapport ─────────────────────────────────────────────
  const reportTypeCards = document.querySelectorAll('[class*="cursor-pointer"][class*="rounded-xl"]');
  let selectedType = null;

  reportTypeCards.forEach(card => {
    card.addEventListener('click', () => {
      reportTypeCards.forEach(c => {
        c.classList.remove('ring-2', 'ring-brand-primary', 'bg-brand-primary/5');
        c.classList.add('border-gray-200', 'dark:border-gray-700');
      });
      card.classList.add('ring-2', 'ring-brand-primary', 'bg-brand-primary/5');
      card.classList.remove('border-gray-200', 'dark:border-gray-700');
      selectedType = card.querySelector('h3, p.font-bold')?.textContent;
      pushNotification(`Type de rapport sélectionné : "${selectedType}"`, 'info');
    });
  });

  // ── Indicateurs sélectionnables ──────────────────────────────────────────────
  const indicatorItems = document.querySelectorAll('[class*="flex"][class*="items-center"][class*="gap"] input[type="checkbox"]');
  const selectedIndicators = new Set();

  indicatorItems.forEach(cb => {
    cb.addEventListener('change', () => {
      const label = cb.closest('label')?.textContent?.trim() || cb.value;
      if (cb.checked) {
        selectedIndicators.add(label);
        pushNotification(`Indicateur ajouté : "${label}"`, 'info');
      } else {
        selectedIndicators.delete(label);
      }
      updateIndicatorCount();
    });
  });

  function updateIndicatorCount() {
    const countEl = document.querySelector('[data-count], .indicator-count');
    if (countEl) countEl.textContent = `${selectedIndicators.size} indicateur(s) sélectionné(s)`;
  }

  // ── Sélecteur de période avec plage de dates ─────────────────────────────────
  document.querySelectorAll('select').forEach(sel => {
    if (sel.id?.includes('period') || sel.closest('label')?.textContent?.toLowerCase().includes('période')) {
      sel.addEventListener('change', () => {
        const custom = sel.value === 'custom' || sel.value === 'Personnalisée';
        const dateRange = document.getElementById('custom-date-range') || sel.closest('.flex-col')?.nextElementSibling;
        if (dateRange) dateRange.classList.toggle('hidden', !custom);
      });
    }
  });

  // ── Bouton Générer ───────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Générer') && !text.includes('Générateur')) {
      btn.addEventListener('click', () => {
        openModal('Confirmer la génération du rapport',
          `<div class="space-y-3">
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Type</span><strong>${selectedType || 'Non sélectionné'}</strong></div>
              <div class="flex justify-between"><span class="text-gray-500">Indicateurs</span><strong>${selectedIndicators.size || '—'}</strong></div>
              <div class="flex justify-between"><span class="text-gray-500">Format</span><strong>PDF + CSV</strong></div>
              <div class="flex justify-between"><span class="text-gray-500">Langue</span><strong>Français</strong></div>
            </div>
            <p class="text-xs text-gray-500">La génération peut prendre quelques minutes selon la quantité de données.</p>
          </div>`,
          {
            confirmLabel: 'Lancer la génération',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => simulateGeneration(btn),
          }
        );
      });
    }

    if (text.includes('Aperçu') || text.includes('Prévisualiser')) {
      btn.addEventListener('click', () => {
        openModal('Aperçu du rapport',
          `<div class="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-3">
            <div class="flex justify-between items-center border-b pb-2 dark:border-gray-700">
              <div>
                <h3 class="font-bold text-lg">Rapport de Surveillance Entomologique</h3>
                <p class="text-gray-500 text-xs">Généré le ${new Date().toLocaleDateString('fr-FR')} — PNLP Sénégal</p>
              </div>
              <span class="text-brand-primary font-bold">BROUILLON</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center"><p class="text-2xl font-bold">15.7</p><p class="text-xs text-gray-500">Densité moyenne</p></div>
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center"><p class="text-2xl font-bold">3</p><p class="text-xs text-gray-500">Alertes actives</p></div>
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center"><p class="text-2xl font-bold">82%</p><p class="text-xs text-gray-500">Couverture IRS</p></div>
            </div>
            <p class="text-xs text-gray-400 text-center italic">Aperçu simplifié — le rapport complet contiendra plus de sections</p>
          </div>`,
          { confirmLabel: 'Générer le rapport complet', cancelLabel: 'Fermer',
            onConfirm: () => document.querySelector('button:has(> span + span)')?.click() }
        );
      });
    }

    if (text.includes('Télécharger') || text.includes('Exporter')) {
      btn.addEventListener('click', () => {
        showLoader();
        setTimeout(() => {
          hideLoader();
          pushNotification('Rapport téléchargé : rapport_entomo_2024.pdf', 'success');
        }, 1500);
      });
    }

    if (text.includes('Planifier') || text.includes('Automatiser')) {
      btn.addEventListener('click', () => {
        openModal('Planifier la génération automatique',
          `<div class="space-y-4 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fréquence</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Quotidienne</option><option>Hebdomadaire</option><option selected>Mensuelle</option><option>Trimestrielle</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Destinataires email</label>
              <input type="email" placeholder="email@example.com" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
              <p class="text-xs text-gray-400 mt-1">Plusieurs emails séparés par des virgules</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Format</label>
              <div class="flex gap-3">
                ${['PDF','CSV','Excel'].map(f => `<label class="flex items-center gap-1 text-sm"><input type="checkbox" checked/> ${f}</label>`).join('')}
              </div>
            </div>
          </div>`,
          {
            confirmLabel: 'Planifier',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Génération automatique planifiée.', 'success'),
          }
        );
      });
    }
  });

  function simulateGeneration(btn) {
    const progressEl = document.getElementById('generation-progress') || createProgressBar();
    progressEl.classList.remove('hidden');

    const bar  = progressEl.querySelector('[class*="bg-brand-primary"]');
    const text = progressEl.querySelector('p');
    const steps = ['Chargement des données...','Calcul des indicateurs...','Mise en forme...','Génération PDF...','Finalisation...'];
    let i = 0;

    const iv = setInterval(() => {
      const pct = Math.round(((i + 1) / steps.length) * 100);
      if (bar)  bar.style.width  = `${pct}%`;
      if (text) text.textContent = steps[i];
      i++;
      if (i >= steps.length) {
        clearInterval(iv);
        setTimeout(() => {
          progressEl.classList.add('hidden');
          pushNotification('Rapport généré avec succès ! Téléchargement en cours...', 'success');
        }, 800);
      }
    }, 800);
  }

  function createProgressBar() {
    const el = document.createElement('div');
    el.id = 'generation-progress';
    el.className = 'fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72';
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-bold text-[#111418] dark:text-white">Génération en cours</span>
        <span class="material-symbols-outlined animate-spin text-brand-primary text-base">refresh</span>
      </div>
      <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div class="h-full bg-brand-primary rounded-full transition-all duration-700" style="width:0%"></div>
      </div>
      <p class="text-xs text-gray-500">Chargement des données...</p>`;
    document.body.appendChild(el);
    return el;
  }

});
