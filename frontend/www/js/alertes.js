document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let notifications = [];
  let allNotifications = [];

  const TYPE_META = {
    info:    { icon: 'info', color: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-brand-primary', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300', label: 'Information' },
    success: { icon: 'check_circle', color: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-brand-success', badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300', label: 'Succès' },
    warning: { icon: 'warning', color: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-brand-alert-warning', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300', label: 'Avertissement' },
    error:   { icon: 'error', color: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-brand-alert-critical', badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300', label: 'Erreur' },
    alerte:  { icon: 'crisis_alert', color: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-brand-alert-critical', badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300', label: 'Alerte' },
    capture: { icon: 'bug_report', color: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-600', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300', label: 'Capture' },
    validation: { icon: 'verified', color: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-brand-success', badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300', label: 'Validation' },
    system:  { icon: 'settings', color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-500 dark:text-gray-400', badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'Système' },
    rapport: { icon: 'description', color: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-brand-primary', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300', label: 'Rapport' },
    sync:    { icon: 'sync', color: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-brand-primary', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300', label: 'Synchronisation' },
  };
  const DEFAULT_META = { icon: 'notifications', color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-500', badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'Notification' };

  function getMeta(type) { return TYPE_META[type] || DEFAULT_META; }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Les notifications de la table `notifications` ne sont créées qu'une fois
  // par le seed — rien dans le backend n'en génère de nouvelles quand un
  // évènement réel se produit (capture créée, site critique, échec DHIS2...).
  // Cette page semblait donc figée depuis le premier jour. En attendant un
  // vrai système d'évènements côté backend, on fusionne avec le moteur
  // d'alertes déjà calculé en direct ailleurs dans l'app (dashboard), pour
  // que la page reflète l'état réel actuel du système.
  const NIVEAU_TO_TYPE = { critique: 'error', eleve: 'alerte', moyen: 'warning', faible: 'info' };
  const ALERTE_TITRES = {
    epidemiologique: 'Alerte épidémiologique', validation: 'Validations en attente',
    espece: 'Espèce invasive détectée', sync: 'Échec de synchronisation DHIS2',
  };

  function mapLiveAlert(a, idx) {
    return {
      id: `live-${idx}`,
      _live: true,
      type_notification: NIVEAU_TO_TYPE[a.niveau] || 'alerte',
      titre: ALERTE_TITRES[a.type] || 'Alerte active',
      message: a.message,
      date_creation: a.date,
      lu: false,
      site_nom: a.localisation,
    };
  }

  async function loadAllData() {
    try {
      showLoader();
      const [notifData, statsData, alertesData] = await Promise.all([
        apiNotifications.list().catch(() => null),
        apiDashboard.stats().catch(() => null),
        apiDashboard.alertes().catch(() => null),
      ]);

      const live = (alertesData || []).map(mapLiveAlert);
      const persisted = notifData || [];
      allNotifications = [...live, ...persisted];
      notifications = allNotifications;

      updateStats(statsData);
      updateFilterBadges();
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des notifications.', 'error');
    }
    applyFilter();
  }

  function updateStats(stats) {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.lu).length;
    const read = total - unread;

    document.getElementById('stat-total').textContent = stats?.total_notifications ?? total;
    document.getElementById('stat-active').textContent = stats?.notifications_non_lues ?? unread;
    document.getElementById('stat-resolved').textContent = stats?.notifications_lues ?? read;

    const totalBtn = document.getElementById('filter-toutes');
    const unreadBtn = document.getElementById('filter-non-lues');
    if (totalBtn) {
      let badge = totalBtn.querySelector('span:last-child');
      if (!badge) { badge = document.createElement('span'); totalBtn.appendChild(badge); }
      badge.textContent = total;
    }
    if (unreadBtn) {
      let badge = unreadBtn.querySelector('span:last-child');
      if (!badge) { badge = document.createElement('span'); unreadBtn.appendChild(badge); }
      badge.textContent = unread;
    }
  }

  function updateFilterBadges() {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.lu).length;
    const alertes = notifications.filter(n => (n.type_notification || '').toLowerCase() === 'alerte' || (n.type_notification || '').toLowerCase() === 'error').length;
    const infos = notifications.filter(n => (n.type_notification || '').toLowerCase() === 'info').length;
    const warnings = notifications.filter(n => (n.type_notification || '').toLowerCase() === 'warning').length;

    const badges = {
      'filter-toutes': total,
      'filter-non-lues': unread,
      'filter-alertes': alertes,
      'filter-info': infos,
      'filter-warning': warnings,
    };

    Object.entries(badges).forEach(([id, count]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      let badge = btn.querySelector('span:last-child');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'text-xs font-semibold px-1.5 py-0.5 rounded-full';
        btn.appendChild(badge);
      }
      badge.textContent = count;
      if (id === 'filter-toutes') {
        badge.className = 'text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded-full';
      } else if (id === 'filter-non-lues') {
        badge.className = 'text-xs font-semibold bg-brand-alert-critical/10 text-brand-alert-critical px-1.5 py-0.5 rounded-full';
      }
    });
  }

  function renderNotifications(data) {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    if (!data.length) {
      container.innerHTML = '<div class="text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">notifications_off</span>Aucune notification</div>';
      return;
    }
    container.innerHTML = data.map(n => {
      const type = (n.type_notification || 'info').toLowerCase();
      const meta = getMeta(type);
      const unread = !n.lu;
      const site = n.site_nom || n.site || '';
      return `
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4 cursor-pointer hover:shadow-sm transition-shadow notification-item ${unread ? 'border-l-4 border-l-brand-alert-critical' : ''}" data-id="${n.id}" data-type="${type}">
        <div class="mt-1 p-2 ${meta.color} rounded-full flex-shrink-0">
          <span class="material-symbols-outlined ${meta.textColor}">${meta.icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-bold text-[#111418] dark:text-white">${n.titre || n.sujet || 'Notification'}</p>
            <span class="text-xs text-gray-400 whitespace-nowrap">${formatDate(n.date_creation || n.date || n.created_at)}</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${n.message || n.contenu || n.description || ''}</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-xs font-semibold ${meta.badge} px-2 py-0.5 rounded-full">${unread ? 'Non lue' : 'Lue'}</span>
            ${site ? `<span class="text-xs text-gray-400">Site: ${site}</span>` : ''}
            <span class="text-xs font-semibold ${meta.badge} px-2 py-0.5 rounded-full capitalize">${meta.label}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.notification-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        const n = notifications.find(x => String(x.id) === id);
        // Les alertes calculées en direct (site critique, backlog de
        // validation...) ne sont pas des lignes en base : rien à "marquer lu".
        if (!n || n.lu || n._live) return;
        try {
          await apiNotifications.markRead(id);
          n.lu = true;
          applyFilter();
          updateStats();
          updateFilterBadges();
        } catch (err) {
          console.warn('Erreur marquage lu:', err);
        }
      });
    });
  }

  document.getElementById('btn-marquer-tout-lu')?.addEventListener('click', async () => {
    try {
      const res = await apiNotifications.markAllRead();
      if (res !== null) {
        // Les alertes live ne sont pas concernées : elles reflètent l'état
        // actuel du système, "tout marquer lu" ne les fait pas disparaître.
        notifications.forEach(n => { if (!n._live) n.lu = true; });
        applyFilter();
        updateStats();
        updateFilterBadges();
        pushNotification('Toutes les notifications marquées comme lues.', 'success');
      }
    } catch (err) {
      pushNotification("Erreur lors du marquage.", 'error');
    }
  });

  const filterMap = {
    'filter-toutes': 'all',
    'filter-non-lues': 'unread',
    'filter-alertes': 'alerte',
    'filter-info': 'info',
    'filter-warning': 'warning',
  };
  const filterBtns = document.querySelectorAll(Object.keys(filterMap).map(id => `#${id}`).join(','));
  let currentFilter = 'all';

  function applyFilter() {
    let filtered = [...notifications];
    if (currentFilter === 'unread') filtered = filtered.filter(n => !n.lu);
    else if (currentFilter !== 'all') {
      filtered = filtered.filter(n => {
        const t = (n.type_notification || '').toLowerCase();
        if (currentFilter === 'alerte') return t === 'alerte' || t === 'error';
        return t === currentFilter;
      });
    }
    renderNotifications(filtered);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-brand-primary', 'text-white');
        b.classList.add('bg-brand-background', 'dark:bg-gray-700', 'text-[#111418]', 'dark:text-gray-200');
      });
      btn.classList.add('bg-brand-primary', 'text-white');
      btn.classList.remove('bg-brand-background', 'dark:bg-gray-700', 'text-[#111418]', 'dark:text-gray-200');
      currentFilter = filterMap[btn.id] || 'all';
      applyFilter();
    });
  });

  await loadAllData();
});
