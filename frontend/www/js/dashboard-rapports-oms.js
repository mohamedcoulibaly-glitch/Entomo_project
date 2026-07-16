/**
 * dashboard-rapports-oms.js
 * Tableau de bord Rapports OMS — dynamique
 * Charge les rapports OMS + généraux, affiche les stats, la liste, et les indicateurs ento.
 */
document.addEventListener('DOMContentLoaded', async () => {
  let captures = [];
  let sites = [];
  let mapData = { sites: [], statistiques: {} };
  let omsReports = [];
  let allReports = [];
  let mergedReports = [];
  let activeFilter = 'all';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  const setStat = (name, value) => {
    const node = document.querySelector(`[data-stat="${name}"]`);
    if (node) node.textContent = value;
  };

  const setOmsStat = (name, value) => {
    const node = document.querySelector(`[data-oms-stat="${name}"]`);
    if (node) node.textContent = value;
  };

  // ─── Render entomological stats (from captures data) ──────────────────────
  function renderEntoStats() {
    const confidence = captures.length
      ? captures.reduce((sum, item) => sum + (item.confidence_ia || item.confiance || 0), 0) / captures.length * 100
      : 0;
    const critical = mapData.statistiques?.sites_critiques || 0;
    setOmsStat('individuals', captures.reduce((sum, item) => sum + (item.nombre_individus || 0), 0).toLocaleString('fr-FR'));
    setOmsStat('confidence', `${confidence.toFixed(1)}%`);
    setOmsStat('risk', critical ? 'Élevé' : captures.length ? 'Modéré' : 'Faible');
    setOmsStat('sites', mapData.statistiques?.sites_actifs ?? sites.filter(site => site.actif !== false).length);
  }

  // ─── Render report stats (from merged reports) ────────────────────────────
  function renderReportStats() {
    const total = mergedReports.length;
    const soumis = mergedReports.filter(r => r.statut === 'soumis' || r.statut === 'valide').length;
    const brouillon = mergedReports.filter(r => r.statut === 'brouillon' || r.statut === 'en_cours').length;
    const planifies = mergedReports.filter(r => r.statut === 'planifie' || r.statut === 'programme').length;
    setStat('total', total);
    setStat('soumis', soumis);
    setStat('brouillon', brouillon);
    setStat('planifies', planifies);
  }

  // ─── Render map ───────────────────────────────────────────────────────────
  function renderMap() {
    const root = document.getElementById('oms-risk-map');
    if (!root) return;
    root.innerHTML = `<div class="absolute inset-0 bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50 dark:from-slate-900 dark:to-emerald-950"><div class="absolute inset-8 rounded-[45%] border-2 border-emerald-300/50 bg-emerald-100/40 dark:bg-emerald-950/30"></div></div>${(mapData.sites || []).map((site, index) => `<a title="${escapeHtml(site.nom)} : risque ${Math.round(site.risque * 100)}%" href="details-site.html?id=${site.id}" class="absolute flex size-8 items-center justify-center rounded-full text-xs font-bold text-white shadow transition hover:scale-125 ${site.niveau_risque === 'critique' ? 'bg-red-600' : site.niveau_risque === 'vigilance' ? 'bg-amber-500' : 'bg-emerald-600'}" style="left:${12 + (index * 29) % 76}%;top:${12 + (index * 19) % 72}%">${site.captures}</a>`).join('')}<div class="absolute bottom-3 left-3 rounded bg-white/90 dark:bg-slate-900/90 p-2 text-xs">${mapData.sites?.length || 0} sites calculés depuis la base</div>`;
  }

  // ─── Render trend chart ───────────────────────────────────────────────────
  function renderTrend() {
    const root = document.getElementById('oms-trend-chart');
    if (!root) return;
    const buckets = Array.from({ length: 10 }, () => 0);
    captures.forEach(item => {
      const date = new Date(item.date_capture);
      const index = Number.isNaN(date.getTime()) ? 0 : Math.abs(date.getDate()) % buckets.length;
      buckets[index] += item.nombre_individus || 1;
    });
    const max = Math.max(...buckets, 1);
    root.innerHTML = buckets.map((value, index) => `<div class="flex flex-1 h-full flex-col justify-end items-center gap-2"><span class="text-[10px] font-semibold">${value}</span><div class="w-full max-w-8 rounded-t bg-primary transition-all duration-700" style="height:${Math.max(3, value / max * 85)}%"></div><span class="text-[10px] text-gray-500">J${index + 1}</span></div>`).join('');
  }

  // ─── Render captures table ────────────────────────────────────────────────
  function renderCapturesTable() {
    const body = document.querySelector('[data-oms-captures]');
    if (!body) return;
    const siteById = new Map(sites.map(site => [site.id, site]));
    body.innerHTML = captures.length
      ? captures.slice(0, 50).map(item => `<tr class="bg-white dark:bg-gray-800 border-b dark:border-gray-700"><td class="px-6 py-4 font-medium text-gray-900 dark:text-white"><a class="hover:text-primary" href="details-site.html?id=${item.site_id}">${escapeHtml(siteById.get(item.site_id)?.nom || `Site ${item.site_id}`)}</a></td><td class="px-6 py-4">${item.date_capture ? new Date(item.date_capture).toLocaleDateString('fr-FR') : '—'}</td><td class="px-6 py-4">${escapeHtml(item.espece_corrigee || item.espece || 'Non identifié')}</td><td class="px-6 py-4">${item.nombre_individus || 0}</td><td class="px-6 py-4"><span class="rounded-full px-2 py-1 text-xs ${item.valide ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${item.valide ? 'Validé' : 'À valider'}</span></td></tr>`).join('')
      : '<tr><td colspan="5" class="p-10 text-center text-gray-500">Aucune capture disponible.</td></tr>';
  }

  // ─── Render reports list ──────────────────────────────────────────────────
  function renderReportsList() {
    const tbody = document.getElementById('reports-list');
    if (!tbody) return;

    const filtered = activeFilter === 'all'
      ? mergedReports
      : mergedReports.filter(r => r.type === activeFilter);

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">inbox</span>
        ${mergedReports.length ? 'Aucun rapport pour ce filtre.' : 'Aucun rapport disponible.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(report => {
      const date = report.date_generation || report.created_at;
      const dateStr = date ? new Date(date).toLocaleDateString('fr-FR') : '—';
      const typeLabel = {
        oms: 'OMS',
        entomo: 'Entomologique',
        personnalise: 'Personnalisé',
        synthese: 'Synthèse',
      }[report.type] || (report.type || '—');
      const formatLabel = (report.format_fichier || 'pdf').toUpperCase();
      const statutLabel = {
        brouillon: 'Brouillon',
        en_cours: 'En cours',
        soumis: 'Soumis',
        valide: 'Validé',
        planifie: 'Planifié',
        programme: 'Programmé',
      }[report.statut] || (report.statut || '—');
      const statutClass = {
        brouillon: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        en_cours: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200',
        soumis: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
        valide: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
        planifie: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
        programme: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
      }[report.statut] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

      return `<tr class="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
        <td class="px-6 py-4">
          <a href="details-rapport.html?id=${report.id}" class="font-medium text-gray-900 dark:text-white hover:text-primary">${escapeHtml(report.titre)}</a>
        </td>
        <td class="px-6 py-4">${escapeHtml(typeLabel)}</td>
        <td class="px-6 py-4">${dateStr}</td>
        <td class="px-6 py-4"><span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">${escapeHtml(formatLabel)}</span></td>
        <td class="px-6 py-4"><span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statutClass}">${escapeHtml(statutLabel)}</span></td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <button data-view-report="${report.id}" class="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Voir">
              <span class="material-symbols-outlined text-base">visibility</span>
            </button>
            ${report.chemin_fichier ? `<button data-download-report="${report.id}" class="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Télécharger">
              <span class="material-symbols-outlined text-base">download</span>
            </button>` : ''}
            <button data-delete-report="${report.id}" class="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Bind report actions
    tbody.querySelectorAll('[data-view-report]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.viewReport;
        window.location.href = `details-rapport.html?id=${id}`;
      });
    });

    tbody.querySelectorAll('[data-download-report]').forEach(btn => {
      btn.addEventListener('click', () => {
        const report = mergedReports.find(r => r.id === Number(btn.dataset.downloadReport));
        const url = apiReports.fileUrl(report);
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.download = '';
          link.click();
        }
      });
    });

    tbody.querySelectorAll('[data-delete-report]').forEach(btn => {
      btn.addEventListener('click', () => {
        const report = mergedReports.find(r => r.id === Number(btn.dataset.deleteReport));
        confirmDelete(report?.titre || 'ce rapport', async () => {
          await apiReports.delete(report.id);
          pushNotification('Rapport supprimé.', 'success');
          mergedReports = mergedReports.filter(r => r.id !== report.id);
          renderReportStats();
          renderReportsList();
        });
      });
    });
  }

  // ─── Merge and deduplicate reports ────────────────────────────────────────
  function mergeReports(oms, general) {
    const map = new Map();
    if (Array.isArray(general)) {
      general.forEach(r => map.set(r.id, r));
    }
    if (Array.isArray(oms)) {
      oms.forEach(r => map.set(r.id, r));
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = new Date(a.date_generation || a.created_at || 0);
      const db = new Date(b.date_generation || b.created_at || 0);
      return db - da;
    });
  }

  // ─── Bind filter chips ────────────────────────────────────────────────────
  function initFilters() {
    const container = document.getElementById('report-type-filters');
    if (!container) return;
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filterType;
        container.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('bg-brand-primary', 'text-white', 'border-brand-primary');
          c.classList.add('bg-white', 'dark:bg-gray-800', 'border-gray-200', 'dark:border-gray-700');
        });
        chip.classList.remove('bg-white', 'dark:bg-gray-800', 'border-gray-200', 'dark:border-gray-700');
        chip.classList.add('bg-brand-primary', 'text-white', 'border-brand-primary');
        renderReportsList();
      });
    });
  }

  // ─── Bind header button ───────────────────────────────────────────────────
  document.getElementById('oms-generate-report')?.addEventListener('click', () => {
    window.location.href = 'generateur-rapports.html';
  });

  // ─── Bind CSV export ──────────────────────────────────────────────────────
  document.getElementById('oms-export-csv')?.addEventListener('click', () => {
    const siteById = new Map(sites.map(site => [site.id, site]));
    const rows = [
      ['Site', 'Date', 'Espèce', 'Nombre', 'Statut'],
      ...captures.map(item => [
        siteById.get(item.site_id)?.nom || item.site_id,
        item.date_capture || '',
        item.espece_corrigee || item.espece || '',
        item.nombre_individus || 0,
        item.valide ? 'Validé' : 'À valider',
      ]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `donnees-oms-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    pushNotification('Données OMS exportées.', 'success');
  });

  // ─── Load all data ────────────────────────────────────────────────────────
  try {
    const [capturesResult, sitesResult, mapResult, omsResult, generalResult] = await Promise.all([
      apiCaptures.list({ limit: 500 }),
      apiSites.list({ limit: 500 }),
      apiCartography.data(),
      apiReports.list({ type: 'oms' }).catch(() => []),
      apiReports.list().catch(() => []),
    ]);

    captures = Array.isArray(capturesResult) ? capturesResult : [];
    sites = Array.isArray(sitesResult) ? sitesResult : [];
    mapData = mapResult || { sites: [], statistiques: {} };
    omsReports = Array.isArray(omsResult) ? omsResult : [];
    allReports = Array.isArray(generalResult) ? generalResult : [];
    mergedReports = mergeReports(omsReports, allReports);

    renderEntoStats();
    renderReportStats();
    renderMap();
    renderTrend();
    renderCapturesTable();
    renderReportsList();
    initFilters();
  } catch (error) {
    pushNotification('Impossible de charger le tableau de bord OMS.', 'error');
  }
});
