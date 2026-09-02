/**
 * i18n.js — Traduction dynamique légère (fetch JSON par langue)
 */
const EntomoI18n = (() => {
  const DEFAULT_LANG = 'fr';
  let catalog = {};
  let currentLang = DEFAULT_LANG;

  function getLang() {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    return localStorage.getItem('app_language') || user?.langue || user?.language || DEFAULT_LANG;
  }

  async function load(lang) {
    currentLang = lang || getLang();
    const base = window.location.pathname.includes('/pages/') ? '../i18n' : './i18n';
    try {
      const res = await fetch(`${base}/${currentLang}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('i18n missing');
      catalog = await res.json();
    } catch {
      if (currentLang !== DEFAULT_LANG) return load(DEFAULT_LANG);
      catalog = {};
    }
    return catalog;
  }

  function t(key, fallback) {
    return catalog[key] || fallback || key;
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const text = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder) el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.dataset.i18nTitle));
    });
  }

  async function init() {
    await load();
    apply();
    document.documentElement.lang = currentLang;
  }

  return { init, load, t, apply, getLang };
})();

window.EntomoI18n = EntomoI18n;
