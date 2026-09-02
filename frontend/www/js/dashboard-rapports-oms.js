/**
 * dashboard-rapports-oms.js — Tableau de bord Rapports OMS avec analytics Chart.js
 */
document.addEventListener('DOMContentLoaded', async () => {
  let captures = [], sites = [], mapData = { sites: [], statistiques: {} };
  let omsReports = [], allReports = [], mergedReports = [];
  let activeFilter = 'all';

  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const setStat = (name, value) => { const n = document.querySelector(`[data-stat="${name}"]`); if (n) n.textContent = value; };
  const setOmsStat = (name, value) => { const n = document.querySelector(`[data-oms-stat="${name}"]`); if (n) n.textContent = value; };

  function renderEntoStats() {
    const confidence = captures.length ? captures.reduce((s, i) => s + (i.confidence_ia || i.confiance || 0), 0) / captures.length * 100 : 0;
    setOmsStat('individuals', captures.reduce((s, i) => s + (i.nombre_individus || 0), 0).toLocaleString('fr-FR'));
    setOmsStat('confidence', `${confidence.toFixed(1)}%`);
    setOmsStat('risk', mapData.statistiques?.sites_critiques ? 'Élevé' : captures.length ? 'Modéré' : 'Faible');
    setOmsStat('sites', mapData.statistiques?.sites_actifs ?? sites.filter(s => s.actif !== false).length);
  }

  function renderReportStats() {
    const total = mergedReports.length;
    setStat('total', total);
    setStat('soumis', mergedReports.filter(r => ['soumis', 'valide'].includes(r.statut)).length);
    setStat('brouillon', mergedReports.filter(r => ['brouillon', 'en_cours'].includes(r.statut)).length);
    setStat('planifies', mergedReports.filter(r => ['planifie', 'programme'].includes(r.statut)).length);
  }

  async function renderMap() {
    if (!window.EntomoMaps) return;
    const parRegion = await apiDashboard.capturesParRegion();
    await EntomoMaps.choropleth('oms-risk-map', parRegion);
  }

  async function renderTrend() {
    const evolution = await apiDashboard.densiteEvolution({ granularity: 'week', period: '3M' });
    if (evolution?.length && window.EntomoCharts) {
      EntomoCharts.line('oms-trend-chart', evolution.map(d => d.date), evolution.map(d => d.individus), { fill: true, labels: ['Individus'] });
    }
  }

  function renderCapturesTable() {
    const body = document.querySelector('[data-oms-captures]');
    if (!body) return;
    const siteById = new Map(sites.map(s => [s.id, s]));
    body.innerHTML = captures.length
      ? captures.slice(0, 50).map(item => `<tr class="border-b dark:border-gray-700"><td class="px-6 py-4"><a href="details-site.html?id=${item.site_id}">${escapeHtml(siteById.get(item.site_id)?.nom || `Site ${item.site_id}`)}</a></td><td class="px-6 py-4">${item.date_capture ? new Date(item.date_capture).toLocaleDateString('fr-FR') : '—'}</td><td class="px-6 py-4">${escapeHtml(item.espece_corrigee || item.espece || '—')}</td><td class="px-6 py-4">${item.nombre_individus || 0}</td><td class="px-6 py-4"><span class="rounded-full px-2 py-1 text-xs ${item.valide ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${item.valide ? 'Validé' : 'À valider'}</span></td></tr>`).join('')
      : '<tr><td colspan="5" class="p-10 text-center text-gray-500">Aucune capture.</td></tr>';
  }

  function renderReportsList() {
    const container = document.querySelector('[data-oms-reports]');
    if (!container) return;
    const filtered = activeFilter === 'all' ? mergedReports : mergedReports.filter(r => r.statut === activeFilter);
    container.innerHTML = filtered.length
      ? filtered.map(r => `<div class="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"><div><p class="font-medium">${escapeHtml(r.titre || r.nom || 'Rapport')}</p><p class="text-xs text-gray-500">${r.date_creation ? new Date(r.date_creation).toLocaleDateString('fr-FR') : ''}</p></div><span class="text-xs rounded-full px-2 py-1 ${r.statut === 'soumis' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}">${r.statut || '—'}</span></div>`).join('')
      : '<p class="text-center py-8 text-gray-500">Aucun rapport.</p>';
  }

  async function loadData() {
    try {
      [captures, sites, mapData, omsReports, allReports] = await Promise.all([
        apiCaptures.list({ limit: 500 }),
        apiSites.list({ limit: 200 }),
        apiCartography.data(),
        apiReports?.list?.({ type: 'oms' }) || [],
        apiReports?.list?.() || [],
      ]);
      mergedReports = [...(omsReports || []), ...(allReports || [])];
      renderEntoStats();
      renderReportStats();
      renderCapturesTable();
      renderReportsList();
      await Promise.all([renderMap(), renderTrend()]);
      const parEspece = await apiDashboard.capturesParEspece();
      if (parEspece?.length) EntomoCharts?.doughnut('oms-espece-chart', parEspece.map(d => d.espece), parEspece.map(d => d.count));
    } catch (err) { console.warn('[oms]', err); }
  }

  document.querySelectorAll('[data-oms-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.omsFilter || 'all';
      document.querySelectorAll('[data-oms-filter]').forEach(b => b.classList.remove('bg-brand-primary', 'text-white'));
      btn.classList.add('bg-brand-primary', 'text-white');
      renderReportsList();
    });
  });

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Exporter') && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        try { await apiCaptures.export('csv'); pushNotification('Export OK.', 'success'); }
        catch { pushNotification('Erreur export.', 'error'); }
      });
    }
  });

  await loadData();
  setInterval(loadData, 120000);
});
