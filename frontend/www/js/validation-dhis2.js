document.addEventListener('DOMContentLoaded', async () => {
  let pendingItems = [];
  await loadPendingData();
  bindRowActions();

  function updateStatsCards(data) {
    if (!data || !data.length) return;

    const totalMosquitoes = data.reduce((s, d) => s + Number(d.nombre_individus || 0), 0);

    const anopheles = data.filter(d => {
      const espece = (d.espece || d.espece_detectee || d.identification_ia || '').toLowerCase();
      return espece.startsWith('an.');
    });
    const anophelesCount = anopheles.reduce((s, d) => s + Number(d.nombre_individus || 0), 0);
    const densityRate = totalMosquitoes > 0 ? ((anophelesCount / totalMosquitoes) * 100) : 0;

    const parityItems = data.filter(d => d.parite === true || d.parite === 1 || (d.statut_parite && d.statut_parite !== 'non'));
    const parityRate = data.length > 0 ? ((parityItems.length / data.length) * 100) : 0;

    const infected = data.filter(d => d.sporozoite === true || d.sporozoite === 1 || d.infecte === true);
    const infectionRate = totalMosquitoes > 0 ? ((infected.reduce((s, d) => s + Number(d.nombre_individus || 0), 0) / totalMosquitoes) * 100) : 0;

    function setStat(key, value, fmt) {
      const el = document.querySelector(`[data-stat="${key}"] p.tracking-light`);
      if (el) el.textContent = fmt ? fmt(value) : value;
    }
    function setChange(key, value, fmt) {
      const el = document.querySelector(`[data-stat-change="${key}"]`);
      if (!el) return;
      const formatted = fmt ? fmt(value) : value;
      el.textContent = formatted;
      el.className = 'text-base font-medium ' + (value > 0 ? 'text-green-600 dark:text-green-400' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400');
    }

    setStat('total-mosquitoes', totalMosquitoes, v => v.toLocaleString('fr-FR'));
    setStat('density-rate', densityRate, v => v.toFixed(1) + '%');
    setStat('parity-rate', parityRate, v => Math.round(v) + '%');
    setStat('infection-rate', infectionRate, v => v.toFixed(1) + '%');

    setChange('total-mosquitoes', data.length, v => v + ' en attente');
    setChange('density-rate', anopheles.length, v => v + ' Anopheles');
    setChange('parity-rate', parityItems.length, v => v + ' parviens');
    setChange('infection-rate', infected.length, v => v + ' sporozoite+');
  }

  updateStatsCards(pendingItems);

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim().includes('Valider tout') || btn.textContent.trim().includes('Tout valider') || btn.id === 'btn-validate-push') {
      btn.addEventListener('click', () => {
        openModal('Valider toutes les données',
          `<div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-brand-success text-3xl">done_all</span>
            <div>
              <p class="font-medium">Valider et envoyer toutes les données en attente ?</p>
              <p class="text-sm text-gray-500">Cette action ne peut pas être annulée.</p>
            </div>
          </div>`,
          {
            confirmLabel: 'Valider tout',
            confirmClass: 'bg-brand-success text-white',
            onConfirm: async () => {
              buttonLoading(btn, true);
              try {
                const pending = await apiDhis2.listPending();
                if (pending && pending.length) {
                  let ok = true;
                  for (const item of pending) {
                    const res = await apiDhis2.validate(item.id, { statut: 'valide' });
                    if (!res) ok = false;
                  }
                  if (ok) {
                    const status = await apiDhis2.getStatus();
                    if (status?.credentials_ready) await apiDhis2.sync(status.config_id);
                    pushNotification('Toutes les données validées et envoyées à DHIS2.', 'success');
                    if (window.EntomoEvents) EntomoEvents.dispatch('capture-validated', { bulk: true });
                    await loadPendingData();
                  }
                } else {
                  pushNotification('Aucune donnée en attente.', 'info');
                }
              } catch (err) { pushNotification('Erreur lors de la validation.', 'error'); }
              buttonLoading(btn, false);
            },
          }
        );
      });
    }

    if (btn.textContent.trim().includes('Forcer sync') || btn.textContent.trim().includes('Synchroniser')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        try {
          const res = await apiDhis2.sync();
          if (res) pushNotification('Synchronisation DHIS2 lancée.', 'info');
        } catch (err) { pushNotification('Erreur lors de la synchronisation.', 'error'); }
        buttonLoading(btn, false);
      });
    }
  });

  document.getElementById('btn-date-range')?.addEventListener('click', () => {
    openModal('Sélectionner une période', `<div class="grid grid-cols-2 gap-3"><label class="text-sm">Du<input id="validation-date-from" type="date" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"></label><label class="text-sm">Au<input id="validation-date-to" type="date" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"></label></div>`, {
      confirmLabel: 'Appliquer',
      onConfirm: () => {
        const from = document.getElementById('validation-date-from')?.value;
        const to = document.getElementById('validation-date-to')?.value;
        document.querySelectorAll('tbody tr[data-id]').forEach(row => {
          const item = pendingItems.find(entry => String(entry.id) === row.dataset.id);
          const date = String(item?.date_capture || item?.created_at || '').slice(0, 10);
          row.classList.toggle('hidden', Boolean((from && date < from) || (to && date > to)));
        });
        const label = document.querySelector('#btn-date-range .truncate');
        if (label) label.textContent = from || to ? `${from || '…'} → ${to || '…'}` : 'Toutes les dates';
      },
    });
  });

  document.getElementById('btn-export-validation')?.addEventListener('click', () => {
    const rows = [['Identifiant', 'Type', 'Date', 'Statut'], ...pendingItems.map(item => [item.id, item.type || 'capture', item.date_capture || item.created_at || '', item.statut || 'a_valider'])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], {type: 'text/csv;charset=utf-8'}));
    link.download = `validation-dhis2-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    pushNotification('Export CSV généré.', 'success');
  });

  document.getElementById('btn-flag-review')?.addEventListener('click', () => {
    if (!pendingItems.length) { pushNotification('Aucune donnée à signaler.', 'info'); return; }
    openModal('Signaler pour révision', `<label class="block text-sm font-medium">Motif<textarea id="review-note" class="mt-1 h-24 w-full rounded-lg border-gray-300 dark:bg-gray-700" placeholder="Précisez le contrôle à effectuer"></textarea></label>`, {
      confirmLabel: 'Signaler',
      onConfirm: async () => {
        const note = document.getElementById('review-note')?.value.trim();
        if (!note) { pushNotification('Le motif est obligatoire.', 'warning'); return false; }
        await Promise.all(pendingItems.map(item => apiCaptures.update(item.id, {notes: note, statut: 'a_valider'})));
        pushNotification(`${pendingItems.length} donnée(s) signalée(s) pour révision.`, 'success');
      },
    });
  });

  async function loadPendingData() {
    showLoader();
    try {
      const data = await apiDhis2.listPending();
      hideLoader();
      if (!data) return;
      pendingItems = data;
      updateStatsCards(data);
      const countEl = document.querySelector('[data-count="pending"]');
      if (countEl) countEl.textContent = data.length || 0;
      const tableBody = document.querySelector('tbody');
      if (tableBody) {
        tableBody.innerHTML = data.length ? data.map(d => `
          <tr data-id="${d.id}" class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="px-4 py-3 text-sm">${d.nom || d.id || '—'}</td>
            <td class="px-4 py-3 text-sm">${d.type || 'capture'}</td>
            <td class="px-4 py-3 text-sm">${d.date_capture || d.created_at ? new Date(d.date_capture || d.created_at).toLocaleDateString('fr-FR') : '—'}</td>
            <td class="px-4 py-3 text-sm"><span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">En attente</span></td>
            <td class="px-4 py-3 text-sm">
              <div class="flex gap-1">
                <button class="btn-valider px-2 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Valider</button>
                <button class="btn-rejeter px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Rejeter</button>
                <button class="btn-voir px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Voir</button>
              </div>
            </td>
          </tr>`).join('') : '<tr><td colspan="5" class="text-center py-10 text-gray-400">Aucune donnée en attente de validation</td></tr>';
        bindRowActions();
      }
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des données.', 'error');
    }
  }

  function bindRowActions() {
    document.querySelectorAll('.btn-valider').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const id = row?.dataset?.id;
        if (!id) { pushNotification('ID introuvable.', 'error'); return; }
        openModal('Confirmer la validation',
          `<div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-brand-success text-3xl">verified</span>
            <div>
              <p class="font-medium">Valider et transmettre à DHIS2 ?</p>
              <p class="text-sm text-gray-500">La donnée sera envoyée sur le serveur DHIS2 configuré.</p>
            </div>
          </div>`,
          {
            confirmLabel: 'Valider & Envoyer',
            confirmClass: 'bg-brand-success text-white',
            onConfirm: async () => {
              buttonLoading(btn, true);
              try {
                const res = await apiDhis2.validateAndPush(id, { statut: 'valide' });
                if (res) {
                  pushNotification('Données validées et transmises à DHIS2.', 'success');
                  if (window.EntomoEvents) EntomoEvents.dispatch('capture-validated', { id });
                  await loadPendingData();
                }
              } catch (err) { pushNotification('Erreur lors de la validation.', 'error'); }
              buttonLoading(btn, false);
            },
          }
        );
      });
    });

    document.querySelectorAll('.btn-rejeter').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const id = row?.dataset?.id;
        if (!id) { pushNotification('ID introuvable.', 'error'); return; }
        openModal('Rejeter la donnée',
          `<div class="space-y-3 text-sm">
            <p>Sélectionnez le motif du rejet :</p>
            <select id="reject-reason" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              <option value="incomplet">Données incomplètes</option>
              <option value="format">Format incorrect</option>
              <option value="hors_plage">Hors plage valide</option>
              <option value="doublon">Doublon détecté</option>
              <option value="autre">Autre</option>
            </select>
            <textarea id="reject-comment" placeholder="Commentaire (optionnel)..."
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-16 resize-none"></textarea>
          </div>`,
          {
            confirmLabel: 'Rejeter',
            confirmClass: 'bg-red-600 text-white',
            onConfirm: async () => {
              buttonLoading(btn, true);
              try {
                const motif = document.getElementById('reject-reason')?.value || '';
                const commentaire = document.getElementById('reject-comment')?.value || '';
                const notes = [motif && `Motif: ${motif}`, commentaire].filter(Boolean).join(' — ');
                const res = await apiDhis2.validate(id, {
                  statut: 'rejete',
                  notes: notes || undefined,
                });
                if (res) {
                  const badge = row?.querySelector('[class*="rounded-full"]');
                  if (badge) {
                    badge.className = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                    badge.textContent = 'Rejeté';
                  }
                  row?.classList.add('opacity-50');
                  pushNotification('Donnée rejetée.', 'warning');
                  await loadPendingData();
                }
              } catch (err) { pushNotification('Erreur lors du rejet.', 'error'); }
              buttonLoading(btn, false);
            },
          }
        );
      });
    });

    document.querySelectorAll('.btn-voir').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        if (!row) return;
        const cells = Array.from(row.cells).map(c => c.textContent.trim());
        openModal('Détails de la donnée',
          `<div class="grid grid-cols-2 gap-2 text-sm">
            ${cells.map((v, i) => `<div><span class="text-gray-500">Champ ${i + 1}</span><br/><strong>${v}</strong></div>`).join('')}
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '' }
        );
      });
    });
  }
});
