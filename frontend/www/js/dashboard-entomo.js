/**
 * dashboard-entomo.js
 * Tableau de bord de surveillance entomologique — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  let currentFilters = {};

  // ── Chargement des stats depuis le backend ───────────────────────────────────
  async function loadDashboardStats() {
    try {
      const stats = typeof apiDashboard !== 'undefined' ? await apiDashboard.stats() : null;
      if (!stats) {
        showOfflineMessage();
        return;
      }
      hideOfflineMessage();

      const map = {
        'total-captures':  stats.captures?.total,
        'sites-actifs':    stats.sites?.actifs,
        'modeles-deployes': stats.modeles?.deployes,
        'utilisateurs':    stats.utilisateurs?.actifs,
        'a-valider':       stats.captures?.a_valider,
      };
      Object.entries(map).forEach(([key, val]) => {
        if (val === undefined) return;
        const el = document.querySelector(`[data-stat="${key}"]`);
        if (el) {
          const old = parseFloat(el.textContent) || 0;
          animateNumber(el, old, val, 0);
        }
      });

      if (stats.dhis2?.derniere_sync) {
        const syncEl = document.querySelector('[data-last-sync]');
        if (syncEl) syncEl.textContent = new Date(stats.dhis2.derniere_sync).toLocaleString('fr-FR');
      }

      if (stats.alertes?.length) {
        renderAlertes(stats.alertes);
      }
    } catch (err) {
      console.warn('[dashboard-entomo] loadDashboardStats error:', err);
      showOfflineMessage();
    }
  }

  function showOfflineMessage() {
    const container = document.querySelector('[data-stats-container]');
    if (container) {
      let msg = container.querySelector('.offline-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'offline-msg col-span-full text-center py-8 text-gray-500 dark:text-gray-400';
        container.prepend(msg);
      }
      msg.innerHTML = '<span class="material-symbols-outlined text-3xl mb-2">cloud_off</span><p>Backend hors ligne. Les données ne peuvent pas être chargées.</p>';
    }
  }

  function hideOfflineMessage() {
    const msg = document.querySelector('.offline-msg');
    if (msg) msg.remove();
  }

  // ── Chargement des graphiques ────────────────────────────────────────────────
  async function loadCharts() {
    try {
      const [parEspece, parSite] = await Promise.all([
        typeof apiDashboard !== 'undefined' ? apiDashboard.capturesParEspece() : null,
        typeof apiDashboard !== 'undefined' ? apiDashboard.capturesParSite() : null,
      ]);

      if (parEspece && parEspece.length) {
        renderEspeceChart(parEspece);
      }
      if (parSite && parSite.length) {
        renderSiteChart(parSite);
      }
    } catch (err) {
      console.warn('[dashboard-entomo] loadCharts error:', err);
    }
  }

  function renderEspeceChart(data) {
    const canvas = document.getElementById('chart-espece');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = data.map(d => d.espece || d.nom || 'Inconnu');
    const values = data.map(d => d.count || d.total || 0);

    const max = Math.max(...values, 1);
    const barWidth = Math.max(8, Math.min(40, (canvas.width - 40) / labels.length - 4));
    const height = canvas.height - 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    values.forEach((v, i) => {
      const x = 20 + i * (barWidth + 4);
      const barH = (v / max) * height;
      const y = canvas.height - 20 - barH;

      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 20);
      gradient.addColorStop(0, '#0891b2');
      gradient.addColorStop(1, '#06b6d4');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.fillText(labels[i].length > 12 ? labels[i].slice(0, 12) + '…' : labels[i], x + barWidth / 2, canvas.height - 6);

      ctx.fillStyle = '#111418';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(v, x + barWidth / 2, y - 4);
    });
  }

  function renderSiteChart(data) {
    const canvas = document.getElementById('chart-site');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = data.map(d => d.site || d.nom || 'Inconnu');
    const values = data.map(d => d.count || d.total || 0);

    const max = Math.max(...values, 1);
    const barWidth = Math.max(8, Math.min(40, (canvas.width - 40) / labels.length - 4));
    const height = canvas.height - 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    values.forEach((v, i) => {
      const x = 20 + i * (barWidth + 4);
      const barH = (v / max) * height;
      const y = canvas.height - 20 - barH;

      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 20);
      gradient.addColorStop(0, '#7c3aed');
      gradient.addColorStop(1, '#a78bfa');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.fillText(labels[i].length > 12 ? labels[i].slice(0, 12) + '…' : labels[i], x + barWidth / 2, canvas.height - 6);

      ctx.fillStyle = '#111418';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(v, x + barWidth / 2, y - 4);
    });
  }

  // ── Alertes ──────────────────────────────────────────────────────────────────
  function renderAlertes(alertes) {
    const container = document.querySelector('[data-alertes-container]');
    if (!container) return;

    container.innerHTML = alertes.map(a => `
      <div class="flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 ${a.critique ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500' : 'bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-yellow-500'}">
        <span class="material-symbols-outlined ${a.critique ? 'text-red-500' : 'text-yellow-500'} text-xl flex-shrink-0">${a.critique ? 'warning' : 'info'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[#111418] dark:text-white">${a.titre || 'Alerte'}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${a.localisation || ''} — ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</p>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${a.description || ''}</p>
        </div>
        <button class="voir-details-alerte text-brand-primary text-xs font-medium hover:underline flex-shrink-0">Voir détails</button>
      </div>
    `).join('');

    container.querySelectorAll('.voir-details-alerte').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = alertes[idx];
        if (!a) return;
        openModal(a.titre || 'Alerte',
          `<div class="space-y-3 text-sm">
            <p><strong>Localisation :</strong> ${a.localisation || 'N/A'}</p>
            <p><strong>Date de détection :</strong> ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : 'N/A'}</p>
            <p><strong>Densité observée :</strong> ${a.densite_observee || 'N/A'}</p>
            <p><strong>Seuil d'alerte :</strong> ${a.seuil_alerte || 'N/A'}</p>
            <p><strong>Statut :</strong> <span class="${a.traite ? 'text-green-500' : 'text-red-500'} font-medium">${a.traite ? 'Traité' : 'Non traité'}</span></p>
            <hr class="dark:border-gray-700"/>
            <p class="text-gray-500 dark:text-gray-400">${a.description || 'Aucune information complémentaire.'}</p>
          </div>`,
          {
            confirmLabel: 'Planifier une intervention',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Intervention planifiée avec succès.', 'success'),
          }
        );
      });
    });
  }

  // ── Filtres de la barre supérieure ──────────────────────────────────────────
  const filterConfigs = {
    'Période': ['Semaine en cours', 'Mois en cours', 'Trimestre', 'Année en cours', 'Personnalisée'],
    'Localisation': ['Tout le pays'],
    'Espèce': ['Toutes'],
    'Environnement': ['Tous'],
  };

  const localisations = await loadReferenceData('localisations');
  if (localisations.length) {
    filterConfigs['Localisation'].push(...localisations.map(l => l.label));
  }

  const especes = await loadReferenceData('especes');
  if (especes.length) {
    filterConfigs['Espèce'].push(...especes.map(e => e.label));
  }

  const environnements = await loadReferenceData('environnements');
  if (environnements.length) {
    filterConfigs['Environnement'].push(...environnements.map(e => e.label));
  }

  const typesIntervention = await loadReferenceData('types_intervention');

  document.querySelectorAll('div.flex.gap-3.py-3 button').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.querySelector('p')?.textContent || '';
      const key = Object.keys(filterConfigs).find(k => text.startsWith(k));
      if (!key) return;
      showDropdown(btn, key, filterConfigs[key], val => {
        if (btn.querySelector('p')) btn.querySelector('p').textContent = `${key}: ${val}`;
        currentFilters[key] = val;
        pushNotification(`Filtre "${key}" mis à jour : ${val}`, 'info');
        reloadWithFilters();
      });
    });
  });

  function showDropdown(anchor, title, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'filter-dd absolute z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[200px] py-1 mt-1';

    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = 'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-[#111418] dark:text-gray-200';
      item.textContent = opt;
      item.addEventListener('click', () => { onSelect(opt); dd.remove(); });
      dd.appendChild(item);
    });

    anchor.style.position = 'relative';
    anchor.appendChild(dd);
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }), 100);
  }

  async function reloadWithFilters() {
    try {
      if (typeof apiDashboard !== 'undefined') {
        const params = {};
        if (currentFilters['Localisation'] && currentFilters['Localisation'] !== 'Tout le pays') params.location = currentFilters['Localisation'];
        if (currentFilters['Espèce'] && currentFilters['Espèce'] !== 'Toutes') params.espece = currentFilters['Espèce'];
        if (currentFilters['Environnement'] && currentFilters['Environnement'] !== 'Tous') params.environnement = currentFilters['Environnement'];
        if (currentFilters['Période'] && currentFilters['Période'] !== 'Personnalisée') params.period = currentFilters['Période'];

        const stats = await apiDashboard.stats();
        if (stats) {
          const map = {
            'total-captures': stats.captures?.total,
            'sites-actifs': stats.sites?.actifs,
            'modeles-deployes': stats.modeles?.deployes,
            'utilisateurs': stats.utilisateurs?.actifs,
            'a-valider': stats.captures?.a_valider,
          };
          Object.entries(map).forEach(([key, val]) => {
            if (val === undefined) return;
            const el = document.querySelector(`[data-stat="${key}"]`);
            if (el) animateNumber(el, parseFloat(el.textContent) || 0, val, 0);
          });
        }
      }
    } catch (err) {
      console.warn('[dashboard-entomo] reloadWithFilters error:', err);
    }
  }

  // ── Animation des cartes métriques ──────────────────────────────────────────
  function animateNumber(el, from, to, decimals = 1, duration = 600) {
    const start = performance.now();
    const update = now => {
      const progress = Math.min((now - start) / duration, 1);
      const value = from + (to - from) * easeOut(progress);
      el.textContent = value.toFixed(decimals);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ── Boutons d'action ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Exporter')) {
      btn.addEventListener('click', async () => {
        buttonLoading(btn, true);
        showLoader();
        try {
          if (typeof apiCaptures !== 'undefined') {
            const data = await apiCaptures.list({ limit: 10000 });
            if (data) {
              pushNotification(`${data.length} captures exportées.`, 'success');
            }
          }
        } catch (err) {
          pushNotification("Erreur lors de l'export.", 'error');
        } finally {
          hideLoader();
          buttonLoading(btn, false);
        }
      });
    }

    if (text.includes('Planifier une Intervention') && !btn.closest('[id="universal-modal"]')) {
      btn.addEventListener('click', () => {
        const interventionOptions = typesIntervention.map(t => `<option>${t.label}</option>`).join('');
        openModal('Planifier une Intervention',
          `<div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type d'intervention</label>
              <select id="intervention-type" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
                ${interventionOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date prévue</label>
              <input id="intervention-date" type="date" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"
                     value="${new Date().toISOString().split('T')[0]}"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
              <textarea id="intervention-notes" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 resize-none h-20"
                        placeholder="Informations complémentaires..."></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Planifier',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              showLoader();
              try {
                if (typeof apiSites !== 'undefined') {
                  await apiSites.addActivite(0, {
                    type: document.getElementById('intervention-type')?.value || 'IRS',
                    date: document.getElementById('intervention-date')?.value || new Date().toISOString().split('T')[0],
                    notes: document.getElementById('intervention-notes')?.value || '',
                  });
                }
                pushNotification('Intervention planifiée et enregistrée.', 'success');
              } catch (err) {
                pushNotification("Erreur lors de la planification.", 'error');
              } finally {
                hideLoader();
              }
            },
          }
        );
      });
    }
  });

  // ── Bouton "Voir tout" des alertes ──────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim() === 'Voir tout') {
      btn.addEventListener('click', async () => {
        showLoader();
        try {
          if (typeof apiDashboard !== 'undefined') {
            const stats = await apiDashboard.stats();
            if (stats?.alertes?.length) {
              const alertesHtml = stats.alertes.map(a => `
                <div class="p-3 rounded-lg ${a.critique ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500' : 'bg-gray-50 dark:bg-gray-700/50'}">
                  <p class="font-medium text-sm text-[#111418] dark:text-white">${a.titre || 'Alerte'}</p>
                  <p class="text-xs text-gray-500">${a.localisation || ''} — ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${a.description || ''}</p>
                </div>
              `).join('');
              openModal('Toutes les alertes',
                `<div class="space-y-2 max-h-80 overflow-y-auto text-sm">${alertesHtml}</div>`,
                { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
              );
            } else {
              openModal('Toutes les alertes',
                `<div class="text-center py-8 text-gray-500 dark:text-gray-400"><span class="material-symbols-outlined text-3xl">check_circle</span><p class="mt-2">Aucune alerte pour le moment.</p></div>`,
                { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
              );
            }
          }
        } catch (err) {
          pushNotification("Erreur lors du chargement des alertes.", 'error');
        } finally {
          hideLoader();
        }
      });
    }
  });

  // ── Marqueurs carte interactifs ─────────────────────────────────────────────
  document.querySelectorAll('[class*="absolute"][class*="top-"] button.group').forEach(markerBtn => {
    markerBtn.addEventListener('click', async () => {
      const tooltip = markerBtn.querySelector('div');
      const city = tooltip?.querySelector('p.font-bold')?.textContent || 'Site';

      showLoader();
      try {
        if (typeof apiSites !== 'undefined') {
          const sites = await apiSites.list({ search: city, limit: 1 });
          if (sites?.length) {
            const s = sites[0];
            openModal(`Détails — ${city}`,
              `<div class="space-y-2 text-sm">
                <p><strong>Niveau de risque :</strong> <span class="font-semibold ${s.niveau_risque === 'Élevé' || s.niveau_risque === 'Critique' ? 'text-red-500' : 'text-yellow-500'}">${s.niveau_risque || 'Inconnu'}</span></p>
                <p><strong>Dernière inspection :</strong> ${s.derniere_inspection ? new Date(s.derniere_inspection).toLocaleDateString('fr-FR') : 'N/A'}</p>
                <p><strong>Espèces présentes :</strong> ${s.especes_presentes || 'N/A'}</p>
                <p><strong>Densité moyenne :</strong> ${s.densite_moyenne || 'N/A'}</p>
              </div>`,
              {
                confirmLabel: 'Planifier une intervention',
                confirmClass: 'bg-brand-primary text-white',
                onConfirm: () => pushNotification(`Intervention planifiée pour ${city}.`, 'success'),
              }
            );
            return;
          }
        }
        openModal(`Détails — ${city}`,
          `<div class="text-center py-6 text-gray-500 dark:text-gray-400"><p>Données non disponibles pour ce site.</p></div>`,
          { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
        );
      } catch (err) {
        pushNotification("Erreur lors du chargement des détails du site.", 'error');
      } finally {
        hideLoader();
      }
    });
  });

  // ── Sélecteurs de filtres zone/espèce ───────────────────────────────────────
  document.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('change', () => {
      pushNotification(`Filtre appliqué : ${sel.id || 'sélection'} → ${Array.from(sel.selectedOptions).map(o => o.text).join(', ')}`, 'info');
      reloadWithFilters();
    });
  });

  // ── Mise à jour périodique ──────────────────────────────────────────────────
  function startLiveUpdate() {
    setInterval(async () => {
      if (typeof apiDashboard !== 'undefined') {
        await loadDashboardStats();
      }
    }, 60000);
  }

  // ── Initialisation ──────────────────────────────────────────────────────────
  await Promise.all([loadDashboardStats(), loadCharts()]);
  setTimeout(startLiveUpdate, 2000);

});
