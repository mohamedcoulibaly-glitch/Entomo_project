/**
 * dashboard-pipelines.js
 * Tableaux de bord ML Pipelines (1 et 4) — comportements interactifs
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Simulation de progression des pipelines ─────────────────────────────────
  const progressBars = document.querySelectorAll('[class*="bg-brand-primary"][class*="rounded-full"]:not([class*="border"])');

  progressBars.forEach(bar => {
    const parent = bar.parentElement;
    if (!parent?.classList.contains('rounded-full')) return;

    // Lire la largeur actuelle depuis le style en ligne
    const match = bar.style.width?.match(/(\d+)/);
    if (!match) return;

    const target = parseInt(match[1]);
    bar.style.width = '0%';
    bar.style.transition = 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)';

    setTimeout(() => {
      bar.style.width = `${target}%`;
    }, 300 + Math.random() * 400);
  });

  // ── Boutons d'action sur les pipelines ──────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Lancer') || text.includes('Démarrer') || text.includes('Exécuter')) {
      btn.addEventListener('click', () => {
        showLoader();
        const pipelineName = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Pipeline';
        setTimeout(() => {
          hideLoader();
          pushNotification(`Pipeline "${pipelineName}" lancé avec succès.`, 'success');
          simulatePipelineRun(btn);
        }, 1500);
      });
    }

    if (text.includes('Arrêter') || text.includes('Stopper')) {
      btn.addEventListener('click', () => {
        const name = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Pipeline';
        confirmDelete(`arrêter le pipeline "${name}"`, () => {
          pushNotification(`Pipeline arrêté.`, 'warning');
        });
      });
    }

    if (text.includes('Voir logs') || text.includes('Logs')) {
      btn.addEventListener('click', () => {
        openModal('Logs du pipeline',
          `<div class="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-64 overflow-y-auto space-y-1">
            ${generateFakeLogs()}
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
        );
      });
    }

    if (text.includes('Configurer') || text.includes('Paramètres')) {
      btn.addEventListener('click', () => {
        openModal('Configuration du pipeline',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Taux d'apprentissage</label>
              <input type="number" step="0.001" value="0.001"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre d'epochs</label>
              <input type="number" value="100"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Taille du batch</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>16</option><option selected>32</option><option>64</option><option>128</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">GPU</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option selected>Auto</option><option>GPU-0</option><option>CPU uniquement</option>
              </select>
            </div>
          </div>`,
          {
            confirmLabel: 'Sauvegarder',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Configuration du pipeline sauvegardée.', 'success'),
          }
        );
      });
    }
  });

  function simulatePipelineRun(triggerBtn) {
    const card = triggerBtn.closest('[class*="rounded-xl"]');
    if (!card) return;

    const progressEl = card.querySelector('[class*="bg-brand-primary"][class*="rounded-full"]');
    const statusEl   = card.querySelector('[class*="rounded-full"][class*="px-2"]');

    if (statusEl) {
      statusEl.className = statusEl.className.replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '');
      statusEl.classList.add('bg-yellow-100', 'text-yellow-700', 'dark:bg-yellow-900/50', 'dark:text-yellow-300');
      statusEl.textContent = 'En cours...';
    }

    if (progressEl) {
      let pct = 0;
      const iv = setInterval(() => {
        pct = Math.min(pct + Math.random() * 8, 100);
        progressEl.style.width = `${pct}%`;
        if (pct >= 100) {
          clearInterval(iv);
          if (statusEl) {
            statusEl.className = statusEl.className.replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '');
            statusEl.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-900/50', 'dark:text-green-300');
            statusEl.textContent = 'Terminé';
          }
          pushNotification('Pipeline terminé avec succès !', 'success');
        }
      }, 500);
    }
  }

  function generateFakeLogs() {
    const entries = [
      '[INFO] Initialisation du pipeline...',
      '[INFO] Chargement des données: 12,450 échantillons',
      '[INFO] Preprocessing: normalisation, augmentation...',
      '[INFO] Epoch 1/100 — loss: 0.4512 — acc: 0.7834',
      '[INFO] Epoch 10/100 — loss: 0.2891 — acc: 0.8567',
      '[INFO] Epoch 25/100 — loss: 0.1923 — acc: 0.9012',
      '[WARNING] Validation loss a augmenté légèrement.',
      '[INFO] Epoch 50/100 — loss: 0.1254 — acc: 0.9345',
      '[INFO] Checkpoint sauvegardé: model_v2_ep50.pt',
      '[INFO] Epoch 75/100 — loss: 0.0987 — acc: 0.9512',
      '[INFO] Epoch 100/100 — loss: 0.0812 — acc: 0.9634',
      '[INFO] Évaluation finale: F1=0.9589, Précision=0.9623',
      '[SUCCESS] Pipeline terminé. Durée: 2h 14m 08s',
    ];
    return entries.map(e => `<p class="${e.startsWith('[WARNING]')?'text-yellow-400':e.startsWith('[SUCCESS]')?'text-green-300':''}">${e}</p>`).join('');
  }

  // ── Filtres temporels ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const p = btn.querySelector('p') || btn;
    const text = p.textContent.trim();
    if (['7j','30j','90j','Personnalisée'].some(t => text.includes(t))) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('button').forEach(b => {
          if (['7j','30j','90j','Personnalisée'].some(t => (b.querySelector('p')||b).textContent.includes(t))) {
            b.classList.remove('bg-brand-primary', 'text-white');
          }
        });
        btn.classList.add('bg-brand-primary', 'text-white');
        pushNotification(`Période sélectionnée : ${text}`, 'info');
      });
    }
  });

});
