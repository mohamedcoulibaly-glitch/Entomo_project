document.addEventListener('DOMContentLoaded', async () => {
  let reports = [];
  let sites = [];
  const selectedIndicators = () => Array.from(document.querySelectorAll('[data-indicators-container] input:checked')).map(input => input.dataset.label || input.value);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const normalizeDate = value => value ? `${value}T00:00:00` : null;

  function updatePreview() {
    const region = document.getElementById('report-region')?.value || 'Toutes les régions';
    const district = document.getElementById('report-district')?.value || 'Tous les districts';
    const format = document.getElementById('report-format')?.value || 'PDF';
    const indicators = selectedIndicators();
    const preview = document.getElementById('report-live-preview');
    if (!preview) return;
    preview.innerHTML = `<div class="grid grid-cols-2 gap-3 mb-5"><div class="rounded-lg bg-white dark:bg-gray-900 p-3"><p class="text-xs text-gray-500">Zone</p><strong>${escapeHtml(region)}</strong><p class="text-xs text-gray-500">${escapeHtml(district)}</p></div><div class="rounded-lg bg-white dark:bg-gray-900 p-3"><p class="text-xs text-gray-500">Sortie</p><strong>${escapeHtml(format)}</strong><p class="text-xs text-gray-500">${indicators.length} indicateur(s)</p></div></div><div class="space-y-2">${indicators.length ? indicators.map((label, index) => `<div class="flex items-center gap-3"><span class="w-32 truncate text-xs">${escapeHtml(label)}</span><div class="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-2 rounded-full bg-brand-primary transition-all duration-500" style="width:${Math.min(94, 42 + index * 13)}%"></div></div></div>`).join('') : '<p class="text-sm text-gray-500">Sélectionnez au moins un indicateur.</p>'}</div>`;
  }

  async function loadIndicators() {
    const container = document.querySelector('[data-indicators-container]');
    const result = await apiRequest('GET', '/indicateurs');
    if (!container || !Array.isArray(result)) return;
    container.innerHTML = result.length ? result.map((indicator, index) => `<label class="flex items-center gap-3 py-1 cursor-pointer"><input type="checkbox" value="${indicator.id}" data-label="${escapeHtml(indicator.nom)}" ${index < 3 ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-brand-primary"><span>${escapeHtml(indicator.nom)}</span></label>`).join('') : '<p class="text-xs text-gray-500">Aucun indicateur configuré.</p>';
    container.addEventListener('change', updatePreview);
  }

  async function loadGeography() {
    const data = await apiSites.list({ limit: 500 });
    sites = Array.isArray(data) ? data : [];
    const regionSelect = document.getElementById('report-region');
    const districtSelect = document.getElementById('report-district');
    const regions = [...new Set(sites.map(site => site.region).filter(Boolean))].sort();
    regionSelect.innerHTML = '<option>Toutes les régions</option>' + regions.map(region => `<option>${escapeHtml(region)}</option>`).join('');
    const updateDistricts = () => { const region = regionSelect.value; const districts = [...new Set(sites.filter(site => region === 'Toutes les régions' || site.region === region).map(site => site.district).filter(Boolean))].sort(); districtSelect.innerHTML = '<option>Tous les districts</option>' + districts.map(district => `<option>${escapeHtml(district)}</option>`).join(''); updatePreview(); };
    regionSelect.addEventListener('change', updateDistricts);
    districtSelect.addEventListener('change', updatePreview);
    updateDistricts();
  }

  async function loadReports() {
    const data = await apiReports.list({ limit: 8 });
    reports = Array.isArray(data) ? data : [];
    const container = document.querySelector('[data-reports-container]');
    if (!container) return;
    container.innerHTML = reports.length ? reports.map(report => `<div class="flex items-center justify-between gap-2 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0"><a href="details-rapport.html?id=${report.id}" class="min-w-0 hover:text-brand-primary"><p class="truncate text-sm font-medium">${escapeHtml(report.titre)}</p><p class="text-xs text-gray-500">${new Date(report.date_generation || report.created_at).toLocaleDateString('fr-FR')} • ${escapeHtml(report.statut)}</p></a><div class="flex gap-1">${report.chemin_fichier ? `<button data-download-report="${report.id}" class="p-2 text-brand-primary" aria-label="Télécharger ${escapeHtml(report.titre)}"><span class="material-symbols-outlined text-base">download</span></button>` : ''}<button data-delete-report="${report.id}" class="p-2 text-red-600" aria-label="Supprimer ${escapeHtml(report.titre)}"><span class="material-symbols-outlined text-base">delete</span></button></div></div>`).join('') : '<p class="text-center text-sm text-gray-400 py-4">Aucun rapport généré</p>';
    container.querySelectorAll('[data-download-report]').forEach(button => button.addEventListener('click', async () => {
      if (button.disabled) return;
      const report = reports.find(item => item.id === Number(button.dataset.downloadReport));
      if (!report) return;
      buttonLoading(button, true);
      const ext = (report.format_fichier || 'pdf').toLowerCase().replace('excel', 'xlsx');
      await apiReports.download(report.id, `${report.titre || 'rapport'}.${ext}`);
      buttonLoading(button, false);
    }));
    container.querySelectorAll('[data-delete-report]').forEach(button => button.addEventListener('click', () => { const report = reports.find(item => item.id === Number(button.dataset.deleteReport)); confirmDelete(report?.titre || 'ce rapport', async () => { await apiReports.delete(report.id); pushNotification('Rapport supprimé.', 'success'); await loadReports(); }); }));
  }

  document.getElementById('report-format')?.addEventListener('change', updatePreview);
  ['report-start', 'report-end'].forEach(id => document.getElementById(id)?.addEventListener('change', updatePreview));
  document.getElementById('report-generate')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const indicators = selectedIndicators();
    if (!indicators.length) { pushNotification('Sélectionnez au moins un indicateur.', 'warning'); return; }
    const title = document.getElementById('report-name')?.value.trim() || `Rapport entomologique - ${new Date().toLocaleDateString('fr-FR')}`;
    buttonLoading(button, true);
    const report = await apiReports.generate({ titre: title, type: 'personnalise', format_fichier: document.getElementById('report-format').value.toLowerCase().replace('excel', 'xlsx'), indicateurs: indicators, region: document.getElementById('report-region').value, district: document.getElementById('report-district').value, periode_debut: normalizeDate(document.getElementById('report-start').value), periode_fin: normalizeDate(document.getElementById('report-end').value) });
    buttonLoading(button, false);
    if (report) { pushNotification('Rapport généré et enregistré.', 'success'); await loadReports(); }
  });
  document.getElementById('report-schedule')?.addEventListener('click', async event => {
    const email = document.getElementById('report-email').value.trim();
    if (!email || !document.getElementById('report-email').checkValidity()) { pushNotification('Saisissez une adresse email valide.', 'warning'); return; }
    if (!reports.length) { pushNotification('Générez d’abord un rapport à planifier.', 'warning'); return; }
    const frequency = document.getElementById('report-frequency').value.toLowerCase().replace('mensuel', 'mensuel');
    buttonLoading(event.currentTarget, true);
    const result = await apiReports.schedule(reports[0].id, { recurrence: frequency, heure_envoi: '08:00', destinataires: email, actif: true });
    buttonLoading(event.currentTarget, false);
    if (result) pushNotification('Rapport planifié avec succès.', 'success');
  });

  await Promise.all([loadIndicators(), loadGeography(), loadReports()]);
  updatePreview();
});
