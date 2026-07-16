document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }

  let mapData = { sites: [], regions: [], statistiques: {} };
  let currentRegion = 'toutes';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const positionFor = site => {
    if (site.latitude != null && site.longitude != null) return {
      top: Math.max(8, Math.min(88, ((17.2 - Number(site.latitude)) / 5.4) * 80 + 8)),
      left: Math.max(8, Math.min(90, ((Number(site.longitude) + 17.7) / 6.4) * 82 + 8)),
    };
    const seed = [...String(site.id || site.nom)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return { top: 12 + (seed * 17) % 70, left: 10 + (seed * 29) % 78 };
  };

  function showSite(site) {
    const panel = document.getElementById('map-site-info');
    if (!panel) return;
    panel.classList.remove('text-center');
    panel.innerHTML = `<div class="space-y-2 text-left text-xs">
      <div class="flex items-start justify-between gap-2"><strong class="text-sm">${escapeHtml(site.nom)}</strong><span class="rounded-full px-2 py-0.5 font-semibold ${site.niveau_risque === 'critique' ? 'bg-red-100 text-red-700' : site.niveau_risque === 'vigilance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${escapeHtml(site.niveau_risque)}</span></div>
      <p>${escapeHtml(site.region || '—')} / ${escapeHtml(site.district || '—')}</p>
      <div class="grid grid-cols-2 gap-2"><span>Captures <b>${site.captures}</b></span><span>Individus <b>${site.individus}</b></span><span>Confiance IA <b>${site.confiance_moyenne}%</b></span><span>Risque <b>${Math.round(site.risque * 100)}%</b></span></div>
      <a class="inline-flex font-semibold text-brand-primary hover:underline" href="details-site.html?id=${site.id}">Voir la fiche complète</a>
    </div>`;
  }

  function renderMap() {
    const map = document.getElementById('map-container');
    if (!map) return;
    const showSites = document.getElementById('layer-sites')?.checked !== false;
    const showCaptures = document.getElementById('layer-captures')?.checked !== false;
    const showRisk = document.getElementById('layer-risque')?.checked !== false;
    const sites = mapData.sites || [];
    map.innerHTML = `<div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-emerald-50 to-amber-50 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-800"><div class="absolute inset-5 rounded-[40%_55%_45%_50%] border-2 border-emerald-300/50 bg-emerald-100/40 dark:border-emerald-800 dark:bg-emerald-950/30"></div></div>
      ${showSites ? sites.map(site => { const pos = positionFor(site); const color = !showRisk ? 'bg-brand-primary' : site.niveau_risque === 'critique' ? 'bg-red-600' : site.niveau_risque === 'vigilance' ? 'bg-amber-500' : 'bg-emerald-600'; return `<button type="button" data-site-id="${site.id}" class="absolute z-10 flex size-9 items-center justify-center rounded-full ${color} text-xs font-black text-white shadow-lg transition duration-200 hover:scale-125 focus:ring-4 focus:ring-brand-primary/30" style="top:${pos.top}%;left:${pos.left}%" aria-label="${escapeHtml(site.nom)}, risque ${escapeHtml(site.niveau_risque)}">${escapeHtml((site.nom || '?')[0].toUpperCase())}${showCaptures && site.captures ? `<span class="absolute -right-2 -top-2 min-w-5 rounded-full bg-white px-1 text-[10px] text-gray-900 shadow">${site.captures}</span>` : ''}</button>`; }).join('') : ''}
      <div class="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow dark:bg-gray-900/90 dark:text-gray-200">${sites.length} site(s) — ${currentRegion === 'toutes' ? 'Toutes les régions' : escapeHtml(currentRegion)}</div>`;
    map.querySelectorAll('[data-site-id]').forEach(marker => {
      const site = sites.find(item => item.id === Number(marker.dataset.siteId));
      marker.addEventListener('mouseenter', () => showSite(site));
      marker.addEventListener('focus', () => showSite(site));
      marker.addEventListener('click', () => showSite(site));
    });
    const stats = mapData.statistiques || {};
    document.getElementById('map-stat-sites').textContent = stats.sites_actifs ?? 0;
    document.getElementById('map-stat-captures').textContent = stats.captures ?? 0;
  }

  async function loadData(region = currentRegion) {
    const data = await apiCartography.data(region);
    if (!data) return;
    mapData = data;
    renderMap();
  }

  document.getElementById('filter-region')?.addEventListener('click', () => {
    const regions = currentRegion === 'toutes' ? mapData.regions : [];
    apiCartography.data().then(all => {
      const options = (all?.regions || regions).map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('');
      openModal('Filtrer la cartographie', `<label class="block text-sm font-medium mb-2" for="map-region-value">Région</label><select id="map-region-value" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700"><option value="toutes">Toutes les régions</option>${options}</select>`, { confirmLabel: 'Appliquer', onConfirm: async () => { currentRegion = document.getElementById('map-region-value')?.value || 'toutes'; const label = document.querySelector('#filter-region p'); if (label) label.textContent = `Région: ${currentRegion === 'toutes' ? 'Toutes' : currentRegion}`; await loadData(); } });
    });
  });
  document.getElementById('btn-centrer-region')?.addEventListener('click', async () => { currentRegion = Auth.getUser()?.region || 'toutes'; await loadData(); pushNotification(`Carte centrée sur ${currentRegion === 'toutes' ? 'toutes les régions' : currentRegion}.`, 'info'); });
  ['layer-sites', 'layer-captures', 'layer-risque'].forEach(id => document.getElementById(id)?.addEventListener('change', renderMap));
  document.getElementById('btn-legende')?.addEventListener('click', () => document.getElementById('map-legend')?.classList.toggle('hidden'));
  document.getElementById('btn-exporter-carte')?.addEventListener('click', () => { const geojson = { type: 'FeatureCollection', features: mapData.sites.map(site => ({ type: 'Feature', geometry: site.latitude != null && site.longitude != null ? { type: 'Point', coordinates: [site.longitude, site.latitude] } : null, properties: site })) }; const url = URL.createObjectURL(new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })); const link = document.createElement('a'); link.href = url; link.download = `cartographie-${currentRegion}.geojson`; link.click(); URL.revokeObjectURL(url); pushNotification('Carte et indicateurs exportés.', 'success'); });
  document.getElementById('map-add-site')?.addEventListener('click', () => { window.location.href = 'nouveau-site.html'; });
  document.getElementById('map-fullscreen')?.addEventListener('click', async () => { try { await document.getElementById('map-container')?.requestFullscreen?.(); } catch { pushNotification('Le plein écran n’est pas disponible.', 'warning'); } });
  document.getElementById('map-print')?.addEventListener('click', () => window.print());
  await loadData();
});
