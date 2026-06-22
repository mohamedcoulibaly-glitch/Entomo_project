/**
 * analyse-donnees.js
 * Page Analyse des Données — interactions et connexion API
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Onglets de visualisation ────────────────────────────────────────────────
  const tabBtns  = document.querySelectorAll('[role="tab"], .tab-btn, button[data-tab]');
  const tabPanels = document.querySelectorAll('[role="tabpanel"], .tab-panel, [data-tab-panel]');

  if (tabBtns.length) {
    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
          b.classList.remove('border-b-2', 'border-brand-primary', 'text-brand-primary', 'font-bold');
          b.classList.add('text-gray-500');
        });
        btn.classList.add('border-b-2', 'border-brand-primary', 'text-brand-primary', 'font-bold');
        btn.classList.remove('text-gray-500');
        tabPanels.forEach((p, j) => p.classList.toggle('hidden', j !== i));
      });
    });
  }

  // ── Filtre période ──────────────────────────────────────────────────────────
  document.querySelectorAll('select, input[type="date"]').forEach(el => {
    el.addEventListener('change', () => {
      pushNotification('Données filtrées.', 'info');
    });
  });

  // ── Boutons d'export ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();
    if (t.includes('Exporter') || t.includes('Télécharger') || t.includes('CSV') || t.includes('Excel')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 1200));
        hideLoader();
        // Simulation d'un téléchargement CSV
        const data = 'date,site,espece,quantite\n2024-06-15,Kédougou,An. gambiae,45';
        const blob = new Blob([data], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'analyse_donnees.csv';
        a.click();
        URL.revokeObjectURL(url);
        pushNotification('Export CSV téléchargé.', 'success');
      });
    }

    if (t.includes('Lancer') || t.includes('Analyser') || t.includes('Calculer')) {
      btn.addEventListener('click', async () => {
        showLoader();
        await new Promise(r => setTimeout(r, 1800));
        hideLoader();
        pushNotification('Analyse terminée.', 'success');
      });
    }

    if (t.includes('Rapport') || t.includes('Générer')) {
      btn.addEventListener('click', () => {
        window.location.href = 'generateur-rapports.html';
      });
    }
  });

  // ── Chargement des données depuis l'API ─────────────────────────────────────
  if (typeof apiCaptures !== 'undefined') {
    const captures = await apiCaptures.list({ limit: 200 });
    if (captures && captures.length) {
      // Mettre à jour les compteurs si présents
      const totalEl = document.querySelector('[data-stat="total"]');
      if (totalEl) totalEl.textContent = captures.length;
    }
  }

});
