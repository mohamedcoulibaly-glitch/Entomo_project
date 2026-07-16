/**
 * dashboard-utilisateurs.js
 * Tableau de bord d'activite des utilisateurs — dynamique
 */
document.addEventListener('DOMContentLoaded', async () => {

  let allUsers = [];
  let allLogs = [];
  let activityPage = 1;
  let usersPage = 1;
  const PAGE_SIZE = 10;

  const ACTION_COLORS = {
    connexion: 'text-green-700 dark:text-green-400',
    creation: 'text-blue-700 dark:text-blue-400',
    modification: 'text-blue-700 dark:text-blue-400',
    suppression: 'text-red-700 dark:text-red-400',
    export: 'text-blue-700 dark:text-blue-400',
    validation: 'text-green-700 dark:text-green-400',
    echec: 'text-yellow-700 dark:text-yellow-400',
    login: 'text-green-700 dark:text-green-400',
    logout: 'text-gray-700 dark:text-gray-400',
  };

  const ACTION_ICONS = {
    connexion: 'login',
    creation: 'add_circle',
    modification: 'edit',
    suppression: 'cancel',
    export: 'download',
    validation: 'check_circle',
    echec: 'warning',
    login: 'login',
    logout: 'logout',
  };

  const ROLE_COLORS = ['#137fec', '#078838', '#F0AD4E', '#D9534F', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899', '#6366F1', '#14B8A6'];

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadData() {
    try {
      const [users, logs] = await Promise.all([
        typeof apiUsers !== 'undefined' ? apiUsers.list({ limit: 200 }) : null,
        typeof apiAudit !== 'undefined' ? apiAudit.list({ limit: 200 }) : null,
      ]);
      if (!users && !logs) { showOfflineMessage(); return; }
      hideOfflineMessage();
      allUsers = users || [];
      allLogs = logs || [];
      renderStats();
      renderActivityTable();
      renderUsersTable();
      renderRoleChart();
      renderTimeline();
    } catch (err) {
      console.warn('[dashboard-utilisateurs] loadData error:', err);
      showOfflineMessage();
    }
  }

  // ── Offline helpers ────────────────────────────────────────────────────────
  function showOfflineMessage() {
    const el = document.getElementById('stats-grid');
    if (!el) return;
    let msg = el.querySelector('.offline-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'offline-msg col-span-full text-center py-8 text-gray-500 dark:text-gray-400';
      el.prepend(msg);
    }
    msg.innerHTML = '<span class="material-symbols-outlined text-3xl mb-2">cloud_off</span><p>Backend hors ligne. Donnees non disponibles.</p>';
  }

  function hideOfflineMessage() {
    const msg = document.querySelector('.offline-msg');
    if (msg) msg.remove();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function renderStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.is_active).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allUsers.filter(u => {
      const d = u.date_creation || u.created_at || u.date_joined;
      return d && new Date(d) >= monthStart;
    }).length;
    const last24h = new Date(Date.now() - 86400000);
    const recent = allUsers.filter(u => u.last_login && new Date(u.last_login) >= last24h).length;

    setStat('total_users', total);
    setHint('total_users_hint', active + ' actifs');
    setStat('active_users', active);
    setHint('active_users_hint', total ? Math.round(active / total * 100) + '% du total' : '');
    setStat('new_this_month', newThisMonth);
    setStat('recently_connected', recent);
  }

  function setStat(k, v) {
    var el = document.querySelector('[data-stat="' + k + '"]');
    if (el) el.textContent = typeof v === 'number' ? v.toLocaleString('fr-FR') : v;
  }
  function setHint(k, t) {
    var el = document.querySelector('[data-stat="' + k + '_hint"]');
    if (el) el.textContent = t;
  }

  // ── Activity table (audit logs) ────────────────────────────────────────────
  function getFilteredLogs() {
    var search = (document.getElementById('search-activity') || {}).value || '';
    search = search.toLowerCase().trim();
    var actionFilter = (document.getElementById('filter-action-type') || {}).value || 'toutes';
    return allLogs.filter(function(log) {
      var action = (log.action || log.type || '').toLowerCase();
      if (actionFilter !== 'toutes' && action.indexOf(actionFilter) === -1) return false;
      if (!search) return true;
      var hay = [log.utilisateur_id, log.user_name, log.action, log.type, log.description, log.details, log.message, log.resource_type, log.adresse_ip, log.ip_address, log.ip, log.module].filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(search) !== -1;
    });
  }

  function renderActivityTable() {
    var tbody = document.getElementById('activity-tbody');
    if (!tbody) return;
    var filtered = getFilteredLogs();
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (activityPage > pages) activityPage = pages;
    var start = (activityPage - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);

    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">inbox</span>Aucune activite trouvee</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(function(log, i) {
        var action = (log.action || log.type || 'N/A').toLowerCase();
        var colorClass = 'text-gray-700 dark:text-gray-300';
        var icon = 'circle';
        for (var k in ACTION_COLORS) {
          if (action.indexOf(k) !== -1) { colorClass = ACTION_COLORS[k]; icon = ACTION_ICONS[k]; break; }
        }
        var ts = log.created_at || log.date || log.date_creation || log.timestamp;
        var dateStr = ts ? new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
        var desc = log.description || log.details || log.message || [log.resource_type, log.resource_id != null ? '#' + log.resource_id : ''].filter(Boolean).join(' ') || '\u2014';
        var ip = log.adresse_ip || log.ip_address || log.ip || '\u2014';
        var userLabel = log.user_name || (log.utilisateur_id ? 'Utilisateur #' + log.utilisateur_id : 'Systeme');
        var bg = i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-900/50';
        return '<tr class="' + bg + ' border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">' +
          '<td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">' + dateStr + '</td>' +
          '<td class="px-6 py-4">' + userLabel + '</td>' +
          '<td class="px-6 py-4"><span class="inline-flex items-center gap-1.5 ' + colorClass + '"><span class="material-symbols-outlined text-base">' + icon + '</span>' + (log.action || log.type || 'N/A') + '</span></td>' +
          '<td class="px-6 py-4 max-w-xs truncate" title="' + desc + '">' + desc + '</td>' +
          '<td class="px-6 py-4 font-mono text-xs">' + ip + '</td></tr>';
      }).join('');
    }

    var info = document.getElementById('pagination-info');
    if (info) {
      var from = total === 0 ? 0 : start + 1;
      var to = Math.min(start + PAGE_SIZE, total);
      info.innerHTML = 'Affichage de <span class="font-semibold">' + from + '</span> a <span class="font-semibold">' + to + '</span> sur <span class="font-semibold">' + total + '</span>';
    }
    paginate('btn-prev', 'btn-next', activityPage, pages, function(dir) {
      activityPage += dir;
      renderActivityTable();
    });
  }

  // ── Users table ────────────────────────────────────────────────────────────
  function getFilteredUsers() {
    var search = (document.getElementById('search-users') || {}).value || '';
    search = search.toLowerCase().trim();
    if (!search) return allUsers;
    return allUsers.filter(function(u) {
      var hay = [u.full_name, u.username, u.email, u.role && u.role.nom, u.role_id].filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(search) !== -1;
    });
  }

  function renderUsersTable() {
    var tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    var filtered = getFilteredUsers();
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (usersPage > pages) usersPage = pages;
    var start = (usersPage - 1) * PAGE_SIZE;
    var pageData = filtered.slice(start, start + PAGE_SIZE);

    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">person_off</span>Aucun utilisateur trouve</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(function(u) {
        var initial = (u.full_name || u.username || '?')[0].toUpperCase();
        var statusClass = u.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800';
        var statusText = u.is_active ? 'Actif' : 'Inactif';
        var lastLogin = u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais';
        return '<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" data-id="' + u.id + '">' +
          '<td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">' + initial + '</div><div><p class="font-medium text-sm text-[#111418] dark:text-white">' + (u.full_name || u.username) + '</p><p class="text-xs text-gray-500">' + (u.email || '') + '</p></div></div></td>' +
          '<td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">' + (u.role && u.role.nom || u.role_id || 'N/A') + '</td>' +
          '<td class="px-6 py-4"><span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ' + statusClass + '">' + statusText + '</span></td>' +
          '<td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">' + lastLogin + '</td>' +
          '<td class="px-6 py-4 text-right"><button class="text-gray-400 hover:text-brand-primary p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onclick="window.location.href=\'gestion-utilisateurs.html\'"><span class="material-symbols-outlined" style="font-size:16px">open_in_new</span></button></td></tr>';
      }).join('');
    }

    var info = document.getElementById('users-pagination-info');
    if (info && total > 0) {
      info.innerHTML = 'Affichage de <span class="font-semibold">' + (start + 1) + '</span> a <span class="font-semibold">' + Math.min(start + PAGE_SIZE, total) + '</span> sur <span class="font-semibold">' + total + '</span>';
    } else if (info) { info.textContent = ''; }
    paginate('users-btn-prev', 'users-btn-next', usersPage, pages, function(dir) {
      usersPage += dir;
      renderUsersTable();
    });
  }

  // ── Pagination helper ──────────────────────────────────────────────────────
  function paginate(prevId, nextId, current, total, onChange) {
    var prev = document.getElementById(prevId);
    var next = document.getElementById(nextId);
    if (prev) {
      prev.classList.toggle('opacity-40', current <= 1);
      prev.classList.toggle('pointer-events-none', current <= 1);
      prev.onclick = function(e) { e.preventDefault(); if (current > 1) onChange(-1); };
    }
    if (next) {
      next.classList.toggle('opacity-40', current >= total);
      next.classList.toggle('pointer-events-none', current >= total);
      next.onclick = function(e) { e.preventDefault(); if (current < total) onChange(1); };
    }
  }

  // ── Role distribution chart (canvas) ───────────────────────────────────────
  function renderRoleChart() {
    var canvas = document.getElementById('role-chart');
    var emptyMsg = document.getElementById('role-chart-empty');
    if (!canvas) return;

    var roles = {};
    allUsers.forEach(function(u) {
      var r = (u.role && u.role.nom) || u.role_id || 'Non assigne';
      roles[r] = (roles[r] || 0) + 1;
    });
    var labels = Object.keys(roles);
    var data = Object.values(roles);

    if (!labels.length) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.classList.remove('hidden');
      return;
    }
    canvas.style.display = '';
    if (emptyMsg) emptyMsg.classList.add('hidden');

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    var w = rect.width;
    var h = rect.height;
    var total = data.reduce(function(a, b) { return a + b; }, 0);
    var barH = Math.min(32, (h - 20) / labels.length - 8);
    var maxVal = Math.max.apply(null, data);
    var chartLeft = 110;
    var chartRight = w - 60;
    var chartWidth = chartRight - chartLeft;

    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px Public Sans, sans-serif';

    labels.forEach(function(label, i) {
      var y = i * (barH + 10) + 10;
      var val = data[i];
      var barW = maxVal > 0 ? (val / maxVal) * chartWidth : 0;

      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, chartLeft - 8, y + barH / 2);

      ctx.fillStyle = ROLE_COLORS[i % ROLE_COLORS.length];
      ctx.beginPath();
      var radius = 4;
      ctx.moveTo(chartLeft + radius, y);
      ctx.lineTo(chartLeft + barW - radius, y);
      ctx.quadraticCurveTo(chartLeft + barW, y, chartLeft + barW, y + radius);
      ctx.lineTo(chartLeft + barW, y + barH - radius);
      ctx.quadraticCurveTo(chartLeft + barW, y + barH, chartLeft + barW - radius, y + barH);
      ctx.lineTo(chartLeft + radius, y + barH);
      ctx.quadraticCurveTo(chartLeft, y + barH, chartLeft, y + barH - radius);
      ctx.lineTo(chartLeft, y + radius);
      ctx.quadraticCurveTo(chartLeft, y, chartLeft + radius, y);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(val + ' (' + Math.round(val / total * 100) + '%)', chartLeft + barW + 8, y + barH / 2);
    });
  }

  // ── Activity timeline ──────────────────────────────────────────────────────
  function renderTimeline() {
    var container = document.getElementById('activity-timeline');
    if (!container) return;

    var recent = allLogs.slice(0, 15);
    if (!recent.length) {
      container.innerHTML = '<p class="text-center text-gray-400 text-sm py-6">Aucune activite recente</p>';
      return;
    }

    container.innerHTML = recent.map(function(log) {
      var action = (log.action || log.type || '').toLowerCase();
      var dotColor = 'bg-gray-400';
      if (action.indexOf('connexion') !== -1 || action.indexOf('login') !== -1) dotColor = 'bg-green-500';
      else if (action.indexOf('creation') !== -1) dotColor = 'bg-blue-500';
      else if (action.indexOf('suppression') !== -1 || action.indexOf('delete') !== -1) dotColor = 'bg-red-500';
      else if (action.indexOf('echec') !== -1 || action.indexOf('error') !== -1) dotColor = 'bg-yellow-500';
      else if (action.indexOf('export') !== -1) dotColor = 'bg-blue-400';
      else if (action.indexOf('validation') !== -1) dotColor = 'bg-green-400';

      var ts = log.created_at || log.date || log.date_creation || log.timestamp;
      var timeStr = ts ? new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      var desc = log.description || log.details || log.message || log.action || log.type || '';
      var userLabel = log.user_name || (log.utilisateur_id ? '#' + log.utilisateur_id : 'Systeme');

      return '<div class="flex gap-3 items-start">' +
        '<div class="flex flex-col items-center mt-1"><div class="w-2.5 h-2.5 rounded-full ' + dotColor + '"></div><div class="w-px h-full bg-gray-200 dark:bg-gray-700 min-h-[20px]"></div></div>' +
        '<div class="pb-3 flex-1 min-w-0"><p class="text-sm text-[#111418] dark:text-white font-medium truncate">' + desc + '</p>' +
        '<p class="text-xs text-gray-500 dark:text-gray-400">' + userLabel + ' &middot; ' + timeStr + '</p></div></div>';
    }).join('');
  }

  // ── Search / filter event listeners ────────────────────────────────────────
  var searchActivity = document.getElementById('search-activity');
  var filterAction = document.getElementById('filter-action-type');
  if (searchActivity) searchActivity.addEventListener('input', function() { activityPage = 1; renderActivityTable(); });
  if (filterAction) filterAction.addEventListener('change', function() { activityPage = 1; renderActivityTable(); });

  var searchUsers = document.getElementById('search-users');
  if (searchUsers) searchUsers.addEventListener('input', function() { usersPage = 1; renderUsersTable(); });

  // ── Export CSV ─────────────────────────────────────────────────────────────
  var exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      var rows = document.querySelectorAll('#activity-tbody tr');
      if (!rows.length) { pushNotification('Aucune donnee a exporter.', 'warning'); return; }
      var headers = ['Horodatage', 'Utilisateur', 'Action', 'Description', 'IP'];
      var csvRows = Array.from(rows).map(function(row) {
        var cells = row.querySelectorAll('td');
        return Array.from(cells).map(function(c) { return '"' + c.textContent.trim().replace(/"/g, '""') + '"'; });
      });
      var csv = [headers.join(';')].concat(csvRows.map(function(r) { return r.join(';'); })).join('\n');
      var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'activite_utilisateurs_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      pushNotification('Export CSV genere.', 'success');
    });
  }

  // ── Auto-refresh every 2 minutes ───────────────────────────────────────────
  setInterval(function() {
    loadData().catch(function() {});
  }, 120000);

  // ── Window resize handler for chart ────────────────────────────────────────
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { renderRoleChart(); }, 250);
  });

  loadData();
});
