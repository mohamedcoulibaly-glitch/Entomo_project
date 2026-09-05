document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }

  if (typeof L === 'undefined') {
    pushNotification('Bibliothèque cartographique non chargée.', 'error');
    return;
  }

  L.Icon.Default.imagePath = '../vendor/leaflet/images/';

  let mapData = { sites: [], regions: [], statistiques: {} };
  let currentRegion = 'toutes';
  let leafletMap = null;
  let markersLayer = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);

  const SENEGAL_CENTER = [14.4974, -14.4524];
  const DEFAULT_ZOOM = 7;

  function riskColor(site, showRisk) {
    if (!showRisk) return '#005689';
    if (site.niveau_risque === 'critique') return '#dc2626';
    if (site.niveau_risque === 'vigilance') return '#f59e0b';
    return '#16a34a';
  }

  function showSite(site) {
    const panel = document.getElementById('map-site-info');
    if (!panel || !site) return;
    panel.classList.remove('text-center');
    panel.innerHTML = `<div class="space-y-2 text-left text-xs entomo-fade-in">
      <div class="flex items-start justify-between gap-2"><strong class="text-sm">${escapeHtml(site.nom)}</strong><span class="rounded-full px-2 py-0.5 font-semibold ${site.niveau_risque === 'critique' ? 'bg-red-100 text-red-700' : site.niveau_risque === 'vigilance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${escapeHtml(site.niveau_risque)}</span></div>
      <p>${escapeHtml(site.region || '—')} / ${escapeHtml(site.district || '—')}</p>
      <div class="grid grid-cols-2 gap-2"><span>Captures <b>${site.captures}</b></span><span>Individus <b>${site.individus}</b></span><span>Confiance IA <b>${site.confiance_moyenne}%</b></span><span>Risque <b>${Math.round(site.risque * 100)}%</b></span></div>
      <a class="inline-flex font-semibold text-brand-primary hover:underline" href="details-site.html?id=${site.id}">Voir la fiche complète</a>
    </div>`;
  }

  function initLeaflet() {
    const container = document.getElementById('map-container');
    if (!container || leafletMap) return;
    container.innerHTML = '';
    leafletMap = L.map(container, { zoomControl: true, scrollWheelZoom: true }).setView(SENEGAL_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMap);
    markersLayer = L.layerGroup().addTo(leafletMap);
    setTimeout(() => leafletMap.invalidateSize(), 200);
  }

  function renderMap() {
    if (!leafletMap) initLeaflet();
    if (!markersLayer) return;

    const showSites = document.getElementById('layer-sites')?.checked !== false;
    const showCaptures = document.getElementById('layer-captures')?.checked !== false;
    const showRisk = document.getElementById('layer-risque')?.checked !== false;
    const sites = (mapData.sites || []).filter((s) => s.latitude != null && s.longitude != null);

    markersLayer.clearLayers();

    if (showSites) {
      sites.forEach((site) => {
        const color = riskColor(site, showRisk);
        const marker = L.circleMarker([Number(site.latitude), Number(site.longitude)], {
          radius: 10,
          color: color,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 2,
        });
        const label = showCaptures && site.captures ? ` (${site.captures} captures)` : '';
        marker.bindPopup(`<strong>${escapeHtml(site.nom)}</strong>${label}<br>${escapeHtml(site.region || '')}`);
        marker.on('click', () => showSite(site));
        marker.on('mouseover', () => showSite(site));
        markersLayer.addLayer(marker);
      });
      if (sites.length > 1) {
        const bounds = L.latLngBounds(sites.map((s) => [Number(s.latitude), Number(s.longitude)]));
        leafletMap.fitBounds(bounds.pad(0.15));
      } else if (sites.length === 1) {
        leafletMap.setView([Number(sites[0].latitude), Number(sites[0].longitude)], 12);
      }
    }

    const stats = mapData.statistiques || {};
    document.getElementById('map-stat-sites').textContent = stats.sites_actifs ?? sites.length;
    document.getElementById('map-stat-captures').textContent = stats.captures ?? 0;
    leafletMap.invalidateSize();
  }

  async function loadData(region = currentRegion) {
    const data = await apiCartography.data(region);
    if (!data) return;
    mapData = data;
    renderMap();
  }

  document.getElementById('filter-region')?.addEventListener('click', () => {
    apiCartography.data().then((all) => {
      const options = (all?.regions || mapData.regions || []).map((region) =>
        `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
      ).join('');
      openModal('Filtrer la cartographie', `<label class="block text-sm font-medium mb-2" for="map-region-value">Région</label><select id="map-region-value" class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700"><option value="toutes">Toutes les régions</option>${options}</select>`, {
        confirmLabel: 'Appliquer',
        onConfirm: async () => {
          currentRegion = document.getElementById('map-region-value')?.value || 'toutes';
          const label = document.querySelector('#filter-region p');
          if (label) label.textContent = `Région: ${currentRegion === 'toutes' ? 'Toutes' : currentRegion}`;
          await loadData();
        },
      });
    });
  });

  document.getElementById('btn-centrer-region')?.addEventListener('click', async () => {
    currentRegion = Auth.getUser()?.region || 'toutes';
    await loadData();
    pushNotification(`Carte centrée sur ${currentRegion === 'toutes' ? 'toutes les régions' : currentRegion}.`, 'info');
  });

  ['layer-sites', 'layer-captures', 'layer-risque'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderMap);
  });

  document.getElementById('btn-legende')?.addEventListener('click', () => {
    document.getElementById('map-legend')?.classList.toggle('hidden');
  });

  document.getElementById('btn-exporter-carte')?.addEventListener('click', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: (mapData.sites || []).map((site) => ({
        type: 'Feature',
        geometry: site.latitude != null && site.longitude != null
          ? { type: 'Point', coordinates: [site.longitude, site.latitude] }
          : null,
        properties: site,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartographie-${currentRegion}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
    pushNotification('Carte exportée en GeoJSON.', 'success');
  });

  document.getElementById('map-add-site')?.addEventListener('click', () => {
  if (typeof window.openSiteModal === 'function') {
    window.openSiteModal();
    return;
  }
  window.location.href = 'nouveau-site.html';
});
  document.getElementById('map-fullscreen')?.addEventListener('click', async () => {
    try { await document.getElementById('map-container')?.requestFullscreen?.(); leafletMap?.invalidateSize(); }
    catch { pushNotification('Le plein écran n’est pas disponible.', 'warning'); }
  });
  document.getElementById('map-print')?.addEventListener('click', () => window.print());

  initLeaflet();
  await loadData();
});
