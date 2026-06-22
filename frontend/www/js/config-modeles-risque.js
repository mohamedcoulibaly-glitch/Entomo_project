/**
 * config-modeles-risque.js
 * Configuration des modèles de risque épidémiologique
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Drag & drop pour ordonner les facteurs de risque ─────────────────────────
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
        pushNotification('Ordre des facteurs mis à jour.', 'info');
      }
    });
  });

  // ── Sliders de pondération ────────────────────────────────────────────────────
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
      warningEl.className = total === 100
        ? 'text-green-600 text-xs font-medium'
        : 'text-yellow-600 text-xs font-medium';
    }
  }

  // ── Boutons ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Sauvegarder') || t.includes('Appliquer') || t.includes('Enregistrer')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 1000));
        hideLoader();
        pushNotification('Configuration des modèles de risque sauvegardée.', 'success');
      });
    }

    if (t.includes('Ajouter facteur') || t.includes('Nouveau facteur')) {
      btn.addEventListener('click', () => {
        openModal('Ajouter un facteur de risque',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du facteur *</label>
              <input type="text" placeholder="ex: Précipitations mensuelles"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Source des données</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Captures entomologiques</option>
                <option>Données météo</option>
                <option>Données géographiques</option>
                <option>DHIS2</option>
                <option>Externe</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pondération initiale (%)</label>
              <input type="number" min="0" max="100" value="10"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Seuil d'alerte</label>
              <input type="number" step="0.1" placeholder="ex: 0.7"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
          </div>`,
          {
            confirmLabel: 'Ajouter',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Facteur de risque ajouté.', 'success'),
          }
        );
      });
    }

    if (t.includes('Simuler') || t.includes('Tester le modèle')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 2200));
        hideLoader();
        openModal('Résultats de simulation',
          `<div class="space-y-3 text-sm">
            <p class="font-medium text-gray-700 dark:text-gray-300">Scénario : Saison des pluies + forte densité vectorielle</p>
            <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-red-700 dark:text-red-300">Indice de risque global</span>
                <span class="text-2xl font-black text-red-600">0.87</span>
              </div>
              <p class="text-xs text-red-600">⚠ RISQUE ÉLEVÉ — Intervention recommandée</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p class="text-xs text-gray-500">Régions à haut risque</p>
                <p class="font-bold text-lg">4</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p class="text-xs text-gray-500">Population exposée</p>
                <p class="font-bold text-lg">~127k</p>
              </div>
            </div>
          </div>`,
          { confirmLabel: 'Exporter rapport', cancelLabel: 'Fermer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Rapport de simulation exporté.', 'success') }
        );
      });
    }

    if (t.includes('Réinitialiser') || t.includes('Par défaut')) {
      btn.addEventListener('click', () => {
        confirmDelete('la configuration des modèles de risque', () => {
          document.querySelectorAll('input[type="range"]').forEach(r => {
            r.value = r.defaultValue || '10';
            r.dispatchEvent(new Event('input'));
          });
          pushNotification('Configuration réinitialisée.', 'warning');
        });
      });
    }
  });

  // ── Seuils d'alerte — validation visuelle ─────────────────────────────────────
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

});
