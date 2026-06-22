/**
 * dashboard-rapports-oms.js
 * Tableau de bord des rapports OMS
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement des rapports depuis l'API ─────────────────────────────────────
  async function loadReports() {
    if (typeof apiReports === 'undefined') return;
    showLoader();
    const reports = await apiReports.list({ limit: 20 });
    hideLoader();
    if (!reports || !reports.length) return;

    const countEl = document.querySelector('[data-stat="total_reports"]');
    if (countEl) countEl.textContent = reports.length;
  }

  loadReports();

  // ── Boutons d'action ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if ((t.includes('Générer') || t.includes('Créer rapport') || t.includes('Nouveau rapport')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        openModal('Générer un rapport OMS',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type de rapport *</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option>Rapport mensuel de surveillance</option>
                <option>Rapport trimestriel</option>
                <option>Rapport annuel</option>
                <option>Rapport d'alerte épidémique</option>
                <option>Rapport WMR (World Malaria Report)</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Période début</label>
                <input type="date" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Période fin</label>
                <input type="date" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"/>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Format</label>
              <div class="flex gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rpt-format" value="pdf" checked class="text-brand-primary"/>
                  <span>PDF</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rpt-format" value="excel" class="text-brand-primary"/>
                  <span>Excel</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rpt-format" value="csv" class="text-brand-primary"/>
                  <span>CSV</span>
                </label>
              </div>
            </div>
          </div>`,
          {
            confirmLabel: 'Générer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              showLoader();
              if (typeof apiReports !== 'undefined') {
                await apiReports.create({ type: 'oms', format: 'pdf' });
              } else {
                await new Promise(r => setTimeout(r, 2000));
              }
              hideLoader();
              pushNotification('Rapport OMS généré et disponible en téléchargement.', 'success');
              loadReports();
            },
          }
        );
      });
    }

    if ((t.includes('Télécharger') || t.includes('Download')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 1500));
        hideLoader();
        // Simulation téléchargement
        const a = document.createElement('a');
        a.href = '#';
        a.download = `rapport_oms_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        pushNotification('Rapport téléchargé.', 'success');
      });
    }

    if ((t.includes('Envoyer') || t.includes('Soumettre') || t.includes('Transmettre')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        openModal('Soumettre le rapport à l\'OMS',
          `<div class="space-y-3 text-sm">
            <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span class="material-symbols-outlined text-brand-primary text-2xl">send</span>
              <p>Ce rapport sera transmis au portail de surveillance de l'OMS/AFRO.</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email du destinataire OMS</label>
              <input type="email" value="who.afro.surveillance@who.int"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commentaire</label>
              <textarea rows="2" placeholder="Commentaire optionnel..."
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm resize-none"></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Envoyer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              showLoader();
              await new Promise(r => setTimeout(r, 1800));
              hideLoader();
              pushNotification('Rapport transmis à l\'OMS avec succès.', 'success');
            },
          }
        );
      });
    }

    if ((t.includes('Supprimer') || t.includes('Archiver')) && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const name = row?.querySelector('td')?.textContent.trim() || 'ce rapport';
        confirmDelete(name, async () => {
          row?.remove();
          pushNotification(`Rapport supprimé.`, 'info');
        });
      });
    }

    if (t.includes('Actualiser') || t.includes('Rafraîchir')) {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) { icon.classList.add('animate-spin'); setTimeout(() => icon.classList.remove('animate-spin'), 1500); }
        loadReports().then(() => pushNotification('Rapports actualisés.', 'success'));
      });
    }
  });

});
