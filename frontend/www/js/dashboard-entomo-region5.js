/**
 * dashboard-entomo-region5.js — Tableau de bord Région Médicale 5 (sud-est Sénégal)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const RM5_SOUS_REGIONS = ['Kédougou', 'Tambacounda', 'Kolda', 'Sédhiou', 'Ziguinchor'];
  const filters = { period: '3M', localisation: 'region 5', espece: '', environnement: '' };
  const params = () => ({
    region: filters.localisation,
    period: filters.period,
    espece: filters.espece || undefined,
    environnement: filters.environnement || undefined,
  });

  // Les 4 puces de filtre (Période/Localisation/Espèce/Environnement) n'avaient
  // aucun gestionnaire de clic — purement décoratives, params() était figé en
  // dur. Chaque puce ouvre maintenant un petit sélecteur et relance le chargement.
  function bindFilterButton(id, label, options, onSelect) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      openModal(label, `<select id="rm5-filter-value" class="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700">${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>`, {
        confirmLabel: 'Appliquer',
        onConfirm: () => {
          const select = document.getElementById('rm5-filter-value');
          const opt = options.find(o => o.value === select?.value);
          onSelect(select?.value || '');
          const p = btn.querySelector('p');
          if (p && opt) p.textContent = `${label}: ${opt.label}`;
          reloadAll();
        },
      });
    });
  }

  async function reloadAll() {
    await Promise.all([loadRegionStats(), loadCharts()]);
  }

  async function loadRegionStats() {
    try {
      const stats = await apiDashboard.stats(params());
      if (!stats) { showOffline(); return; }
      hideOffline();
      const r5 = stats.region5 || {};
      const map = {
        'densite-moyenne': r5.densite_moyenne ?? 0,
        'alertes-actives': r5.alertes_actives ?? 0,
        'espece-dominante': r5.espece_dominante ?? 'N/A',
        'couverture-irs': r5.couverture_irs ?? 0,
        'captures-total': r5.captures_total ?? 0,
        'sites-actifs': r5.sites_actifs ?? 0,
      };
      Object.entries(map).forEach(([key, val]) => {
        const el = document.querySelector(`[data-stat="${key}"]`);
        if (!el) return;
        if (typeof val === 'number') EntomoCharts?.animateNumber(el, parseFloat(el.textContent) || 0, val, key === 'couverture-irs' ? 1 : 0);
        else el.textContent = val;
      });
      const rm5Regions = ['kédougou', 'kedougou', 'tambacounda', 'kolda', 'sédhiou', 'sedhiou', 'ziguinchor'];
      renderAlertes((stats.alertes || []).filter(a =>
        rm5Regions.some(r => (a.localisation || '').toLowerCase().includes(r))
      ));
    } catch (err) { console.warn('[region5]', err); showOffline(); }
  }

  async function loadCharts() {
    const p = params();
    try {
      const [parEspece, parSite, evolution, parRegion, heatmap] = await Promise.all([
        apiDashboard.capturesParEspece(p),
        apiDashboard.capturesParSite(p),
        apiDashboard.densiteEvolution({ ...p, granularity: 'week' }),
        apiDashboard.capturesParRegion(p),
        apiDashboard.heatmap(p),
      ]);
      if (parEspece?.length) EntomoCharts?.doughnut('chart-espece', parEspece.map(d => d.espece), parEspece.map(d => d.count));
      if (parSite?.length) EntomoCharts?.bar('chart-site', parSite.map(d => d.site?.slice(0, 12)), parSite.map(d => d.count), { horizontal: true });
      if (evolution?.length) EntomoCharts?.multiLine('chart-evolution', evolution.map(d => d.date), { Densité: evolution.map(d => d.densite), Captures: evolution.map(d => d.captures) });
      if (window.EntomoMaps) await EntomoMaps.choropleth('region5-map', parRegion || [], {
        center: [13.8, -14.5],
        zoom: 7,
      });
      if (heatmap?.length && document.getElementById('region5-heatmap')) EntomoMaps?.heatmapLayer('region5-heatmap', heatmap);
    } catch (err) {
      console.warn('[region5] charts', err);
      if (window.EntomoMaps) await EntomoMaps.choropleth('region5-map', []);
    }
  }

  function renderAlertes(alertes) {
    const c = document.querySelector('[data-alertes-container]');
    if (!c) return;
    if (!alertes.length) { c.innerHTML = '<p class="text-center py-6 text-gray-400 text-sm">Aucune alerte RM5.</p>'; return; }
    c.innerHTML = alertes.map(a => `<div class="flex gap-3 p-3 rounded-lg border-l-4 ${a.niveau === 'critique' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'}">
      <span class="material-symbols-outlined">${a.niveau === 'critique' ? 'error' : 'warning'}</span>
      <div><p class="text-sm font-medium">${a.message}</p><p class="text-xs text-gray-500">${a.localisation}</p></div>
    </div>`).join('');
  }

  function showOffline() {
    const c = document.querySelector('[data-stats-container]');
    if (c && !c.querySelector('.offline-msg')) c.insertAdjacentHTML('afterbegin', '<div class="offline-msg col-span-full text-center py-8 text-gray-500">Backend hors ligne</div>');
  }
  function hideOffline() { document.querySelector('.offline-msg')?.remove(); }

  bindFilterButton('filter-periode', 'Période', [
    { value: '1S', label: '1 semaine' }, { value: '1M', label: '1 mois' },
    { value: '3M', label: '3 derniers mois' }, { value: '1A', label: '1 an' },
    { value: 'Max', label: 'Historique complet' },
  ], v => { filters.period = v || '3M'; });

  // Boutons rapides 1S/1M/3M/1A/Max sous "Évolution de la Densité des
  // Vecteurs" — distincts du filtre déroulant ci-dessus, mais doivent piloter
  // le même état de période (aucun gestionnaire n'était câblé jusqu'ici).
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => {
        b.classList.remove('bg-white', 'dark:bg-gray-600', 'text-brand-primary', 'shadow-sm');
        b.classList.add('text-gray-500', 'dark:text-gray-400');
      });
      btn.classList.remove('text-gray-500', 'dark:text-gray-400');
      btn.classList.add('bg-white', 'dark:bg-gray-600', 'text-brand-primary', 'shadow-sm');
      filters.period = btn.dataset.period;
      reloadAll();
    });
  });

  bindFilterButton('filter-localisation', 'Localisation', [
    { value: 'region 5', label: 'Toute la région' },
    ...RM5_SOUS_REGIONS.map(r => ({ value: r, label: r })),
  ], v => { filters.localisation = v || 'region 5'; });

  (async () => {
    const especes = await loadReferenceDataEnriched('especes');
    bindFilterButton('filter-espece', 'Espèce', [
      { value: '', label: 'Toutes' },
      ...especes.map(e => ({ value: e.label, label: e.label })),
    ], v => { filters.espece = v; });
  })();

  (async () => {
    const environnements = await loadReferenceDataEnriched('environnements');
    bindFilterButton('filter-environnement', 'Environnement', [
      { value: '', label: 'Tous' },
      ...environnements.map(e => ({ value: e.label, label: e.label })),
    ], v => { filters.environnement = v; });
  })();

  await reloadAll();
  setInterval(reloadAll, 90000);
});
