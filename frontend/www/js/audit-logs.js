document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  let logs = [];
  let filteredLogs = [];
  const PAGE_SIZE = 10;
  let currentPage = 1;

  async function loadLogs() {
    try {
      showLoader();
      const data = await apiAudit.list();
      if (data) logs = data;
      if (filterUser) {
        const names = [...new Set(logs.map(log => log.utilisateur_nom || log.username || log.utilisateur_id).filter(Boolean))].sort();
        filterUser.innerHTML = '<option value="tous">Tous</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
      }
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des logs.', 'error');
    }
    applyFilters();
  }

  const actionColorMap = {
    creation: 'bg-brand-primary/10 text-brand-primary',
    création: 'bg-brand-primary/10 text-brand-primary',
    create: 'bg-brand-primary/10 text-brand-primary',
    modification: 'bg-brand-alert-warning/10 text-brand-alert-warning',
    modify: 'bg-brand-alert-warning/10 text-brand-alert-warning',
    update: 'bg-brand-alert-warning/10 text-brand-alert-warning',
    suppression: 'bg-brand-alert-critical/10 text-brand-alert-critical',
    delete: 'bg-brand-alert-critical/10 text-brand-alert-critical',
    validation: 'bg-brand-success/10 text-brand-success',
    validate: 'bg-brand-success/10 text-brand-success',
    connexion: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    login: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    export: 'bg-brand-success/10 text-brand-success',
    sync: 'bg-brand-primary/10 text-brand-primary',
    logout: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  function renderTable(data) {
    const tbody = document.getElementById('logs-body');
    if (!tbody) return;
    filteredLogs = data;

    const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">history</span>Aucun log trouvé</td></tr>';
      updatePaginationInfo(data.length, 0, 0, 0);
      renderPaginationButtons(0);
      return;
    }

    tbody.innerHTML = pageData.map(log => {
      const action = (log.action || log.type_action || 'N/A').toLowerCase();
      const colorClass = actionColorMap[action] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      const actionLabel = log.action || log.type_action || 'N/A';
      const createdAt = log.created_at || log.date || log.date_creation || log.timestamp;
      const resource = [log.resource_type, log.resource_id != null ? `#${log.resource_id}` : ''].filter(Boolean).join(' ') || 'N/A';
      const ip = log.adresse_ip || log.ip_address || log.ip || 'N/A';
      return `<tr class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30" data-id="${log.id}">
        <td class="p-3 text-[#111418] dark:text-white font-medium">${log.utilisateur_nom || log.username || (log.utilisateur_id ? `Utilisateur #${log.utilisateur_id}` : 'Système')}</td>
        <td class="p-3"><span class="text-xs font-semibold ${colorClass} px-2 py-0.5 rounded-full">${actionLabel}</span></td>
        <td class="p-3 text-gray-500 dark:text-gray-400">${log.module || 'N/A'}</td>
        <td class="p-3 text-gray-500 dark:text-gray-400">${resource}</td>
        <td class="p-3 text-gray-500 dark:text-gray-400 font-mono text-xs">${ip}</td>
        <td class="p-3 text-gray-500 font-mono text-xs">${createdAt ? new Date(createdAt).toLocaleString('fr-FR') : 'N/A'}</td>
        <td class="p-3 text-center">
          <button class="btn-details text-brand-primary hover:underline text-xs font-semibold" title="Voir détails">Voir détails</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const log = filteredLogs.find(x => x.id === parseInt(btn.closest('tr').dataset.id));
        if (!log) return;
        openModal('Détails du log', `
          <div class="space-y-2 text-sm">
            <div><span class="text-gray-500">ID:</span> <strong class="font-mono">${log.id}</strong></div>
            <div><span class="text-gray-500">Date:</span> <strong>${log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : 'N/A'}</strong></div>
            <div><span class="text-gray-500">Module:</span> <strong>${log.module || 'N/A'}</strong></div>
            <div><span class="text-gray-500">Utilisateur:</span> <strong>${log.utilisateur_nom || log.username || (log.utilisateur_id ? '#' + log.utilisateur_id : 'N/A')}</strong></div>
            <div><span class="text-gray-500">Action:</span> <strong>${log.action || log.type_action || 'N/A'}</strong></div>
            <div><span class="text-gray-500">Ressource:</span> <strong>${log.resource_type || 'N/A'}${log.resource_id != null ? ` #${log.resource_id}` : ''}</strong></div>
            <div><span class="text-gray-500">Adresse IP:</span> <strong>${log.adresse_ip || log.ip_address || log.ip || 'N/A'}</strong></div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <p class="text-gray-500 mb-1">Description:</p>
              <p class="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap">${(log.description || log.details || log.message || 'Aucun détail').replace(/</g, '&lt;')}</p>
            </div>
            ${log.metadata ? `<div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2"><p class="text-gray-500 mb-1">Métadonnées:</p><pre class="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40">${JSON.stringify(log.metadata, null, 2).replace(/</g, '&lt;')}</pre></div>` : ''}
          </div>`, { confirmLabel: 'Fermer', cancelLabel: '' });
      });
    });

    updatePaginationInfo(data.length, start + 1, Math.min(start + PAGE_SIZE, data.length), totalPages);
    renderPaginationButtons(totalPages);
  }

  function updatePaginationInfo(total, from, to, pages) {
    const info = document.getElementById('pagination-info');
    if (info) info.textContent = total > 0 ? `Affichage ${from}-${to} sur ${total} entrées` : 'Aucune entrée';
  }

  function renderPaginationButtons(totalPages) {
    const container = document.getElementById('pagination-buttons');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold pagination-prev ${currentPage === 1 ? 'opacity-40 pointer-events-none' : ''}">Précédent</button>`;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="px-3 py-1.5 rounded-lg text-xs font-semibold pagination-page ${i === currentPage ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}" data-page="${i}">${i}</button>`;
    }

    html += `<button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold pagination-next ${currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''}">Suivant</button>`;
    container.innerHTML = html;

    container.querySelector('.pagination-prev')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(filteredLogs); } });
    container.querySelector('.pagination-next')?.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderTable(filteredLogs); } });
    container.querySelectorAll('.pagination-page').forEach(btn => {
      btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); renderTable(filteredLogs); });
    });
  }

  const filterModule = document.getElementById('filter-module');
  const filterUser = document.getElementById('filter-user');
  const filterAction = document.getElementById('filter-action');
  const filterDateStart = document.getElementById('filter-date-debut');

  function applyFilters() {
    const moduleVal = filterModule?.value || 'tous';
    const userVal = filterUser?.value || 'tous';
    const actionVal = filterAction?.value?.toLowerCase().trim() || 'toutes';
    const dateStart = filterDateStart?.value || '';

    let filtered = logs.filter(log => {
      const matchModule = moduleVal.toLowerCase() === 'tous' || (log.module || '').toLowerCase() === moduleVal.toLowerCase();
      const matchUser = userVal === 'tous' || (log.utilisateur_nom || log.username || '') === userVal || String(log.utilisateur_id) === userVal;
      const matchAction = actionVal === 'toutes' || (log.action || log.type_action || '').toLowerCase().includes(actionVal);
      const logDate = log.created_at || log.date || log.date_creation || log.timestamp || '';
      const logDateStr = logDate ? new Date(logDate).toISOString().split('T')[0] : '';
      const matchDateStart = !dateStart || logDateStr >= dateStart;
      return matchModule && matchUser && matchAction && matchDateStart;
    });
    currentPage = 1;
    renderTable(filtered);
  }

  [filterModule, filterUser, filterAction, filterDateStart].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
    if (el && el.tagName === 'INPUT') el.addEventListener('input', applyFilters);
  });

  document.getElementById('btn-filtrer')?.addEventListener('click', applyFilters);

  document.getElementById('btn-exporter-csv')?.addEventListener('click', () => {
    if (!filteredLogs.length) { pushNotification('Aucune donnée à exporter.', 'warning'); return; }
    const headers = ['Date', 'Utilisateur', 'Action', 'Module', 'Ressource', 'IP'];
    const rows = filteredLogs.map(log => {
      const createdAt = log.created_at || log.date || log.date_creation || log.timestamp;
      return [
        createdAt ? new Date(createdAt).toLocaleString('fr-FR') : 'N/A',
        log.utilisateur_nom || log.username || log.utilisateur_id || 'N/A',
        log.action || log.type_action || 'N/A',
        log.module || 'N/A',
        [log.resource_type, log.resource_id != null ? `#${log.resource_id}` : ''].filter(Boolean).join(' ') || 'N/A',
        log.adresse_ip || log.ip_address || log.ip || 'N/A'
      ];
    });
    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    pushNotification('Export CSV téléchargé.', 'success');
  });

  await loadLogs();
});
