document.addEventListener('DOMContentLoaded', async () => {
  let indicateurs = [];
  let selectedId = null;

  async function loadIndicateurs() {
    try {
      const data = await apiRequest('GET', '/indicateurs');
      if (data && data.length) indicateurs = data;
    } catch (err) {
      pushNotification('Erreur lors du chargement des indicateurs', 'error');
    }
    renderIndicatorList();
    if (indicateurs.length) {
      selectIndicator(indicateurs[0].id);
    } else {
      document.querySelector('[data-config-panel]')?.classList.add('hidden');
    }
  }

  function renderIndicatorList() {
    const container = document.querySelector('.flex.flex-col.divide-y');
    if (!container) return;
    container.innerHTML = indicateurs.map(ind => `
      <div class="flex items-center gap-4 px-4 min-h-[72px] py-2 cursor-pointer indicator-item
        ${selectedId === ind.id ? 'bg-primary/10 dark:bg-primary/20 border-l-4 border-primary' : 'bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
        data-id="${ind.id}">
        <div class="flex items-center gap-4">
          <div class="flex items-center justify-center rounded-lg shrink-0 size-12
            ${ind.statut === 'configure' ? 'text-success bg-success/20' : ind.statut === 'brouillon' ? 'text-warning bg-warning/20' : 'text-gray-500 bg-gray-200 dark:bg-gray-700'}">
            <span class="material-symbols-outlined">
              ${ind.statut === 'configure' ? 'check_circle' : ind.statut === 'brouillon' ? 'edit' : 'pending'}
            </span>
          </div>
          <div class="flex flex-col justify-center">
            <p class="text-base font-medium leading-normal line-clamp-1 ${selectedId === ind.id ? 'text-primary' : 'text-[#111418] dark:text-white'}">${ind.nom}</p>
            <p class="text-sm font-normal leading-normal line-clamp-2
              ${ind.statut === 'configure' ? 'text-success' : ind.statut === 'brouillon' ? 'text-warning' : 'text-[#617589] dark:text-gray-400'}">
              ${ind.statut === 'configure' ? 'Configuré' : ind.statut === 'brouillon' ? 'Brouillon' : 'Non configuré'}
            </p>
          </div>
        </div>
        ${ind.statut !== 'configure' ? '<div class="shrink-0 text-gray-400"><span class="material-symbols-outlined">chevron_right</span></div>' : ''}
      </div>
    `).join('');

    container.querySelectorAll('.indicator-item').forEach(item => {
      item.addEventListener('click', () => selectIndicator(parseInt(item.dataset.id)));
    });
  }

  function selectIndicator(id) {
    selectedId = id;
    const ind = indicateurs.find(x => x.id === id);
    if (!ind) return;
    renderIndicatorList();

    const panel = document.querySelector('[data-config-panel]');
    if (panel) {
      panel.classList.remove('hidden');
      document.getElementById('ind-nom').textContent = ind.nom;
      document.getElementById('ind-desc').textContent = ind.description || '';
      document.getElementById('numerator').value = ind.numerateur || '';
      document.getElementById('denominator').value = ind.denominateur || '';
      const formuleInput = document.getElementById('ind-formule');
      if (formuleInput) formuleInput.value = ind.formule || '';
      document.getElementById('seuil-bas').value = ind.seuil_bas || 10;
      document.getElementById('seuil-moyen').value = ind.seuil_moyen || 50;
      document.getElementById('seuil-eleve').value = ind.seuil_eleve || 50;
      const notifToggle = document.getElementById('notif-toggle');
      if (notifToggle) notifToggle.checked = ind.notifications_actives !== false;
      updatePreview(ind);
    }
  }

  function updatePreview(ind) {
    const valEl = document.querySelector('[data-preview-value]');
    if (!valEl) return;
    const val = ind.seuil_bas ? (ind.seuil_bas + ind.seuil_moyen) / 2 : 27.5;
    valEl.textContent = val.toFixed(1);
    const pct = Math.min(val / (ind.seuil_eleve || 50) * 50, 100);
    const needle = document.querySelector('[data-preview-needle]');
    if (needle) needle.style.left = `calc(${pct}% * (50 / ${ind.seuil_eleve || 50}))`;
  }

  function getIndicatorFormData() {
    const ind = indicateurs.find(x => x.id === selectedId);
    return {
      nom: document.getElementById('ind-nom')?.textContent || ind?.nom || '',
      description: document.getElementById('ind-desc')?.textContent || ind?.description || '',
      numerateur: document.getElementById('numerator')?.value || '',
      denominateur: document.getElementById('denominator')?.value || '',
      formule: document.getElementById('ind-formule')?.value || '',
      seuil_bas: parseFloat(document.getElementById('seuil-bas')?.value) || 10,
      seuil_moyen: parseFloat(document.getElementById('seuil-moyen')?.value) || 50,
      seuil_eleve: parseFloat(document.getElementById('seuil-eleve')?.value) || 50,
      notifications_actives: document.getElementById('notif-toggle')?.checked || false,
      statut: 'configure',
    };
  }

  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Enregistrer')) {
      btn.addEventListener('click', async () => {
        if (!selectedId) { pushNotification('Sélectionnez un indicateur.', 'warning'); return; }
        buttonLoading(btn, true);
        try {
          const data = getIndicatorFormData();
          const res = await apiRequest('PUT', `/indicateurs/${selectedId}`, data);
          if (res) {
            const idx = indicateurs.findIndex(x => x.id === selectedId);
            if (idx >= 0) indicateurs[idx] = res;
            renderIndicatorList();
            pushNotification('Indicateur enregistré.', 'success');
          }
        } catch (err) { pushNotification('Erreur lors de la sauvegarde.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (t.includes('Annuler')) {
      btn.addEventListener('click', () => {
        const ind = indicateurs.find(x => x.id === selectedId);
        if (ind) selectIndicator(ind.id);
        pushNotification('Modifications annulées.', 'info');
      });
    }
  });

  const searchInput = document.querySelector('input[placeholder*="Filtrer"]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      document.querySelectorAll('.indicator-item').forEach(item => {
        const nom = item.querySelector('p')?.textContent?.toLowerCase() || '';
        item.style.display = !q || nom.includes(q) ? '' : 'none';
      });
    });
  }

  const notifToggle = document.getElementById('notif-toggle');
  if (notifToggle) {
    notifToggle.addEventListener('change', () => {
      const ind = indicateurs.find(x => x.id === selectedId);
      if (ind) {
        ind.notifications_actives = notifToggle.checked;
        pushNotification(notifToggle.checked ? 'Notifications activées.' : 'Notifications désactivées.', 'info');
      }
    });
  }

  await loadIndicateurs();
});
