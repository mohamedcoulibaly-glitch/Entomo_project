/**
 * core.js — Comportements partagés entre toutes les pages
 * Ento-App Afrique
 */

const APP_ASSET_VERSION = '20260922e';

if (!document.querySelector('meta[http-equiv="Cache-Control"]')) {
  const metaNoCache = document.createElement('meta');
  metaNoCache.setAttribute('http-equiv', 'Cache-Control');
  metaNoCache.setAttribute('content', 'no-cache, no-store, must-revalidate');
  document.head.appendChild(metaNoCache);
}
if (!document.querySelector('meta[http-equiv="Pragma"]')) {
  const metaPragma = document.createElement('meta');
  metaPragma.setAttribute('http-equiv', 'Pragma');
  metaPragma.setAttribute('content', 'no-cache');
  document.head.appendChild(metaPragma);
}

// Nettoyage immédiat des anciens caches Chrome, avant le rendu de la page.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => registrations.forEach(registration => registration.unregister()))
    .catch(() => {});
}

// ─── Route Guard — Vérification d'authentification ─────────────────────────
(function() {
  const PUBLIC_PAGES = new Set(['index.html', 'login.html', '404.html', 'aide.html']);
  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const currentPage = currentPath.split('/').pop() || 'index.html';

  if (PUBLIC_PAGES.has(currentPage) || currentPath === '') return;

  document.addEventListener('DOMContentLoaded', async function guardCheck() {
    if (!Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
      redirectToLogin();
      return;
    }
    try {
      const user = await apiRequest('GET', '/auth/me', null, false, { silent: true });
      if (!user || !user.id) {
        Auth.logout();
        redirectToLogin();
        return;
      }
      localStorage.setItem('entomo_user', JSON.stringify(user));
      const waitPerm = (n = 0) => {
        if (window.PermissionGuard) PermissionGuard.enforcePageAccess(currentPage);
        else if (n < 40) setTimeout(() => waitPerm(n + 1), 50);
      };
      waitPerm();
    } catch (err) {
      Auth.logout();
      redirectToLogin();
    }
  });

  function redirectToLogin() {
    const currentPath = window.location.pathname.replace(/^\/+/, '');
    if (currentPath && currentPath !== 'login.html' && currentPath !== '') {
      sessionStorage.setItem('redirect_after_login', '/' + currentPath);
    }
    window.location.href = '/login.html';
  }
})();

// ─── Fonctions utilitaires de référence ─────────────────────────────────────
async function loadReferenceData(category) {
  try {
    const data = await apiRequest('GET', `/reference/${category}`, null, false, { silent: true });
    if (data && data.length > 0) return data;
    // Fallback aux données statiques si disponibles
    if (typeof REFERENCE_DATA_STATIC !== 'undefined' && REFERENCE_DATA_STATIC[category]) {
      return REFERENCE_DATA_STATIC[category];
    }
    return [];
  } catch {
    if (typeof REFERENCE_DATA_STATIC !== 'undefined' && REFERENCE_DATA_STATIC[category]) {
      return REFERENCE_DATA_STATIC[category];
    }
    return [];
  }
}

async function populateSelect(selectId, category, defaultOption = 'Tous') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const items = await loadReferenceData(category);
  select.innerHTML = `<option value="">${defaultOption}</option>`
    + items.map(i => `<option value="${i.code || i.label}">${i.label}</option>`).join('');
}

// ─── Thème Dark / Light ─────────────────────────────────────────────────────
function initTheme() {
  const html = document.documentElement;

  function getPreferredTheme() {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(isDark) {
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    html.style.colorScheme = isDark ? 'dark' : 'light';
    document.querySelectorAll('#theme-icon').forEach(icon => {
      icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    });
    document.querySelectorAll('#theme-toggle').forEach(button => {
      button.setAttribute('aria-label', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
      button.setAttribute('aria-pressed', String(isDark));
    });
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.dispatchEvent(new CustomEvent('entomo-theme-change', { detail: { isDark } }));
  }

  applyTheme(getPreferredTheme());

  let toggle = document.getElementById('theme-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.type = 'button';
    toggle.className = 'entomo-theme-toggle fixed right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
    toggle.style.zIndex = '9999';
    toggle.setAttribute('aria-label', 'Activer le mode sombre');
    toggle.innerHTML = '<span class="material-symbols-outlined" id="theme-icon">dark_mode</span>';
    document.body.appendChild(toggle);
  }

  toggle?.addEventListener('click', () => {
    applyTheme(!html.classList.contains('dark'));
  });
}

// ─── Lien actif dans la nav ──────────────────────────────────────────────────
function initActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  const offlineLink = document.querySelector('aside nav a[href^="gestion-hors-ligne.html"]');
  if (offlineLink) {
    const managedLinks = [
      ['interventions.html', 'healing', 'Interventions'],
      ['campagnes.html', 'campaign', 'Campagnes'],
      ['cartographie.html', 'map', 'Cartographie'],
    ];
    let anchor = offlineLink;
    managedLinks.forEach(([href, icon, label]) => {
      if (document.querySelector(`aside nav a[href^="${href}"]`)) {
        anchor = document.querySelector(`aside nav a[href^="${href}"]`);
        return;
      }
      const link = document.createElement('a');
      link.href = href;
      link.className = 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
      link.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span class="text-sm">${label}</span>`;
      anchor.insertAdjacentElement('afterend', link);
      anchor = link;
    });
  }
  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === current) {
      link.classList.add('text-brand-primary', 'bg-brand-primary/10', 'font-medium');
      link.classList.remove('text-gray-700', 'dark:text-gray-300');
      link.addEventListener('click', event => event.preventDefault());
    }
  });
}

// ─── Layout : scroll contenu principal uniquement ────────────────────────────
function initAppLayoutScroll() {
  if (!document.querySelector('aside') || !document.querySelector('main')) return;

  if (!document.getElementById('entomo-layout-fix')) {
    const style = document.createElement('style');
    style.id = 'entomo-layout-fix';
    style.textContent = `
      html, body { height: 100%; overflow: hidden; }
      body > div.flex.h-screen,
      body > div.flex.min-h-screen {
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        min-height: 0;
      }
      body > div.flex.h-screen > aside,
      body > div.flex.h-screen > main,
      body > div.flex.min-h-screen > aside,
      body > div.flex.min-h-screen > main {
        min-height: 0;
      }
      body > div.flex.h-screen > aside nav,
      body > div.flex.min-h-screen > aside nav {
        flex: none;
      }
      body > div.flex.h-screen > aside nav a,
      body > div.flex.min-h-screen > aside nav a {
        flex-shrink: 0;
      }
      body > div.flex.h-screen > main,
      body > div.flex.min-h-screen > main {
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      body > div.flex.h-screen > aside,
      body > div.flex.min-h-screen > aside {
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      main > div.overflow-y-auto {
        overflow: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const main = document.querySelector('main');
  if (main) {
    main.scrollTop = 0;
    main.querySelectorAll(':scope > div.overflow-y-auto').forEach(el => {
      el.classList.remove('overflow-y-auto');
    });
  }

  document.querySelectorAll('aside nav a[href]').forEach(link => {
    link.addEventListener('click', () => {
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    });
  });

  document.querySelectorAll('main .overflow-y-auto').forEach(el => {
    if (el !== document.querySelector('main')) el.classList.remove('overflow-y-auto');
  });

  const savedSidebarScroll = Number(sessionStorage.getItem('entomo-sidebar-scroll'));
  const sidebar = document.querySelector('aside');
  if (sidebar && Number.isFinite(savedSidebarScroll)) {
    const restoreSidebarScroll = () => {
      const maxScroll = Math.max(0, sidebar.scrollHeight - sidebar.clientHeight);
      sidebar.scrollTop = Math.min(savedSidebarScroll, maxScroll);
    };
    restoreSidebarScroll();
    requestAnimationFrame(restoreSidebarScroll);
    setTimeout(restoreSidebarScroll, 100);
    setTimeout(restoreSidebarScroll, 350);
  }
}

// ─── Menu mobile (burger) ────────────────────────────────────────────────────
function initMobileMenu() {
  // Support both id="mobile-menu-btn" and the class-based md:hidden button
  const btn = document.getElementById('mobile-menu-btn') ||
              document.querySelector('button.md\\:hidden, header button[class*="md:hidden"]');
  const sidebar = document.querySelector('aside');
  if (!sidebar) return;

  // Ensure sidebar is always visible on desktop (no stray hidden class)
  sidebar.classList.remove('hidden');

  if (!btn) return;

  let isOpen = false;

  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('absolute', 'z-50', 'h-full', 'top-0', 'left-0', 'shadow-2xl');
    sidebar.classList.remove('-translate-x-full', 'hidden');
    // Overlay
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'fixed inset-0 z-40 bg-black/30 md:hidden';
      overlay.addEventListener('click', closeSidebar);
      document.body.appendChild(overlay);
    }
  }

  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('absolute', 'z-50', 'h-full', 'top-0', 'left-0', 'shadow-2xl');
    document.getElementById('sidebar-overlay')?.remove();
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    isOpen ? closeSidebar() : openSidebar();
  });
}

// ─── Système de notifications ────────────────────────────────────────────────
const NotifStore = { items: [], listeners: [] };

function pushNotification(msg, type = 'info') {
  const n = { id: Date.now(), msg, type, read: false };
  NotifStore.items.unshift(n);
  NotifStore.listeners.forEach(fn => fn(NotifStore.items));
  showToast(msg, type);
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 flex flex-col gap-2';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const colors = {
    info:    'bg-brand-primary text-white',
    success: 'bg-brand-success text-white',
    warning: 'bg-brand-alert-warning text-white',
    error:   'bg-brand-alert-critical text-white',
  };

  const icons = {
    info:    'info',
    success: 'check_circle',
    warning: 'warning',
    error:   'error',
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm text-sm font-medium
                     transform translate-x-full transition-transform duration-300 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-base">${icons[type] || 'info'}</span>
    <span class="flex-1">${msg}</span>
    <button class="ml-2 opacity-70 hover:opacity-100" onclick="this.closest('.flex').remove()">
      <span class="material-symbols-outlined text-base">close</span>
    </button>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
  });

  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Gestion de session (avatar + nom utilisateur) ───────────────────────────
function initSessionHeader() {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('entomo_user') || 'null'); } catch { return null; }
  })();

  document.querySelectorAll('[style*="googleusercontent"]').forEach(el => {
    el.style.backgroundImage = 'none';
  });

  const avatar = document.getElementById('header-avatar') ||
                 document.querySelector('header [data-entomo-avatar]') ||
                 document.querySelector('header .rounded-full.size-10') ||
                 document.querySelector('header .rounded-full');
  if (avatar) {
    avatar.style.cursor = 'pointer';
    avatar.title = user ? (user.full_name || user.username || 'Profil') : 'Connexion';
    avatar.addEventListener('click', e => {
      e.stopPropagation();
      showSessionMenu(avatar, user);
    });
    if (window.EntomoAvatar) {
      EntomoAvatar.apply(avatar, user);
    } else if (user) {
      const initials = (user.full_name || user.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      if (avatar.id === 'header-avatar') {
        avatar.textContent = initials;
      } else if (!avatar.querySelector('.avatar-initials')) {
        const span = document.createElement('div');
        span.className = 'avatar-initials w-full h-full rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold';
        span.textContent = initials;
        span.style.cssText = 'position:absolute;inset:0;';
        avatar.style.position = 'relative';
        avatar.appendChild(span);
      }
    }
  }
}

function showSessionMenu(anchor, user) {
  document.querySelectorAll('.session-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'session-menu absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden';

  if (user) {
    menu.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <p class="font-bold text-sm text-[#111418] dark:text-white">${user.full_name || user.username}</p>
        <p class="text-xs text-gray-500">${user.email || user.username || ''}</p>
      </div>
      <button class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-[#111418] dark:text-gray-200" id="sm-profile">
        <span class="material-symbols-outlined text-base">person</span> Mon profil
      </button>
      <button class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-[#111418] dark:text-gray-200" id="sm-settings">
        <span class="material-symbols-outlined text-base">settings</span> Paramètres
      </button>
      <div class="border-t border-gray-100 dark:border-gray-700"></div>
      <button class="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600" id="sm-logout">
        <span class="material-symbols-outlined text-base">logout</span> Se déconnecter
      </button>`;
  } else {
    menu.innerHTML = `
      <button class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-[#111418] dark:text-gray-200" id="sm-login">
        <span class="material-symbols-outlined text-base">login</span> Se connecter
      </button>`;
  }

  anchor.style.position = 'relative';
  anchor.parentElement.style.position = 'relative';
  anchor.parentElement.appendChild(menu);

  menu.querySelector('#sm-logout')?.addEventListener('click', () => {
    localStorage.removeItem('entomo_token');
    localStorage.removeItem('entomo_user');
    sessionStorage.removeItem('redirect_after_login');
    menu.remove();
    pushNotification('Déconnecté avec succès.', 'info');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
  });

  menu.querySelector('#sm-login')?.addEventListener('click', () => {
    menu.remove();
    showLoginModal();
  });

  menu.querySelector('#sm-profile')?.addEventListener('click', () => {
    menu.remove();
    const depth = window.location.pathname.split('/').filter(p => p.endsWith('.html')).length;
    window.location.href = depth > 0 ? 'profil.html' : 'pages/profil.html';
  });

  menu.querySelector('#sm-settings')?.addEventListener('click', () => {
    menu.remove();
    const depth = window.location.pathname.split('/').filter(p => p.endsWith('.html')).length;
    window.location.href = depth > 0 ? 'parametres-compte.html' : 'pages/parametres-compte.html';
  });

  document.addEventListener('click', () => menu.remove(), { once: true });
}

function showLoginModal() {
  openModal('Connexion à Ento-App',
    `<div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom d'utilisateur *</label>
        <input id="login-user" type="text" placeholder="admin"
          class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe *</label>
        <input id="login-pass" type="password" placeholder="••••••••"
          class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
      </div>
      <p id="login-err" class="text-red-500 text-xs hidden">Identifiants incorrects.</p>
    </div>`,
    {
      confirmLabel: 'Se connecter',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const u = document.getElementById('login-user')?.value.trim();
        const p = document.getElementById('login-pass')?.value;
        if (!u || !p) { document.getElementById('login-err')?.classList.remove('hidden'); return; }
        showLoader();
        if (typeof apiAuth !== 'undefined') {
          const res = await apiAuth.login(u, p);
          hideLoader();
          if (res) {
            pushNotification('Connecté avec succès !', 'success');
            setTimeout(() => location.reload(), 800);
          } else {
            document.getElementById('login-err')?.classList.remove('hidden');
          }
        } else {
          hideLoader();
          pushNotification('Backend non disponible — mode hors-ligne.', 'warning');
        }
      },
    }
  );
}


function initNotificationBell() {
  // `notifications` est le CONTENU du span (nom de la ligature Material
  // Symbols), pas sa classe — `span[class*="notifications"]` ne correspondait
  // donc jamais à rien : la cloche n'a jamais fonctionné, sur aucune page.
  const bellBtn = [...document.querySelectorAll('header button')].find(b => {
    const icon = b.querySelector(':scope > span.material-symbols-outlined');
    return icon && icon.textContent.trim() === 'notifications';
  });
  if (!bellBtn) return;

  const badge = document.createElement('span');
  badge.id = 'notif-badge';
  badge.className = 'absolute -top-1 -right-1 w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center hidden';
  bellBtn.style.position = 'relative';
  bellBtn.appendChild(badge);

  const dropdown = document.createElement('div');
  dropdown.id = 'notif-dropdown';
  dropdown.className = `absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl
                         border border-gray-200 dark:border-gray-700 z-50 hidden`;
  dropdown.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <span class="font-bold text-sm text-[#111418] dark:text-white">Notifications</span>
      <button id="mark-all-read" class="text-xs text-brand-primary hover:underline">Tout marquer lu</button>
    </div>
    <div id="notif-list" class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
      <p class="text-center text-sm text-gray-400 py-6">Chargement...</p>
    </div>`;
  bellBtn.parentElement.style.position = 'relative';
  bellBtn.parentElement.appendChild(dropdown);

  bellBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== bellBtn) {
      dropdown.classList.add('hidden');
    }
  });

  dropdown.querySelector('#mark-all-read')?.addEventListener('click', async () => {
    try {
      if (typeof apiNotifications !== 'undefined') {
        await apiNotifications.markAllRead();
      }
      NotifStore.items.forEach(n => { n.read = true; });
      badge.classList.add('hidden');
      renderNotifList();
    } catch {
      pushNotification('Impossible de marquer les notifications comme lues.', 'error');
    }
  });

  NotifStore.listeners.push(renderNotifList);

  function renderNotifList() {
    const list = dropdown.querySelector('#notif-list');
    const unread = NotifStore.items.filter(n => !n.read).length;
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.toggle('hidden', unread === 0);

    if (!NotifStore.items.length) {
      list.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Aucune notification</p>';
      return;
    }
    list.innerHTML = NotifStore.items.slice(0, 10).map(n => `
      <div class="flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-blue-50 dark:bg-blue-900/10'}">
        <span class="material-symbols-outlined text-brand-primary text-base mt-0.5">notifications</span>
        <p class="text-sm text-[#111418] dark:text-gray-200 flex-1">${n.msg || n.message || n.titre || 'Notification'}</p>
      </div>`).join('');
  }

  async function loadNotificationsFromApi() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || typeof apiNotifications === 'undefined') {
      renderNotifList();
      return;
    }
    try {
      const items = await apiNotifications.list({ limit: 20 });
      if (Array.isArray(items) && items.length) {
        NotifStore.items = items.map(item => ({
          id: item.id,
          msg: item.message || item.titre || item.contenu,
          type: item.type || 'info',
          read: Boolean(item.lu),
        }));
      }
    } catch {
      // Conserver les notifications locales si l'API est indisponible
    }
    renderNotifList();
  }

  loadNotificationsFromApi();
}

// ─── Modale universelle ──────────────────────────────────────────────────────
function openModal(title, bodyHTML, { onConfirm, confirmLabel = 'Confirmer', confirmClass = 'bg-brand-primary text-white', cancelLabel = 'Annuler' } = {}) {
  let modal = document.getElementById('universal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universal-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]';
    modal.style.zIndex = '9998';
    document.body.appendChild(modal);
  }

  // max-height/overflow en style inline plutôt qu'en classes Tailwind
  // arbitraires (max-h-[90vh]) : ce template n'existe que dans du HTML généré
  // en JS, jamais scanné par le build Tailwind statique — la classe n'a donc
  // aucune règle correspondante dans tailwind.min.css et la modale débordait
  // du viewport sans qu'on puisse jamais atteindre les boutons.
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden
                transform transition-all duration-200 scale-95 opacity-0"
         style="max-height:90vh" id="modal-inner">
      <div class="flex shrink-0 items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-2xl font-black text-[#111418] dark:text-white">${title}</h3>
        <button type="button" id="modal-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="min-height:0">${bodyHTML}</div>
      <div class="flex shrink-0 justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        ${cancelLabel ? `<button type="button" id="modal-cancel" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          ${cancelLabel}
        </button>` : ''}
        <button type="button" id="modal-confirm" class="px-4 py-2 rounded-lg text-sm font-bold ${confirmClass}
                hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
          ${confirmLabel}
        </button>
      </div>
    </div>`;

  const inner = modal.querySelector('#modal-inner');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inner.classList.remove('scale-95', 'opacity-0');
      inner.classList.add('scale-100', 'opacity-100');
    });
  });

  const closeModal = () => {
    inner.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.remove(), 200);
  };

  modal.querySelector('#modal-close').addEventListener('click', closeModal);
  modal.querySelector('#modal-cancel')?.addEventListener('click', closeModal);
  modal.querySelector('#modal-confirm').addEventListener('click', async () => {
    const confirmButton = modal.querySelector('#modal-confirm');
    confirmButton.disabled = true;
    confirmButton.classList.add('opacity-60', 'cursor-wait');
    try {
      const result = onConfirm ? await onConfirm() : true;
      if (result !== false) closeModal();
    } catch (error) {
      console.error('[modal] action failed:', error);
      pushNotification(error?.message || "L'action n'a pas pu être terminée.", 'error');
    } finally {
      if (document.body.contains(confirmButton)) {
        confirmButton.disabled = false;
        confirmButton.classList.remove('opacity-60', 'cursor-wait');
      }
    }
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}

// ─── Confirmation de suppression ─────────────────────────────────────────────
function confirmDelete(itemName, onConfirm) {
  openModal(
    'Confirmer la suppression',
    `<div class="flex items-start gap-3">
       <span class="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
       <div>
         <p class="font-medium mb-1">Supprimer <strong>${itemName}</strong> ?</p>
         <p class="text-gray-500 dark:text-gray-400 text-xs">Cette action est irréversible.</p>
       </div>
     </div>`,
    { onConfirm, confirmLabel: 'Supprimer', confirmClass: 'bg-red-600 text-white', cancelLabel: 'Annuler' }
  );
}

// ─── Recherche en temps réel sur un tableau ──────────────────────────────────
function initTableSearch(inputSelector, tableBodySelector, cellIndices = null) {
  const input = document.querySelector(inputSelector);
  const tbody = document.querySelector(tableBodySelector);
  if (!input || !tbody) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const cells = cellIndices
        ? cellIndices.map(i => row.cells[i]?.textContent || '').join(' ')
        : row.textContent;
      row.style.display = cells.toLowerCase().includes(q) ? '' : 'none';
    });
    updateEmptyState(tbody);
  });
}

function updateEmptyState(tbody) {
  const visible = Array.from(tbody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');
  let empty = tbody.querySelector('.empty-state-row');
  if (!visible.length) {
    if (!empty) {
      empty = document.createElement('tr');
      empty.className = 'empty-state-row';
      const cols = tbody.closest('table')?.querySelector('thead tr')?.cells.length || 6;
      empty.innerHTML = `<td colspan="${cols}" class="text-center py-10 text-gray-400 dark:text-gray-500">
        <span class="material-symbols-outlined text-4xl block mb-2">search_off</span>
        Aucun résultat trouvé
      </td>`;
      tbody.appendChild(empty);
    }
  } else {
    empty?.remove();
  }
}

// ─── Tri de tableau ──────────────────────────────────────────────────────────
function initTableSort(tableSelector) {
  const table = document.querySelector(tableSelector);
  if (!table) return;

  const headers = table.querySelectorAll('thead th');
  headers.forEach((th, idx) => {
    if (th.querySelector('.sr-only')) return; // colonne actions
    th.style.cursor = 'pointer';
    th.title = 'Cliquer pour trier';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-xs ml-1 align-middle text-gray-400';
    icon.textContent = 'unfold_more';
    th.appendChild(icon);

    let asc = true;
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));

      rows.sort((a, b) => {
        const av = a.cells[idx]?.textContent.trim() || '';
        const bv = b.cells[idx]?.textContent.trim() || '';
        return asc ? av.localeCompare(bv, 'fr') : bv.localeCompare(av, 'fr');
      });

      rows.forEach(r => tbody.appendChild(r));
      asc = !asc;

      headers.forEach(h => {
        const ic = h.querySelector('.material-symbols-outlined:last-child');
        if (ic) ic.textContent = 'unfold_more';
      });
      icon.textContent = asc ? 'expand_more' : 'expand_less';
    });
  });
}

// ─── Tooltips automatiques ───────────────────────────────────────────────────
function initTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(el => {
    const tip = document.createElement('div');
    tip.className = `absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1
                     pointer-events-none opacity-0 transition-opacity duration-150 whitespace-nowrap`;
    tip.textContent = el.dataset.tooltip;
    el.style.position = 'relative';
    el.appendChild(tip);

    el.addEventListener('mouseenter', () => tip.classList.replace('opacity-0', 'opacity-100'));
    el.addEventListener('mouseleave', () => tip.classList.replace('opacity-100', 'opacity-0'));
  });
}

// ─── Loader global ───────────────────────────────────────────────────────────
function showLoader() {
  let l = document.getElementById('global-loader');
  if (!l) {
    l = document.createElement('div');
    l.id = 'global-loader';
    l.className = `fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm
                   flex items-center justify-center`;
    l.style.zIndex = '9997';
    l.innerHTML = `<div class="flex flex-col items-center gap-3">
      <div class="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Chargement...</p>
    </div>`;
    document.body.appendChild(l);
  }
}
function hideLoader() {
  document.getElementById('global-loader')?.remove();
}

// ─── Loader sur bouton (anti-double-clic) ────────────────────────────────────
function buttonLoading(btn, loading = true) {
  if (!btn) return;
  if (loading) {
    btn._origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined inline-block animate-spin text-base mr-1">refresh</span> Chargement...`;
  } else {
    btn.disabled = false;
    if (btn._origHtml) btn.innerHTML = btn._origHtml;
  }
}

// ─── Charger des données API dans un tableau HTML ────────────────────────────
async function loadTableFromApi(tbodySelector, apiFn, rowRenderer, onEmpty = null) {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;
  showLoader();
  try {
    const data = await apiFn();
    hideLoader();
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="99" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">inbox</span>
        ${onEmpty || 'Aucune donnée disponible'}</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(rowRenderer).join('');
  } catch (err) {
    hideLoader();
    tbody.innerHTML = `<tr><td colspan="99" class="text-center py-10 text-red-400">
      <span class="material-symbols-outlined text-4xl block mb-2">error</span>
      Erreur lors du chargement des données</td></tr>`;
  }
}

// ─── Pagination client-side ──────────────────────────────────────────────────
function initPagination(tbodySelector, pageSize = 10) {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;

  const paginationRoot = document.querySelector('[aria-label="Pagination"], [aria-label="Table navigation"]');
  const paginationEl = paginationRoot?.closest('.flex') || paginationRoot;
  if (!paginationEl) return;

  let currentPage = 1;

  function render() {
    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    rows.forEach((r, i) => {
      r.style.display = (i >= (currentPage - 1) * pageSize && i < currentPage * pageSize) ? '' : 'none';
    });

    // Mettre à jour le texte "Affiche X à Y sur Z" — certaines pages (ex.
    // gestion-sites.html) utilisent un <span> plutôt qu'un <p> pour ce texte.
    const info = paginationEl.querySelector('p') || paginationEl.querySelector('span');
    if (info) {
      const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const to   = Math.min(currentPage * pageSize, total);
      info.innerHTML = `Affiche <span class="font-medium">${from}</span> à
                        <span class="font-medium">${to}</span> sur
                        <span class="font-medium">${total}</span> résultats`;
    }

    // Reconstruire les boutons de page
    const nav = paginationEl.querySelector('nav[aria-label="Pagination"], [aria-label="Table navigation"]') || paginationEl;
    if (nav) {
      const links = Array.from(nav.querySelectorAll('a[href], button[data-page]'));
      const prevBtn = links[0];
      const nextBtn = links[links.length - 1];
      if (prevBtn) {
        prevBtn.onclick = e => { e.preventDefault(); if (currentPage > 1) { currentPage--; render(); } };
        prevBtn.classList.toggle('opacity-40', currentPage === 1);
        prevBtn.classList.toggle('pointer-events-none', currentPage === 1);
      }
      if (nextBtn) {
        nextBtn.onclick = e => { e.preventDefault(); if (currentPage < pages) { currentPage++; render(); } };
        nextBtn.classList.toggle('opacity-40', currentPage === pages);
        nextBtn.classList.toggle('pointer-events-none', currentPage === pages);
      }
      links.slice(1, -1).forEach(link => {
        const page = Number(link.textContent.trim());
        if (!Number.isInteger(page)) return;
        link.onclick = event => { event.preventDefault(); currentPage = Math.min(pages, Math.max(1, page)); render(); };
        link.classList.toggle('bg-brand-primary', page === currentPage);
        link.classList.toggle('text-white', page === currentPage);
      });
    }
  }

  render();
  return { refresh: render };
}

// ─── Filtres par chips/badges ────────────────────────────────────────────────
function initChipFilters(chips, tbody, filterFn) {
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('bg-brand-primary', 'text-white'));
      chip.classList.add('bg-brand-primary', 'text-white');
      const value = chip.dataset.filter;
      Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)')).forEach(row => {
        row.style.display = filterFn(row, value) ? '' : 'none';
      });
      updateEmptyState(tbody);
    });
  });
}

// ─── Animation d'entrée des éléments ─────────────────────────────────────────
function initEntryAnimations() {
  const els = document.querySelectorAll('.animate-on-load, [data-animate]');
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });
}

// ─── Lanceur global de l'application ───────────────────────────────────────
function initAppLauncher() {
  if (window.location.pathname.includes('login.html') || window.location.pathname.includes('centre-application.html')) return;
  if (document.getElementById('app-launcher')) return;
  // Réservé aux administrateurs : les autres rôles n'ont besoin que de leur
  // propre sidebar, déjà filtrée par permission.
  const user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
  const isAdmin = !!(user && (user.is_superuser || (user.permissions || []).includes('admin')));
  if (!isAdmin) return;
  const launcher = document.createElement('a');
  launcher.id = 'app-launcher';
  launcher.href = '/pages/centre-application.html';
  launcher.title = "Ouvrir le centre de l'application";
  launcher.className = 'fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-brand-primary/30';
  launcher.style.zIndex = '9990';
  launcher.innerHTML = '<span class="material-symbols-outlined text-xl">apps</span><span class="hidden sm:inline">Tous les écrans</span>';
  document.body.appendChild(launcher);
}

// ─── PWA & synchronisation hors-ligne globale ────────────────────────────────
function initPWA() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const base = window.location.pathname.includes('/pages/') ? '..' : '.';
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = `${base}/manifest.json`;
    document.head.appendChild(link);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(() => {});
    }
  }
}

function initOfflineModules() {
  const base = window.location.pathname.includes('/pages/') ? '../js/' : 'js/';
  // permission-guard.js n'est plus chargé ici : son injection dynamique/asynchrone
  // était une source d'instabilité (délai variable selon navigateur/extensions,
  // limitation des timers en arrière-plan...). Il est maintenant inclus
  // statiquement dans le <head> de chaque page, juste après api.js.
  const files = ['entomo-events.js', 'offline-store.js', 'offline-sync.js'];
  files.forEach((file) => {
    if (document.querySelector(`script[data-entomo="${file}"]`)) return;
    const s = document.createElement('script');
    // Cache-bust aligné sur APP_ASSET_VERSION : sans ça, ces fichiers injectés
    // dynamiquement (jamais présents en dur dans le HTML) peuvent rester
    // indéfiniment en cache navigateur sans jamais reprendre une correction.
    s.src = `${base}${file}?v=${APP_ASSET_VERSION}`;
    s.dataset.entomo = file;
    s.onload = () => {
      if (file === 'offline-sync.js' && window.EntomoOfflineSync && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
        window.EntomoOfflineSync.init();
      }
    };
    document.head.appendChild(s);
  });
}

function initImageFallbacks() {
  document.querySelectorAll('img[src]:not([data-entomo-fallback])').forEach(img => {
    img.dataset.entomoFallback = '1';
    img.addEventListener('error', () => {
      const w = img.offsetWidth || parseInt(img.getAttribute('width'), 10) || 48;
      const h = img.offsetHeight || parseInt(img.getAttribute('height'), 10) || 48;
      const fallback = document.createElement('div');
      fallback.className = 'entomo-image-fallback inline-flex items-center justify-center rounded-lg';
      fallback.style.width = img.style.width || `${w}px`;
      fallback.style.height = img.style.height || `${h}px`;
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', img.alt || 'Image indisponible');
      fallback.innerHTML = '<span class="material-symbols-outlined text-2xl">broken_image</span>';
      img.replaceWith(fallback);
    }, { once: true });
  });
}

function loadSharedAssets() {
  const base = window.location.pathname.includes('/pages/') ? '..' : '.';
  if (!document.querySelector('link[data-entomo-design-tokens]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${base}/css/design-tokens.css?v=20260903`;
    link.dataset.entomoDesignTokens = '1';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-entomo-avatar]')) {
    const script = document.createElement('script');
    script.src = `${base}/js/components/avatar.js`;
    script.dataset.entomoAvatar = '1';
    script.onload = () => window.EntomoAvatar?.applyAll();
    document.head.appendChild(script);
  }
}

// ─── Attendre que PermissionGuard soit chargé (injecté dynamiquement, de façon
// asynchrone, par initOfflineModules ci-dessous) avant de filtrer un contenu
// selon les permissions. Toute page qui liste des écrans/liens conditionnés
// par permission doit passer par ici plutôt que de lire window.PermissionGuard
// directement dans son propre DOMContentLoaded — sinon la vérification arrive
// trop tôt (PermissionGuard pas encore chargé) et rien n'est filtré.
function onPermissionGuardReady(callback, attempt = 0) {
  if (window.PermissionGuard) { callback(); return; }
  if (attempt < 200) { setTimeout(() => onPermissionGuardReady(callback, attempt + 1), 50); return; }
  console.error('[Entomo] PermissionGuard non chargé après 10s — affichage non filtré par sécurité.');
  callback(); // dernier recours : on affiche non filtré plutôt que de bloquer la page indéfiniment
}

// ─── Masquer les liens de navigation vers des pages non autorisées ───────────
// Évite qu'un utilisateur clique sur un lien (sidebar, accueil...) pour se voir
// immédiatement redirigé avec un toast « Accès refusé » — le lien n'apparaît
// simplement pas s'il n'a pas la permission requise pour la page cible.
//
// Chaque clic recharge la page entière (pas de SPA), donc la sidebar est
// réinjectée à zéro à chaque navigation et ce filtrage doit se refaire à
// chaque fois. Le temps qu'il s'applique (chargement asynchrone de
// PermissionGuard), la zone est masquée via visibility:hidden — pas
// display:none, pour ne pas faire sauter la mise en page — afin d'éviter
// tout flash des liens non autorisés avant qu'ils ne soient retirés.
function applyNavPermissionFilter(scope, attempt = 0) {
  if (typeof Auth === 'undefined' || !Auth.isLoggedIn || !Auth.isLoggedIn()) {
    scope.style.visibility = '';
    return;
  }
  if (!window.PermissionGuard) {
    if (attempt < 200) { setTimeout(() => applyNavPermissionFilter(scope, attempt + 1), 50); return; }
    console.error('[Entomo] PermissionGuard non chargé après 10s — sidebar affichée non filtrée par sécurité.');
    scope.style.visibility = ''; // dernier recours : révéler non filtré plutôt que bloquer indéfiniment
    return;
  }
  scope.querySelectorAll('a[href$=".html"]').forEach(link => {
    const page = link.getAttribute('href').split('/').pop().split('?')[0];
    if (page === 'index.html' || page === 'login.html') return;
    if (!PermissionGuard.canAccessPage(page)) {
      // link.hidden seul ne suffit pas : les classes Tailwind (flex, block...)
      // présentes sur ces liens imposent display:flex avec une spécificité qui
      // l'emporte sur la règle UA [hidden]{display:none}. On force donc le
      // style en plus de l'attribut (gardé pour l'accessibilité/aria).
      link.hidden = true;
      link.style.display = 'none';
      link.setAttribute('aria-hidden', 'true');
    }
  });
  scope.style.visibility = '';
}

function filterNavByPermission() {
  document.querySelectorAll('[data-permission-scope]').forEach((scope) => {
    scope.style.visibility = 'hidden';
    applyNavPermissionFilter(scope);
  });
}

// ─── Initialisation globale ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSharedAssets();
  initTheme();
  initAppLayoutScroll();
  initActiveNav();
  initMobileMenu();
  initNotificationBell();
  initTooltips();
  initEntryAnimations();
  initSessionHeader();
  initImageFallbacks();
  initAppLauncher();
  initPWA();
  initOfflineModules();
  filterNavByPermission();
  if (window.EntomoI18n) EntomoI18n.init().catch(() => {});
});

document.addEventListener('entomo-sidebar-ready', () => {
  initActiveNav();
  initMobileMenu();
  filterNavByPermission();
});
