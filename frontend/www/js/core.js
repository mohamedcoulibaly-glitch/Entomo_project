/**
 * core.js — Comportements partagés entre toutes les pages
 * Ento-App Afrique
 */

// ─── Thème Dark / Light ─────────────────────────────────────────────────────
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const icon   = document.getElementById('theme-icon');
  const html   = document.documentElement;

  const saved = localStorage.getItem('theme') || 'light';
  html.classList.toggle('dark', saved === 'dark');
  if (icon) icon.textContent = saved === 'dark' ? 'light_mode' : 'dark_mode';

  if (toggle) {
    toggle.addEventListener('click', () => {
      html.classList.toggle('dark');
      const isDark = html.classList.contains('dark');
      if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
}

// ─── Lien actif dans la nav ──────────────────────────────────────────────────
function initActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === current) {
      link.classList.add('text-brand-primary', 'bg-brand-primary/10', 'font-medium');
      link.classList.remove('text-gray-700', 'dark:text-gray-300');
    }
  });
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
    container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2';
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
  // Afficher le nom de l'utilisateur connecté dans l'avatar si dispo
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('entomo_user') || 'null'); } catch { return null; }
  })();

  // Avatar cliquable → menu profil
  const avatar = document.querySelector('header [style*="background-image"]') ||
                 document.querySelector('header .rounded-full');
  if (avatar) {
    avatar.style.cursor = 'pointer';
    avatar.title = user ? (user.full_name || user.username || 'Profil') : 'Connexion';
    avatar.addEventListener('click', e => {
      e.stopPropagation();
      showSessionMenu(avatar, user);
    });
  }

  // Afficher initiales si connecté
  if (user && avatar) {
    const initials = (user.full_name || user.username || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    // Superposer les initiales si l'avatar est un div bg-image
    if (!avatar.querySelector('.avatar-initials')) {
      const span = document.createElement('div');
      span.className = 'avatar-initials w-full h-full rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold';
      span.textContent = initials;
      span.style.cssText = 'position:absolute;inset:0;';
      avatar.style.position = 'relative';
      avatar.appendChild(span);
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
    menu.remove();
    pushNotification('Déconnecté avec succès.', 'info');
    setTimeout(() => {
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      const base  = depth > 1 ? '../'.repeat(depth - 1) : './';
      window.location.href = base + 'index.html';
    }, 1000);
  });

  menu.querySelector('#sm-login')?.addEventListener('click', () => {
    menu.remove();
    showLoginModal();
  });

  menu.querySelector('#sm-profile')?.addEventListener('click', () => {
    menu.remove();
    openModal('Mon profil',
      `<div class="space-y-3 text-sm">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center text-xl font-bold">
            ${(user?.full_name || user?.username || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <p class="font-bold text-[#111418] dark:text-white">${user?.full_name || user?.username}</p>
            <p class="text-gray-500">${user?.email || ''}</p>
          </div>
        </div>
        <div><span class="text-gray-500">Rôle :</span> <strong>${user?.role || 'N/A'}</strong></div>
        <div><span class="text-gray-500">Région :</span> <strong>${user?.region || 'N/A'}</strong></div>
      </div>`,
      { confirmLabel: 'Fermer', cancelLabel: '' }
    );
  });

  menu.querySelector('#sm-settings')?.addEventListener('click', () => {
    menu.remove();
    const depth = window.location.pathname.split('/').filter(p => p.endsWith('.html')).length;
    window.location.href = depth > 0 ? 'param-sync.html' : 'pages/param-sync.html';
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
  const bellBtn = document.querySelector('button:has(> span[class*="notifications"])');
  if (!bellBtn) return;

  // Créer badge
  const badge = document.createElement('span');
  badge.id = 'notif-badge';
  badge.className = 'absolute -top-1 -right-1 w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center hidden';
  bellBtn.style.position = 'relative';
  bellBtn.appendChild(badge);

  // Dropdown
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
      <p class="text-center text-sm text-gray-400 py-6">Aucune notification</p>
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

  dropdown.querySelector('#mark-all-read')?.addEventListener('click', () => {
    NotifStore.items.forEach(n => n.read = true);
    badge.classList.add('hidden');
    renderNotifList();
  });

  NotifStore.listeners.push(renderNotifList);

  function renderNotifList() {
    const list  = dropdown.querySelector('#notif-list');
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
        <p class="text-sm text-[#111418] dark:text-gray-200 flex-1">${n.msg}</p>
      </div>`).join('');
  }
}

// ─── Modale universelle ──────────────────────────────────────────────────────
function openModal(title, bodyHTML, { onConfirm, confirmLabel = 'Confirmer', confirmClass = 'bg-primary text-white', cancelLabel = 'Annuler' } = {}) {
  let modal = document.getElementById('universal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universal-modal';
    modal.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden
                transform transition-all duration-200 scale-95 opacity-0" id="modal-inner">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-bold text-[#111418] dark:text-white">${title}</h3>
        <button id="modal-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="px-6 py-5 text-sm text-gray-700 dark:text-gray-300">${bodyHTML}</div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <button id="modal-cancel" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          ${cancelLabel}
        </button>
        <button id="modal-confirm" class="px-4 py-2 rounded-lg text-sm font-bold ${confirmClass}
                hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
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
  modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    if (onConfirm) onConfirm();
    closeModal();
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
    l.className = `fixed inset-0 z-[9997] bg-white/60 dark:bg-black/60 backdrop-blur-sm
                   flex items-center justify-center`;
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

// ─── Pagination client-side ──────────────────────────────────────────────────
function initPagination(tbodySelector, pageSize = 10) {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;

  const paginationEl = document.querySelector('[aria-label="Pagination"]')?.closest('.flex');
  if (!paginationEl) return;

  let currentPage = 1;

  function render() {
    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    rows.forEach((r, i) => {
      r.style.display = (i >= (currentPage - 1) * pageSize && i < currentPage * pageSize) ? '' : 'none';
    });

    // Mettre à jour le texte "Affiche X à Y sur Z"
    const info = paginationEl.querySelector('p');
    if (info) {
      const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const to   = Math.min(currentPage * pageSize, total);
      info.innerHTML = `Affiche <span class="font-medium">${from}</span> à
                        <span class="font-medium">${to}</span> sur
                        <span class="font-medium">${total}</span> résultats`;
    }

    // Reconstruire les boutons de page
    const nav = paginationEl.querySelector('nav[aria-label="Pagination"]');
    if (nav) {
      const prevBtn = nav.querySelector('a:first-child');
      const nextBtn = nav.querySelector('a:last-child');
      if (prevBtn) {
        prevBtn.onclick = e => { e.preventDefault(); if (currentPage > 1) { currentPage--; render(); } };
        prevBtn.classList.toggle('opacity-40 pointer-events-none', currentPage === 1);
      }
      if (nextBtn) {
        nextBtn.onclick = e => { e.preventDefault(); if (currentPage < pages) { currentPage++; render(); } };
        nextBtn.classList.toggle('opacity-40 pointer-events-none', currentPage === pages);
      }
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

// ─── Initialisation globale ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initActiveNav();
  initMobileMenu();
  initNotificationBell();
  initTooltips();
  initEntryAnimations();
  initSessionHeader();
});
