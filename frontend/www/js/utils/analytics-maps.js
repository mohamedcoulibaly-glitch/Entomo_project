/**
 * analytics-maps.js — Cartes Leaflet Sénégal pour analytics Entomo
 */
const EntomoMaps = (() => {
  const SENEGAL_CENTER = [14.4974, -14.4524];
  const DEFAULT_ZOOM = 7;
  const GEOJSON_URL = '../data/senegal-regions-official.geojson';
  const GEOJSON_FALLBACK = '../data/senegal-regions.geojson';

  // Normalisation noms officiels geoBoundaries/ANSD → libellés Entomo
  const REGION_NAME_MAP = {
    'Saint Louis': 'Saint-Louis',
    'Sedhiou': 'Sédhiou',
    'Kedougou': 'Kédougou',
    'Thies': 'Thiès',
  };

  const MEDICAL_REGION_5 = new Set(['Kédougou', 'Tambacounda', 'Kolda', 'Sédhiou', 'Ziguinchor']);

  function normalizeRegion(name) {
    return REGION_NAME_MAP[name] || name;
  }

  function getRegionName(feature) {
    return normalizeRegion(feature.properties?.shapeName || feature.properties?.name || '');
  }

  const RISK_COLORS = {
    faible: '#16a34a',
    vigilance: '#f59e0b',
    modere: '#f59e0b',
    eleve: '#f97316',
    critique: '#dc2626',
    default: '#94a3b8',
  };

  const _maps = {};
  let _geojsonCache = null;

  async function loadGeoJSON() {
    if (_geojsonCache) return _geojsonCache;
    for (const url of [GEOJSON_URL, GEOJSON_FALLBACK]) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          _geojsonCache = await res.json();
          return _geojsonCache;
        }
      } catch { /* essai suivant */ }
    }
    _geojsonCache = { type: 'FeatureCollection', features: [] };
    return _geojsonCache;
  }

  function riskColor(level) {
    return RISK_COLORS[level] || RISK_COLORS.default;
  }

  function densityColor(densite, maxDensite) {
    const ratio = maxDensite > 0 ? densite / maxDensite : 0;
    if (ratio >= 0.7) return RISK_COLORS.critique;
    if (ratio >= 0.4) return RISK_COLORS.vigilance;
    if (ratio > 0) return RISK_COLORS.faible;
    return '#e2e8f0';
  }

  function initMap(containerId, opts = {}) {
    if (typeof L === 'undefined') return null;
    const container = document.getElementById(containerId);
    if (!container) return null;
    if (_maps[containerId]) {
      _maps[containerId].remove();
      delete _maps[containerId];
    }
    container.innerHTML = '';
    const center = opts.center || SENEGAL_CENTER;
    const zoom = opts.zoom || DEFAULT_ZOOM;
    const map = L.map(container, {
      zoomControl: opts.zoomControl !== false,
      scrollWheelZoom: opts.scrollWheelZoom !== false,
      attributionControl: true,
    }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    _maps[containerId] = map;
    setTimeout(() => map.invalidateSize(), 200);
    return map;
  }

  async function choropleth(containerId, regionData, opts = {}) {
    const map = initMap(containerId, opts);
    if (!map) return null;
    const geojson = await loadGeoJSON();
    const dataByRegion = {};
    (regionData || []).forEach((r) => {
      dataByRegion[r.region] = r;
    });
    const maxDensite = Math.max(...(regionData || []).map((r) => r.densite || 0), 1);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const name = getRegionName(feature);
        const data = dataByRegion[name];
        const fill = data ? densityColor(data.densite || 0, maxDensite) : '#e2e8f0';
        return {
          fillColor: fill,
          weight: 1.5,
          opacity: 1,
          color: '#fff',
          fillOpacity: 0.75,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = getRegionName(feature);
        const data = dataByRegion[name];
        const captures = data?.count || 0;
        const densite = data?.densite || 0;
        const risque = data?.risque || 'faible';
        const rm5 = MEDICAL_REGION_5.has(name) ? ' (RM5)' : '';
        layer.bindPopup(`
          <div style="min-width:180px;font-family:Inter,sans-serif">
            <strong>${name}${rm5}</strong><br/>
            <small style="color:#666">Source: ANSD/OCHA — geoBoundaries</small><br/>
            Captures: <b>${captures}</b><br/>
            Densité: <b>${densite}</b><br/>
            Risque: <span style="color:${riskColor(risque)};font-weight:600">${risque}</span>
          </div>
        `);
        if (opts.onRegionClick) {
          layer.on('click', () => opts.onRegionClick(name, data));
        }
      },
    }).addTo(map);

    if (layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
    return map;
  }

  function siteMarkers(containerId, sites, opts = {}) {
    const map = initMap(containerId, opts);
    if (!map) return null;
    const markersLayer = L.layerGroup().addTo(map);
    (sites || []).forEach((site) => {
      if (site.latitude == null || site.longitude == null) return;
      const color = riskColor(site.niveau_risque || site.risque);
      const marker = L.circleMarker([Number(site.latitude), Number(site.longitude)], {
        radius: 8 + Math.min((site.captures || 0) / 3, 12),
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif">
          <strong>${site.nom || site.site}</strong><br/>
          ${site.region || ''}<br/>
          Captures: <b>${site.captures || site.count || 0}</b>
        </div>
      `);
      marker.addTo(markersLayer);
    });
    if (sites?.length) {
      const bounds = markersLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    }
    return map;
  }

  function heatmapLayer(containerId, points, opts = {}) {
    const map = initMap(containerId, opts);
    if (!map || !points?.length) return map;
    points.forEach((pt) => {
      const radius = 6 + Math.min((pt.weight || 1) * 2, 20);
      const opacity = Math.min(0.3 + (pt.weight || 1) / 30, 0.85);
      L.circleMarker([pt.lat, pt.lng], {
        radius,
        color: COLORS_HEAT(pt.weight || 1),
        fillColor: COLORS_HEAT(pt.weight || 1),
        fillOpacity: opacity,
        weight: 1,
      }).bindPopup(`<b>${pt.site || ''}</b><br/>${pt.region || ''}<br/>Individus: ${pt.weight || 0}`)
        .addTo(map);
    });
    return map;
  }

  function COLORS_HEAT(weight) {
    if (weight >= 20) return RISK_COLORS.critique;
    if (weight >= 10) return RISK_COLORS.vigilance;
    if (weight >= 5) return RISK_COLORS.faible;
    return '#00A3E0';
  }

  function destroy(containerId) {
    if (_maps[containerId]) {
      _maps[containerId].remove();
      delete _maps[containerId];
    }
  }

  return {
    initMap, choropleth, siteMarkers, heatmapLayer, destroy,
    loadGeoJSON, riskColor, SENEGAL_CENTER, DEFAULT_ZOOM,
  };
})();

if (typeof window !== 'undefined') window.EntomoMaps = EntomoMaps;
