document.addEventListener('DOMContentLoaded', async () => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
  let analysisRows = [];
  let currentPage = 1;
  let searchTimer;
  const siteNames = new Map();
  const pageSize = 10;
  const tabBtns = document.querySelectorAll('[role="tab"], .tab-btn, button[data-tab]');
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
        if (i === 0) loadStatsTab();
        if (i === 1) loadDataTab();
        if (i === 2) loadChartTab();
      });
    });
  }

  await loadSites();
  await loadStats();
  await loadFilteredData();
  await loadChartTab();

  document.querySelectorAll('#analysis-site, #analysis-status, #analysis-date-start, #analysis-date-end').forEach(el => {
    el.addEventListener('change', async () => {
      await loadFilteredData();
    });
  });

  document.getElementById('analysis-search')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadFilteredData, 250);
  });
  document.getElementById('analysis-reset')?.addEventListener('click', async () => {
    ['analysis-site', 'analysis-status', 'analysis-date-start', 'analysis-date-end', 'analysis-search'].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = '';
    });
    await loadFilteredData();
  });

  function getFilterParams(limit = 200) {
    const params = { limit };
    const values = {
      site_id: document.getElementById('analysis-site')?.value,
      statut: document.getElementById('analysis-status')?.value,
      date_debut: document.getElementById('analysis-date-start')?.value,
      date_fin: document.getElementById('analysis-date-end')?.value,
      search: document.getElementById('analysis-search')?.value.trim(),
    };
    Object.entries(values).forEach(([key, value]) => { if (value) params[key] = value; });
    return params;
  }

  async function loadSites() {
    const sites = await apiSites.list({ limit: 500 }) || [];
    const select = document.getElementById('analysis-site');
    sites.forEach(site => siteNames.set(Number(site.id), site.nom));
    if (select) select.insertAdjacentHTML('beforeend', sites.map(site => `<option value="${site.id}">${escapeHtml(site.nom)}${site.region ? ` — ${escapeHtml(site.region)}` : ''}</option>`).join(''));
  }

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();
    if (t.includes('Exporter') || t.includes('Télécharger') || t.includes('CSV') || t.includes('Excel')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const captures = await apiCaptures.list(getFilterParams(10000));
          if (captures && captures.length) {
            const columns = ['id', 'date_capture', 'site_id', 'espece', 'nombre_individus', 'methode_capture', 'statut', 'confiance'];
            const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
            const headers = columns.join(',');
            const rows = captures.map(c => columns.map(column => quote(c[column])).join(','));
            const csv = [headers, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'analyse_donnees.csv';
            a.click();
            URL.revokeObjectURL(url);
            pushNotification('Export CSV téléchargé.', 'success');
          } else {
            pushNotification('Aucune donnée à exporter.', 'warning');
          }
        } catch (err) { pushNotification('Erreur lors de l\'export.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Lancer') || t.includes('Analyser') || t.includes('Calculer')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const captures = await apiCaptures.list(getFilterParams(500));
          if (captures && captures.length) {
            const total = captures.length;
            const parEspece = {};
            captures.forEach(c => {
              const espece = c.espece_detectee || c.espece || 'Non classifié';
              parEspece[espece] = (parEspece[espece] || 0) + 1;
            });
            const message = `Analyse terminée : ${total} captures, ${Object.keys(parEspece).length} espèces détectées.`;
            pushNotification(message, 'success');
            const resultEl = document.querySelector('[data-analysis-result]');
            if (resultEl) {
              resultEl.innerHTML = `<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm"><strong>${total}</strong> captures · <strong>${Object.keys(parEspece).length}</strong> espèces</div>`;
            }
          } else {
            pushNotification('Analyse terminée — aucune donnée trouvée.', 'info');
          }
        } catch (err) { pushNotification('Erreur lors de l\'analyse.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Rapport') || t.includes('Générer')) {
      btn.addEventListener('click', () => {
        window.location.href = 'generateur-rapports.html';
      });
    }
  });

  async function loadStats() {
    showLoader();
    try {
      const captures = await apiCaptures.list({ limit: 200 });
      hideLoader();
      if (!captures) return;
      const confidenceValues = captures.map(item => Number(item.confiance ?? item.confidence_ia)).filter(Number.isFinite);
      const averageConfidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0;
      const values = {
        specimens: captures.reduce((sum, item) => sum + Number(item.nombre_individus || 1), 0),
        precision: `${Math.round(averageConfidence * 100)}%`,
        collectes: new Set(captures.map(item => item.date_capture?.slice(0, 10)).filter(Boolean)).size,
        zones: new Set(captures.map(item => item.site_id).filter(Boolean)).size,
      };
      Object.entries(values).forEach(([key, value]) => {
        const element = document.querySelector(`[data-analysis-stat="${key}"]`);
        if (element) element.textContent = value;
      });
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des statistiques.', 'error');
    }
  }

  async function loadFilteredData() {
    showLoader();
    try {
      const captures = await apiCaptures.list(getFilterParams(200));
      hideLoader();
      analysisRows = Array.isArray(captures) ? captures : [];
      currentPage = 1;
      renderAnalysisPage();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du filtrage des données.', 'error');
    }
  }

  function renderAnalysisPage() {
      const tableBody = document.querySelector('#analysis-raw tbody');
      if (tableBody) {
        const start = (currentPage - 1) * pageSize;
        const pageRows = analysisRows.slice(start, start + pageSize);
        tableBody.innerHTML = pageRows.length ? pageRows.map(c => `
          <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="px-4 py-3 text-sm">SPN-${String(c.id || 0).padStart(5, '0')}</td>
            <td class="px-4 py-3 text-sm">${c.date_capture ? new Date(c.date_capture).toLocaleDateString('fr-FR') : '—'}</td>
            <td class="px-4 py-3 text-sm">${escapeHtml(siteNames.get(Number(c.site_id)) || `Site #${c.site_id || '—'}`)}</td>
            <td class="px-4 py-3 text-sm">${c.espece_detectee || c.espece || '—'}</td>
            <td class="px-4 py-3 text-sm">${c.methode_capture || '—'}</td>
            <td class="px-4 py-3 text-sm">${c.confiance != null ? `${Math.round(c.confiance * 100)}%` : '—'}</td>
          </tr>`).join('') : '<tr><td colspan="6" class="text-center py-10 text-gray-400">Aucune donnée trouvée</td></tr>';
        const totalPages = Math.max(1, Math.ceil(analysisRows.length / pageSize));
        const info = document.querySelector('#analysis-raw nav > span');
        if (info) info.textContent = `Affichage ${analysisRows.length ? start + 1 : 0}-${Math.min(start + pageSize, analysisRows.length)} sur ${analysisRows.length}`;
        document.querySelector('[data-analysis-page="prev"]')?.toggleAttribute('disabled', currentPage === 1);
        document.querySelector('[data-analysis-page="next"]')?.toggleAttribute('disabled', currentPage === totalPages);
      }
  }

  async function loadStatsTab() {
    const el = document.querySelector('[data-tab-panel="stats"], [role="tabpanel"]');
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = '1';
    try {
      const stats = await apiDashboard.stats();
      if (stats && el) {
        Object.entries(stats).forEach(([key, val]) => {
          const statEl = el.querySelector(`[data-stat="${key}"]`);
          if (statEl) statEl.textContent = val ?? '—';
        });
      }
    } catch (err) { /* silencieux */ }
  }

  async function loadDataTab() {
    await loadFilteredData();
  }

  async function loadChartTab() {
    const el = document.getElementById('analysis-charts');
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = '1';
    try {
      const parEspece = await apiDashboard.capturesParEspece();
      if (parEspece && el) {
        const chartEl = el.querySelector('[data-chart]');
        if (chartEl) {
          const maximum = Math.max(1, ...parEspece.map(item => item.count));
          chartEl.innerHTML = `<div class="w-full">${parEspece.map(item =>
            `<div class="flex items-center gap-2 mb-3"><span class="text-xs w-32 text-gray-600 dark:text-gray-400">${item.espece || 'Non classifié'}</span><div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div class="h-full bg-brand-primary rounded-full" style="width:${Math.round(item.count / maximum * 100)}%"></div></div><span class="text-xs font-bold w-8 text-right">${item.count}</span></div>`
          ).join('')}</div>`;
        }
      }
      const parSite = await apiDashboard.capturesParSite();
      const siteChart = document.getElementById('analysis-sites-chart');
      if (siteChart && parSite) {
        const maximum = Math.max(1, ...parSite.map(item => item.count));
        siteChart.innerHTML = `<div class="w-full">${parSite.slice(0, 8).map(item =>
          `<div class="mb-3"><div class="mb-1 flex justify-between gap-2 text-xs"><span>${escapeHtml(item.site)}</span><strong>${item.count}</strong></div><div class="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-full rounded-full bg-emerald-500 transition-all duration-700" style="width:${Math.round(item.count / maximum * 100)}%"></div></div></div>`
        ).join('')}</div>`;
      }
    } catch (err) { /* silencieux */ }
  }

  document.querySelector('[data-analysis-page="prev"]')?.addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderAnalysisPage(); } });
  document.querySelector('[data-analysis-page="next"]')?.addEventListener('click', () => { if (currentPage * pageSize < analysisRows.length) { currentPage += 1; renderAnalysisPage(); } });
});
