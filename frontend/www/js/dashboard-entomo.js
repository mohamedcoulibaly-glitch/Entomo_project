/**
 * dashboard-entomo.js
 * Tableau de bord de surveillance entomologique — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Chargement des stats depuis le backend ───────────────────────────────────
  async function loadDashboardStats() {
    if (typeof apiDashboard === 'undefined') return;
    const stats = await apiDashboard.stats();
    if (!stats) return;

    // Mettre à jour les cartes métriques si elles ont des data-stat
    const map = {
      'total-captures':  stats.captures?.total,
      'sites-actifs':    stats.sites?.actifs,
      'modeles-deployes':stats.modeles?.deployes,
      'utilisateurs':    stats.utilisateurs?.actifs,
      'a-valider':       stats.captures?.a_valider,
    };
    Object.entries(map).forEach(([key, val]) => {
      if (val === undefined) return;
      const el = document.querySelector(`[data-stat="${key}"]`);
      if (el) animateNumber(el, 0, val, 0);
    });

    // Dernière sync DHIS2
    if (stats.dhis2?.derniere_sync) {
      const syncEl = document.querySelector('[data-last-sync]');
      if (syncEl) syncEl.textContent = new Date(stats.dhis2.derniere_sync).toLocaleString('fr-FR');
    }
  }

  loadDashboardStats();

  // ── Filtres de la barre supérieure ──────────────────────────────────────────
  const filterConfigs = {
    'Période'     : ['Semaine en cours','Mois en cours','Trimestre','Année en cours','Personnalisée'],
    'Localisation': ['Tout le pays','Dakar','Thiès','Kaolack','Kédougou','Kolda','Tambacounda','Saint-Louis','Ziguinchor'],
    'Espèce'      : ['Toutes','An. gambiae','An. funestus','An. arabiensis','Culex quinquefasciatus'],
    'Environnement': ['Tous','Urbain','Rural','Périurbain'],
  };

  document.querySelectorAll('div.flex.gap-3.py-3 button').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.querySelector('p')?.textContent || '';
      const key  = Object.keys(filterConfigs).find(k => text.startsWith(k));
      if (!key) return;
      showDropdown(btn, key, filterConfigs[key], val => {
        if (btn.querySelector('p')) btn.querySelector('p').textContent = `${key}: ${val}`;
        pushNotification(`Filtre "${key}" mis à jour : ${val}`, 'info');
        animateMetricCards();
      });
    });
  });

  function showDropdown(anchor, title, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = `filter-dd absolute z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl
                    border border-gray-200 dark:border-gray-700 min-w-[200px] py-1 mt-1`;

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

  // ── Animation des cartes métriques ──────────────────────────────────────────
  function animateMetricCards() {
    document.querySelectorAll('.grid .flex.flex-col.gap-2.rounded-xl').forEach(card => {
      card.classList.add('ring-2', 'ring-brand-primary/30');
      const numEl = card.querySelector('p:nth-child(2)');
      if (numEl && !isNaN(parseFloat(numEl.textContent))) {
        animateNumber(numEl, parseFloat(numEl.textContent), parseFloat(numEl.textContent) * (0.9 + Math.random() * 0.2));
      }
      setTimeout(() => card.classList.remove('ring-2', 'ring-brand-primary/30'), 800);
    });
  }

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

  // ── Boutons d'action sur les alertes ───────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Voir détails')) {
      btn.addEventListener('click', () => {
        const alertBox = btn.closest('.flex.flex-col');
        const title = alertBox?.querySelector('p:nth-child(2)')?.textContent || 'Alerte';
        openModal(title,
          `<div class="space-y-3 text-sm">
            <p><strong>Localisation :</strong> Kédougou, Zone Sud</p>
            <p><strong>Date de détection :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>Densité observée :</strong> 35.2 moustiques/nuit</p>
            <p><strong>Seuil d'alerte :</strong> 25 moustiques/nuit</p>
            <p><strong>Statut :</strong> <span class="text-red-500 font-medium">Non traité</span></p>
            <hr class="dark:border-gray-700"/>
            <p class="text-gray-500 dark:text-gray-400">Une hausse soudaine de la densité de An. gambiae a été enregistrée.
            Une intervention IRS est recommandée dans les 48h.</p>
          </div>`,
          {
            confirmLabel: 'Planifier une intervention',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Intervention planifiée avec succès.', 'success'),
          }
        );
      });
    }

    if (text.includes('Intervenir')) {
      btn.addEventListener('click', () => {
        openModal('Planifier une Intervention',
          `<div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type d'intervention</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
                <option>Pulvérisation intradomiciliaire (IRS)</option>
                <option>Distribution de moustiquaires (MILDA)</option>
                <option>Larvicidage</option>
                <option>Inspection et surveillance renforcée</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date prévue</label>
              <input type="date" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"
                     value="${new Date().toISOString().split('T')[0]}"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
              <textarea class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 resize-none h-20"
                        placeholder="Informations complémentaires..."></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Planifier',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Intervention planifiée et enregistrée.', 'success'),
          }
        );
      });
    }

    if (text.includes('Exporter')) {
      btn.addEventListener('click', () => {
        showLoader();
        setTimeout(() => {
          hideLoader();
          pushNotification('Export PDF/CSV prêt au téléchargement.', 'success');
        }, 1800);
      });
    }

    if (text.includes('Planifier une Intervention') && !btn.closest('[id="universal-modal"]')) {
      btn.addEventListener('click', () => {
        // Déclenche le même flux que "Intervenir"
        btn.dispatchEvent(new CustomEvent('click-plan'));
      });
    }
  });

  // ── Bouton "Voir tout" des alertes ──────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim() === 'Voir tout') {
      btn.addEventListener('click', () => {
        openModal('Toutes les alertes',
          `<div class="space-y-2 max-h-80 overflow-y-auto text-sm">
            ${['Alerte Critique — Kédougou (An. gambiae +40%)','Alerte Modérée — Tambacounda (An. funestus)','Info — Matam (Rapport résistance insecticides)','Info — Ziguinchor (Inspection routine)']
              .map(a => `<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">${a}</div>`).join('')}
          </div>`,
          { confirmLabel: 'Fermer', cancelLabel: '', onConfirm: () => {} }
        );
      });
    }
  });

  // ── Marqueurs carte interactifs ─────────────────────────────────────────────
  document.querySelectorAll('[class*="absolute"][class*="top-"] button.group').forEach(markerBtn => {
    markerBtn.addEventListener('click', () => {
      const tooltip = markerBtn.querySelector('div');
      const city    = tooltip?.querySelector('p.font-bold')?.textContent || 'Site';
      const risk    = tooltip?.querySelector('p:last-child')?.textContent || '';
      openModal(`Détails — ${city}`,
        `<div class="space-y-2 text-sm">
          <p><strong>Niveau de risque :</strong> <span class="font-semibold ${risk.includes('Élevé')?'text-red-500':'text-yellow-500'}">${risk}</span></p>
          <p><strong>Dernière inspection :</strong> ${new Date(Date.now()-86400000*2).toLocaleDateString('fr-FR')}</p>
          <p><strong>Espèces présentes :</strong> An. gambiae, An. funestus</p>
          <p><strong>Densité moyenne :</strong> ${(Math.random()*30+5).toFixed(1)} moustiques/nuit</p>
        </div>`,
        {
          confirmLabel: 'Planifier une intervention',
          confirmClass: 'bg-brand-primary text-white',
          onConfirm: () => pushNotification(`Intervention planifiée pour ${city}.`, 'success'),
        }
      );
    });
  });

  // ── Sélecteurs de filtres zone/espèce ───────────────────────────────────────
  document.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('change', () => {
      pushNotification(`Filtre appliqué : ${sel.id || 'sélection'} → ${Array.from(sel.selectedOptions).map(o=>o.text).join(', ')}`, 'info');
      animateMetricCards();
    });
  });

  // ── Simulation de mise à jour en temps réel ─────────────────────────────────
  let updateInterval = null;

  function startLiveUpdate() {
    if (updateInterval) return;
    // Rafraîchir les stats réelles toutes les 60s si API disponible
    updateInterval = setInterval(async () => {
      if (typeof apiDashboard !== 'undefined') {
        await loadDashboardStats();
      } else {
        // fallback : animer les chiffres
        const metricEls = document.querySelectorAll('.flex.flex-col.gap-2.rounded-xl p:nth-child(2)');
        metricEls.forEach(el => {
          if (!isNaN(parseFloat(el.textContent))) {
            const current = parseFloat(el.textContent);
            const delta   = (Math.random() - 0.5) * 0.4;
            animateNumber(el, current, Math.max(0, current + delta));
          }
        });
      }
    }, 60000);
  }

  // Démarrer après un court délai
  setTimeout(startLiveUpdate, 2000);

});
