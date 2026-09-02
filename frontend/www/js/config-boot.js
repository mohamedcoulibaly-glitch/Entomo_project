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

  function resolveMediaUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = String(path).replace(/\\/g, '/');
    const origin = apiOrigin();
    if (normalized.startsWith('/uploads/')) return `${origin}${normalized}`;
    if (normalized.startsWith('uploads/')) return `${origin}/${normalized}`;
    return `${origin}/uploads/${normalized.replace(/^\/+/, '')}`;
  }

  window.ENTOMO_CONFIG = {
    resolveApiBase,
    apiOrigin,
    resolveMediaUrl,
  };

  window.ENTOMO_API_BASE = resolveApiBase();
})();
