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
    if (window.EntomoCharts) {
      const points = evolution || [];
      EntomoCharts.line('oms-trend-chart', points.map(d => d.date), points.map(d => d.individus), {
        fill: true,
        labels: ['Individus'],
        chartOptions: { plugins: { legend: { display: true } } },
      });
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
    // Le conteneur réel est la table #reports-list (6 colonnes), pas un
    // [data-oms-reports] qui n'existe nulle part dans le HTML — la liste ne
    // s'affichait donc jamais, quel que soit le filtre.
    const container = document.getElementById('reports-list');
    if (!container) return;
    // Les chips filtrent par TYPE de rapport (oms/entomo/personnalise), pas
    // par statut — data-filter-type dans le HTML, pas data-oms-filter.
    const filtered = activeFilter === 'all' ? mergedReports : mergedReports.filter(r => r.type === activeFilter);
    container.innerHTML = filtered.length
      ? filtered.map(r => `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">${escapeHtml(r.titre || r.nom || 'Rapport')}</td>
          <td class="px-6 py-4">${escapeHtml(r.type || '—')}</td>
          <td class="px-6 py-4">${r.date_creation || r.created_at ? new Date(r.date_creation || r.created_at).toLocaleDateString('fr-FR') : '—'}</td>
          <td class="px-6 py-4 uppercase">${escapeHtml(r.format_fichier || '—')}</td>
          <td class="px-6 py-4"><span class="rounded-full px-2 py-1 text-xs ${r.statut === 'soumis' || r.statut === 'valide' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">${escapeHtml(r.statut || '—')}</span></td>
          <td class="px-6 py-4 text-right">
            <a href="details-rapport.html?id=${r.id}" class="text-brand-primary hover:underline text-sm font-medium">Voir</a>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="text-center py-10 text-gray-400">Aucun rapport.</td></tr>';
  }

  async function loadData() {
    // Promise.allSettled plutôt que Promise.all : un rôle qui n'a par exemple
    // pas captures:voir (Analyste de Données avant correction du rôle) ne doit
    // pas empêcher l'affichage des rapports OMS eux-mêmes — chaque source de
    // données est indépendante et se dégrade proprement si elle échoue.
    const [capturesR, sitesR, mapDataR, omsReportsR, allReportsR] = await Promise.allSettled([
      apiCaptures.list({ limit: 500 }),
      apiSites.list({ limit: 200 }),
      apiCartography.data(),
      apiReports?.list?.({ type: 'oms' }) || [],
      apiReports?.list?.() || [],
    ]);
    captures = capturesR.value || [];
    sites = sitesR.value || [];
    mapData = mapDataR.value || { sites: [], statistiques: {} };
    omsReports = omsReportsR.value || [];
    allReports = allReportsR.value || [];
    mergedReports = [...(omsReports || []), ...(allReports || [])];

    try { renderEntoStats(); } catch (err) { console.warn('[oms] stats', err); }
    try { renderReportStats(); } catch (err) { console.warn('[oms] report-stats', err); }
    try { renderCapturesTable(); } catch (err) { console.warn('[oms] table', err); }
    try { renderReportsList(); } catch (err) { console.warn('[oms] reports-list', err); }
    try { await Promise.all([renderMap(), renderTrend()]); } catch (err) { console.warn('[oms] charts', err); }
    try {
      const parEspece = await apiDashboard.capturesParEspece();
      if (parEspece?.length) EntomoCharts?.doughnut('oms-espece-chart', parEspece.map(d => d.espece), parEspece.map(d => d.count));
    } catch (err) { console.warn('[oms] espece-chart', err); }
  }

  // Le bouton "Nouveau Rapport" n'avait aucun gestionnaire — il ne faisait
  // rien au clic. Renvoie vers le générateur de rapports dédié.
  document.getElementById('oms-generate-report')?.addEventListener('click', () => {
    window.location.href = 'generateur-rapports.html';
  });

  // Les puces de filtre portent data-filter-type dans le HTML (pas
  // data-oms-filter) — les gestionnaires ne s'attachaient donc jamais.
  document.querySelectorAll('[data-filter-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filterType || 'all';
      document.querySelectorAll('[data-filter-type]').forEach(b => {
        b.classList.remove('bg-brand-primary', 'text-white', 'border-brand-primary');
        b.classList.add('bg-white', 'dark:bg-gray-800', 'border-gray-200', 'dark:border-gray-700');
      });
      btn.classList.remove('bg-white', 'dark:bg-gray-800', 'border-gray-200', 'dark:border-gray-700');
      btn.classList.add('bg-brand-primary', 'text-white', 'border-brand-primary');
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
