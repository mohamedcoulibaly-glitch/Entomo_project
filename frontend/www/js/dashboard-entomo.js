/**
 * dashboard-entomo.js — Tableau de bord national Entomo (analytics complets)
 */
document.addEventListener('DOMContentLoaded', async () => {
  let currentFilters = { period: '1M' };

  const PERIOD_MAP = {
    'Semaine en cours': '1S', 'Mois en cours': '1M', 'Trimestre': '3M',
    'Année en cours': '1A', 'Personnalisée': null,
    '1S': '1S', '1M': '1M', '3M': '3M', '1A': '1A', 'Max': 'Max',
  };

  function buildParams() {
    const p = {};
    if (currentFilters.period) p.period = currentFilters.period;
    if (currentFilters.region && currentFilters.region !== 'Tout le pays') p.region = currentFilters.region;
    if (currentFilters.espece && currentFilters.espece !== 'Toutes') p.espece = currentFilters.espece;
    return p;
  }

  function animateNumber(el, from, to, decimals = 0) {
    if (window.EntomoCharts) return EntomoCharts.animateNumber(el, from, to, decimals);
    el.textContent = decimals > 0 ? Number(to).toFixed(decimals) : Math.round(to).toLocaleString('fr-FR');
  }

  async function loadDashboardStats() {
    try {
      const stats = await apiDashboard.stats(buildParams());
      if (!stats) { showOfflineMessage(); return; }
      hideOfflineMessage();

      const map = {
        'total-captures': stats.captures?.total,
        'sites-actifs': stats.sites?.actifs,
        'modeles-deployes': stats.modeles?.deployes,
        'utilisateurs': stats.utilisateurs?.actifs,
        'a-valider': stats.captures?.a_valider,
        'densite-moyenne': stats.densite_moyenne ?? stats.captures?.densite_moyenne,
        'alertes-actives': stats.alertes_actives,
        'espece-dominante': stats.espece_dominante,
        'couverture-irs': stats.couverture_irs,
      };
      Object.entries(map).forEach(([key, val]) => {
        if (val === undefined || val === null) return;
        const el = document.querySelector(`[data-stat="${key}"]`);
        if (!el) return;
        if (typeof val === 'number') {
          animateNumber(el, parseFloat(el.textContent) || 0, val, key === 'couverture-irs' ? 1 : 0);
        } else {
          el.textContent = val;
        }
      });

      if (stats.dhis2?.derniere_sync) {
        const syncEl = document.querySelector('[data-last-sync]');
        if (syncEl) syncEl.textContent = new Date(stats.dhis2.derniere_sync).toLocaleString('fr-FR');
      }
      if (stats.alertes?.length) renderAlertes(stats.alertes);
    } catch (err) {
      console.warn('[dashboard-entomo] stats error:', err);
      showOfflineMessage();
    }
  }

  async function loadCharts() {
    const params = buildParams();
    try {
      const [parEspece, parSite, evolution, parMethode, parRegion, heatmap] = await Promise.all([
        apiDashboard.capturesParEspece(params),
        apiDashboard.capturesParSite(params),
        apiDashboard.densiteEvolution({ ...params, granularity: 'week' }),
        apiDashboard.capturesParMethode(params),
        apiDashboard.capturesParRegion(params),
        apiDashboard.heatmap(params),
      ]);

      if (parEspece?.length && window.EntomoCharts) {
        EntomoCharts.doughnut('chart-espece',
          parEspece.map(d => d.espece), parEspece.map(d => d.count));
      }
      if (parSite?.length && window.EntomoCharts) {
        EntomoCharts.bar('chart-site',
          parSite.slice(0, 10).map(d => (d.site || '').slice(0, 15)),
          parSite.slice(0, 10).map(d => d.count), { horizontal: true });
      }
      if (evolution?.length && window.EntomoCharts) {
        EntomoCharts.multiLine('chart-evolution',
          evolution.map(d => d.date),
          { Captures: evolution.map(d => d.captures), Densité: evolution.map(d => d.densite) });
      }
      if (parMethode?.length && window.EntomoCharts) {
        EntomoCharts.radar('chart-methode',
          parMethode.map(d => (d.methode || '').slice(0, 12)),
          parMethode.map(d => d.count), { label: 'Méthodes' });
      }
      if (parRegion?.length && window.EntomoMaps) {
        await EntomoMaps.choropleth('carto-map-container', parRegion, {
          onRegionClick: (name) => {
            currentFilters.region = name;
            reloadAll();
            pushNotification(`Filtre région : ${name}`, 'info');
          },
        });
      }
      if (heatmap?.length && window.EntomoMaps && document.getElementById('heatmap-container')) {
        EntomoMaps.heatmapLayer('heatmap-container', heatmap);
      }
    } catch (err) {
      console.warn('[dashboard-entomo] charts error:', err);
    }
  }

  function renderAlertes(alertes) {
    const container = document.querySelector('[data-alertes-container]');
    if (!container) return;
    const niveauIcon = { critique: 'warning', eleve: 'error', modere: 'info' };
    const niveauColor = { critique: 'red', eleve: 'orange', modere: 'yellow' };
    container.innerHTML = alertes.slice(0, 5).map(a => {
      const color = niveauColor[a.niveau] || 'yellow';
      return `<div class="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 bg-${color}-50 dark:bg-${color}-900/10 border-l-2 border-${color}-500">
        <span class="material-symbols-outlined text-${color}-500 text-xl">${niveauIcon[a.niveau] || 'info'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[#111418] dark:text-white">${a.message || a.titre || 'Alerte'}</p>
          <p class="text-xs text-gray-500 mt-0.5">${a.localisation || ''} — ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</p>
        </div>
      </div>`;
    }).join('');
  }

  function showOfflineMessage() {
    const container = document.querySelector('[data-stats-container]');
    if (!container) return;
    let msg = container.querySelector('.offline-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'offline-msg col-span-full text-center py-8 text-gray-500';
      container.prepend(msg);
    }
    msg.innerHTML = '<span class="material-symbols-outlined text-3xl mb-2">cloud_off</span><p>Backend hors ligne.</p>';
  }

  function hideOfflineMessage() {
    document.querySelector('.offline-msg')?.remove();
  }

  async function reloadAll() {
    await Promise.all([loadDashboardStats(), loadCharts()]);
  }

  // Filtres période (boutons 1S/1M/3M/1A)
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('bg-brand-primary', 'text-white'));
      btn.classList.add('bg-brand-primary', 'text-white');
      currentFilters.period = btn.dataset.period;
      reloadAll();
    });
  });

  // Filtres dropdown
  const filterConfigs = {
    'Période': ['1S', '1M', '3M', '1A', 'Max'],
    'Localisation': ['Tout le pays'],
    'Espèce': ['Toutes'],
  };
  const regions = await loadReferenceData('regions');
  if (regions.length) filterConfigs['Localisation'].push(...regions.map(r => r.label));
  const especes = await loadReferenceData('especes');
  if (especes.length) filterConfigs['Espèce'].push(...especes.map(e => e.label));

  document.querySelectorAll('div.flex.gap-3.py-3 button').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.querySelector('p')?.textContent || '';
      const key = Object.keys(filterConfigs).find(k => text.startsWith(k));
      if (!key) return;
      showDropdown(btn, key, filterConfigs[key], val => {
        if (btn.querySelector('p')) btn.querySelector('p').textContent = `${key}: ${val}`;
        if (key === 'Localisation') currentFilters.region = val;
        else if (key === 'Espèce') currentFilters.espece = val;
        else if (key === 'Période') currentFilters.period = PERIOD_MAP[val] || val;
        reloadAll();
      });
    });
  });

  function showDropdown(anchor, title, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'filter-dd absolute z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border min-w-[200px] py-1 mt-1';
    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = 'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700';
      item.textContent = opt;
      item.addEventListener('click', () => { onSelect(opt); dd.remove(); });
      dd.appendChild(item);
    });
    anchor.style.position = 'relative';
    anchor.appendChild(dd);
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }), 100);
  }

  // Export CSV
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim().includes('Exporter')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          await apiCaptures.export('csv', buildParams());
          pushNotification('Export CSV téléchargé.', 'success');
        } catch {
          pushNotification("Erreur export.", 'error');
        } finally { buttonLoading(btn, false); }
      });
    }
  });

  await reloadAll();
  setInterval(reloadAll, 120000);
});
