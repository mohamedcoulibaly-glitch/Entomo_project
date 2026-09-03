/**
 * dashboard-entomo-region5.js — Tableau de bord Région Médicale 5 (sud-est Sénégal)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const REGION = 'region 5';
  const params = () => ({ region: REGION, period: '3M' });

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

  await Promise.all([loadRegionStats(), loadCharts()]);
  setInterval(() => Promise.all([loadRegionStats(), loadCharts()]), 90000);
});
