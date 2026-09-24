/**
 * config-boot.js — Résolution centralisée API / médias (chargé avant api.js)
 */
(function () {
  'use strict';

  function resolveApiBase() {
    if (window.ENTOMO_API_BASE) return String(window.ENTOMO_API_BASE).replace(/\/$/, '');

    const meta = document.querySelector('meta[name="entomo-api-base"]');
    if (meta && meta.content) return meta.content.replace(/\/$/, '');

    const { protocol, hostname, port, origin } = window.location;
    const p = port || (protocol === 'https:' ? '443' : '80');

    // Backend sert aussi le frontend (8765 dev, 8000 docker/prod)
    if (p === '8765' || p === '8000' || p === '443' || p === '80') {
      return `${origin}/api/v1`;
    }

    // Frontend statique séparé (8766 dev, 8876 tests)
    if (p === '8766' || p === '8876') {
      const apiPort = p === '8876' ? '8875' : '8765';
      return `${protocol}//${hostname}:${apiPort}/api/v1`;
    }

    return `${origin}/api/v1`;
  }

  function apiOrigin() {
    return resolveApiBase().replace(/\/api\/v1\/?$/, '');
  }

  // Les fichiers uploads/ n'ont pas de Cache-Control explicite côté backend,
  // donc un navigateur qui a déjà vu une URL de capture peut continuer à
  // servir l'ancienne image depuis son cache disque même après remplacement
  // du fichier. On force un cache-bust global : à bumper à chaque fois que
  // les images du dossier uploads sont remplacées en masse hors upload normal.
  const MEDIA_CACHE_BUST = 'v=20260923g';

  function resolveMediaUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = String(path).replace(/\\/g, '/');
    const origin = apiOrigin();
    let url;
    if (normalized.startsWith('/uploads/')) url = `${origin}${normalized}`;
    else if (normalized.startsWith('uploads/')) url = `${origin}/${normalized}`;
    else url = `${origin}/uploads/${normalized.replace(/^\/+/, '')}`;
    return `${url}${url.includes('?') ? '&' : '?'}${MEDIA_CACHE_BUST}`;
  }

  window.ENTOMO_CONFIG = {
    resolveApiBase,
    apiOrigin,
    resolveMediaUrl,
  };

  window.ENTOMO_API_BASE = resolveApiBase();
})();
