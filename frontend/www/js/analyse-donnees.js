/**
 * analyse-donnees.js — Module analytics chercheur (graphiques Chart.js + cartes)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const escapeHtml = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  let analysisRows = [], currentPage = 1, searchTimer;
  const siteNames = new Map();
  const pageSize = 10;

  // Onglets via ancres #stats, #donnees, #graphiques
  const tabLinks = document.querySelectorAll('a[href^="#"]');
  const panels = { stats: '#panel-stats', donnees: '#panel-donnees', graphiques: '#panel-graphiques' };
  tabLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      const hash = link.getAttribute('href')?.slice(1);
      if (!hash || !panels[hash]) return;
      e.preventDefault();
      tabLinks.forEach(l => l.classList.remove('border-brand-primary', 'text-brand-primary', 'font-bold'));
      link.classList.add('border-brand-primary', 'text-brand-primary', 'font-bold');
      Object.values(panels).forEach(sel => document.querySelector(sel)?.classList.add('hidden'));
      document.querySelector(panels[hash])?.classList.remove('hidden');
      if (hash === 'stats') await loadStatsTab();
      if (hash === 'graphiques') await loadChartTab();
    });
  });

  await loadSites();
  await loadStats();
  await loadFilteredData();
  await loadChartTab();

  document.querySelectorAll('#analysis-site, #analysis-status, #analysis-date-start, #analysis-date-end').forEach(el => {
    el.addEventListener('change', () => { loadFilteredData(); loadChartTab(true); });
  });
  document.getElementById('analysis-search')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { loadFilteredData(); loadChartTab(true); }, 300);
  });
  document.getElementById('analysis-reset')?.addEventListener('click', async () => {
    ['analysis-site', 'analysis-status', 'analysis-date-start', 'analysis-date-end', 'analysis-search'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    await loadFilteredData();
    await loadChartTab(true);
  });

  function getFilterParams(limit = 200) {
    const params = { limit };
    const site = document.getElementById('analysis-site')?.value;
    const statut = document.getElementById('analysis-status')?.value;
    const date_debut = document.getElementById('analysis-date-start')?.value;
    const date_fin = document.getElementById('analysis-date-end')?.value;
    const search = document.getElementById('analysis-search')?.value?.trim();
    if (site) params.site_id = site;
    if (statut) params.statut = statut;
    if (date_debut) params.date_debut = date_debut;
    if (date_fin) params.date_fin = date_fin;
    if (search) params.search = search;
    return params;
  }

  function dashboardParams() {
    const p = {};
    const site = document.getElementById('analysis-site')?.value;
    const statut = document.getElementById('analysis-status')?.value;
    const date_debut = document.getElementById('analysis-date-start')?.value;
    const date_fin = document.getElementById('analysis-date-end')?.value;
    if (statut) p.statut = statut;
    if (date_debut) p.date_debut = date_debut;
    if (date_fin) p.date_fin = date_fin;
    return p;
  }

  async function loadSites() {
    const sites = await apiSites.list({ limit: 500 }) || [];
    const select = document.getElementById('analysis-site');
    sites.forEach(s => siteNames.set(Number(s.id), s.nom));
    if (select) select.insertAdjacentHTML('beforeend', sites.map(s =>
      `<option value="${s.id}">${escapeHtml(s.nom)}${s.region ? ` — ${escapeHtml(s.region)}` : ''}</option>`).join(''));
  }

  async function loadStats() {
    try {
      const stats = await apiDashboard.stats(dashboardParams());
      const values = {
        specimens: stats.captures?.total ?? 0,
        precision: stats.modeles?.deployes ? `${stats.modeles.deployes} mod.` : '—',
        collectes: stats.captures?.validees ?? 0,
        zones: stats.sites?.actifs ?? 0,
      };
      Object.entries(values).forEach(([key, val]) => {
        const el = document.querySelector(`[data-analysis-stat="${key}"]`);
        if (el) el.textContent = val;
      });
    } catch { /* silencieux */ }
  }

  async function loadFilteredData() {
    try {
      analysisRows = await apiCaptures.list(getFilterParams(500)) || [];
      currentPage = 1;
      renderAnalysisPage();
    } catch { pushNotification('Erreur filtrage.', 'error'); }
  }

  function renderAnalysisPage() {
    const tbody = document.querySelector('#analysis-raw tbody');
    if (!tbody) return;
    const start = (currentPage - 1) * pageSize;
    const pageRows = analysisRows.slice(start, start + pageSize);
    tbody.innerHTML = pageRows.length ? pageRows.map(c => `<tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td class="px-4 py-3 text-sm">SPN-${String(c.id).padStart(5, '0')}</td>
      <td class="px-4 py-3 text-sm">${c.date_capture ? new Date(c.date_capture).toLocaleDateString('fr-FR') : '—'}</td>
      <td class="px-4 py-3 text-sm">${escapeHtml(siteNames.get(c.site_id) || '—')}</td>
      <td class="px-4 py-3 text-sm">${c.espece_detectee || c.espece || '—'}</td>
      <td class="px-4 py-3 text-sm">${c.methode_capture || '—'}</td>
      <td class="px-4 py-3 text-sm">${c.confiance != null ? `${Math.round(c.confiance * 100)}%` : '—'}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="text-center py-10 text-gray-400">Aucune donnée</td></tr>';
  }

  async function loadStatsTab() {
    const el = document.querySelector('[data-tab-panel="stats"]');
    if (!el) return;
    try {
      const stats = await apiDashboard.stats(dashboardParams());
      const fields = {
        'total-captures': stats.captures?.total,
        'sites-actifs': stats.sites?.actifs,
        'densite': stats.densite_moyenne,
        'espece': stats.espece_dominante,
      };
      Object.entries(fields).forEach(([k, v]) => {
        const s = el.querySelector(`[data-stat="${k}"]`);
        if (s && v != null) s.textContent = v;
      });
    } catch { /* silencieux */ }
  }

  async function loadChartTab(force = false) {
    const p = dashboardParams();
    try {
      const [parEspece, parRegion, parMethode, parStatut, evolution, heatmap] = await Promise.all([
        apiDashboard.capturesParEspece(p),
        apiDashboard.capturesParRegion(p),
        apiDashboard.capturesParMethode(p),
        apiDashboard.capturesParStatut(p),
        apiDashboard.densiteEvolution({ ...p, granularity: 'week' }),
        apiDashboard.heatmap(p),
      ]);
      if (parEspece?.length) EntomoCharts?.doughnut('chart-analysis-espece', parEspece.map(d => d.espece), parEspece.map(d => d.count));
      const regionLabels = (parRegion || []).map(d => d.region);
      const regionValues = (parRegion || []).map(d => d.count);
      if (regionLabels.length) EntomoCharts?.bar('chart-analysis-region', regionLabels, regionValues);
      await EntomoMaps?.choropleth('analysis-map', parRegion || []);
      if (parMethode?.length) EntomoCharts?.radar('chart-analysis-methode', parMethode.map(d => d.methode?.slice(0, 10)), parMethode.map(d => d.count));
      if (parStatut?.length) EntomoCharts?.doughnut('chart-analysis-statut', parStatut.map(d => d.statut), parStatut.map(d => d.count));
      if (evolution?.length) EntomoCharts?.multiLine('chart-analysis-evolution', evolution.map(d => d.date), { Captures: evolution.map(d => d.captures), Densité: evolution.map(d => d.densite) });
      if (heatmap?.length) EntomoMaps?.heatmapLayer('analysis-heatmap', heatmap);
    } catch (err) { console.warn('[analyse]', err); }
  }

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();
    if ((t.includes('Exporter') || t.includes('CSV') || t.includes('Excel')) && !btn.dataset.exportBound) {
      btn.dataset.exportBound = '1';
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const format = t.toLowerCase().includes('excel') ? 'xlsx' : 'csv';
          await apiCaptures.export(getFilterParams(), format);
          pushNotification(`Export ${format.toUpperCase()} OK.`, 'success');
        } catch { pushNotification('Erreur export.', 'error'); }
        buttonLoading(btn, false);
      });
    }
  });

  document.querySelector('[data-analysis-page="prev"]')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderAnalysisPage(); } });
  document.querySelector('[data-analysis-page="next"]')?.addEventListener('click', () => { if (currentPage * pageSize < analysisRows.length) { currentPage++; renderAnalysisPage(); } });
});
