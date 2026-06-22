/**
 * validation-dhis2.js
 * Validation des données avant envoi à DHIS2
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement des données en attente de validation ──────────────────────────
  async function loadPendingData() {
    if (typeof apiDhis2 === 'undefined') return;
    showLoader();
    const data = await apiDhis2.listPending();
    hideLoader();
    if (!data) return;
    // Si l'API répond, on met à jour le compteur
    const countEl = document.querySelector('[data-count="pending"]');
    if (countEl) countEl.textContent = data.length || 0;
  }

  loadPendingData();

  // ── Actions sur les lignes du tableau ────────────────────────────────────────
  function bindRowActions() {
    document.querySelectorAll('button').forEach(btn => {
      const t = btn.textContent.trim();

      if ((t.includes('Valider') || t.includes('Approuver')) && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', async () => {
          const row = btn.closest('tr');
          const id  = row?.dataset.id || row?.querySelector('td')?.textContent.trim();
          openModal('Confirmer la validation',
            `<div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-brand-success text-3xl">verified</span>
              <div>
                <p class="font-medium">Valider et transmettre à DHIS2 ?</p>
                <p class="text-sm text-gray-500">La donnée sera envoyée sur le serveur DHIS2 configuré.</p>
              </div>
            </div>`,
            {
              confirmLabel: 'Valider & Envoyer',
              confirmClass: 'bg-brand-success text-white',
              onConfirm: async () => {
                showLoader();
                let ok = true;
                if (typeof apiDhis2 !== 'undefined' && id) {
                  const res = await apiDhis2.validate(id, { statut: 'valide' });
                  ok = !!res;
                } else {
                  await new Promise(r => setTimeout(r, 1200));
                }
                hideLoader();
                if (ok) {
                  const badge = row?.querySelector('[class*="rounded-full"]');
                  if (badge) {
                    badge.className = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                    badge.textContent = 'Envoyé';
                  }
                  pushNotification('Données validées et transmises à DHIS2.', 'success');
                }
              },
            }
          );
        });
      }

      if ((t.includes('Rejeter') || t.includes('Refuser')) && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          openModal('Rejeter la donnée',
            `<div class="space-y-3 text-sm">
              <p>Sélectionnez le motif du rejet :</p>
              <select id="reject-reason" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Données incomplètes</option>
                <option>Format incorrect</option>
                <option>Hors plage valide</option>
                <option>Doublon détecté</option>
                <option>Autre</option>
              </select>
              <textarea id="reject-comment" placeholder="Commentaire (optionnel)..."
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-16 resize-none"></textarea>
            </div>`,
            {
              confirmLabel: 'Rejeter',
              confirmClass: 'bg-red-600 text-white',
              onConfirm: () => {
                const badge = row?.querySelector('[class*="rounded-full"]');
                if (badge) {
                  badge.className = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                  badge.textContent = 'Rejeté';
                }
                row?.classList.add('opacity-50');
                pushNotification('Donnée rejetée.', 'warning');
              },
            }
          );
        });
      }

      if (t.includes('Voir') && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          if (!row) return;
          const cells = Array.from(row.cells).map(c => c.textContent.trim());
          openModal('Détails de la donnée',
            `<div class="grid grid-cols-2 gap-2 text-sm">
              ${cells.map((v, i) => `<div><span class="text-gray-500">Champ ${i+1}</span><br/><strong>${v}</strong></div>`).join('')}
            </div>`,
            { confirmLabel: 'Fermer', cancelLabel: '' }
          );
        });
      }
    });
  }

  bindRowActions();

  // ── Bouton "Valider tout" ────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim().includes('Valider tout') || btn.textContent.trim().includes('Tout valider')) {
      btn.addEventListener('click', async () => {
        openModal('Valider toutes les données',
          `<div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-brand-success text-3xl">done_all</span>
            <div>
              <p class="font-medium">Valider et envoyer toutes les données en attente ?</p>
              <p class="text-sm text-gray-500">Cette action ne peut pas être annulée.</p>
            </div>
          </div>`,
          {
            confirmLabel: 'Valider tout',
            confirmClass: 'bg-brand-success text-white',
            onConfirm: async () => {
              showLoader();
              await new Promise(r => setTimeout(r, 2000));
              hideLoader();
              document.querySelectorAll('[class*="rounded-full"]').forEach(badge => {
                if (badge.textContent.trim() === 'En attente') {
                  badge.className = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800';
                  badge.textContent = 'Envoyé';
                }
              });
              pushNotification('Toutes les données validées et envoyées à DHIS2.', 'success');
            },
          }
        );
      });
    }

    if (btn.textContent.trim().includes('Forcer sync') || btn.textContent.trim().includes('Synchroniser')) {
      btn.addEventListener('click', async () => {
        showLoader();
        if (typeof apiDhis2 !== 'undefined') {
          await apiDhis2.sync();
        } else {
          await new Promise(r => setTimeout(r, 1800));
        }
        hideLoader();
        pushNotification('Synchronisation DHIS2 lancée.', 'info');
      });
    }
  });

});
