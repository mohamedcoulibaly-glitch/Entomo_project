/**
 * pages-generiques.js
 * Comportements communs à toutes les pages restantes :
 * - validation-dhis2, statut-sync, param-sync, param-langues,
 * - analyse-donnees, config-indicateurs, config-modeles-risque,
 * - gestion-hors-ligne, gestion-modeles-visuels, dashboard-rapports-oms,
 * - dashboard-sync-dhis2, dashboard-utilisateurs, dashboard-entomo-region5
 */
document.addEventListener('DOMContentLoaded', () => {
  const hasDedicatedScript = fileName => Array.from(document.scripts).some(script => (script.src || '').endsWith(`/js/${fileName}`));

  // Les actions principales ouvrent désormais de vraies pages de formulaire.
  const creationRoutes = [
    ['#btn-nouvelle-capture', 'nouvelle-capture.html'],
    ['#btn-nouveau-site', 'nouveau-site.html'],
    ['#btn-nouvelle-campagne', 'nouvelle-campagne.html'],
    ['#btn-nouvelle-intervention', 'nouvelle-intervention.html'],
  ];
  creationRoutes.forEach(([selector, href]) => {
    document.querySelector(selector)?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = href;
    });
  });
  document.querySelectorAll('button').forEach(button => {
    const text = button.textContent.trim().toLowerCase();
    const href = text.includes('ajouter un utilisateur') ? 'nouvel-utilisateur.html'
      : text.includes('nouveau jeu de données') ? 'nouveau-dataset.html' : null;
    if (!href) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = href;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION DHIS2
  // ═══════════════════════════════════════════════════════════════════════════
  if ((document.title.includes('Validation') || window.location.pathname.includes('validation')) && !hasDedicatedScript('validation-dhis2.js')) {
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();

      if (text.includes('Valider') || text.includes('Accepter')) {
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          const name = row?.cells[0]?.textContent || 'Enregistrement';
          confirmValidation(name, row, 'valider');
        });
      }

      if (text.includes('Rejeter') || text.includes('Refuser')) {
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          const name = row?.cells[0]?.textContent || 'Enregistrement';
          openModal('Rejeter l\'enregistrement',
            `<div class="space-y-3">
              <p class="text-sm">Motif du rejet pour <strong>${name}</strong> :</p>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
                <option>Données incomplètes</option>
                <option>Format incorrect</option>
                <option>Données hors plage valide</option>
                <option>Doublon détecté</option>
                <option>Autre</option>
              </select>
              <textarea placeholder="Commentaire optionnel..." class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-16 resize-none"></textarea>
            </div>`,
            {
              confirmLabel: 'Rejeter',
              confirmClass: 'bg-red-600 text-white',
              onConfirm: () => {
                if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }
                pushNotification(`Enregistrement "${name}" rejeté.`, 'warning');
              },
            }
          );
        });
      }
    });

    function confirmValidation(name, row, action) {
      openModal('Confirmer la validation',
        `<div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-brand-success text-3xl">verified</span>
          <div>
            <p class="font-medium">Valider <strong>${name}</strong> ?</p>
            <p class="text-sm text-gray-500">Cette donnée sera transmise à DHIS2.</p>
          </div>
        </div>`,
        {
          confirmLabel: 'Valider',
          confirmClass: 'bg-brand-success text-white',
          onConfirm: () => {
            if (row) {
              const statusCell = row.querySelector('[class*="rounded-full"]');
              if (statusCell) {
                statusCell.className = statusCell.className.replace(/bg-\w+-\d+/g,'').replace(/text-\w+-\d+/g,'');
                statusCell.classList.add('bg-green-100','text-green-800','dark:bg-green-900/50','dark:text-green-300');
                statusCell.textContent = 'Validé';
              }
            }
            pushNotification(`"${name}" validé et transmis à DHIS2.`, 'success');
          },
        }
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUT SYNCHRONISATION
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('statut-sync') || document.title.includes('Statut')) && !hasDedicatedScript('statut-sync.js')) {
    // Barre de progression globale animée
    document.querySelectorAll('[class*="h-3"][class*="rounded-full"], [class*="h-2"][class*="rounded-full"]').forEach(container => {
      const bar = container.querySelector('div');
      if (bar && !bar.dataset.animated) {
        bar.dataset.animated = '1';
        const w = bar.style.width;
        bar.style.width = '0%';
        bar.style.transition = 'width 1.5s cubic-bezier(0.4,0,0.2,1)';
        setTimeout(() => bar.style.width = w, 400);
      }
    });

    // Boutons Forcer sync
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim().includes('Forcer') || btn.textContent.trim().includes('Relancer')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const res = await apiDhis2.sync(1);
            if (res) {
              pushNotification('Synchronisation déclenchée.', 'success');
              document.querySelectorAll('[class*="h-3"] div, [class*="h-2"] div').forEach(bar => {
                bar.style.transition = 'width 3s ease';
                bar.style.width = '100%';
              });
            }
          } catch (err) { pushNotification('Erreur lors de la synchronisation.', 'error'); }
          hideLoader();
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAMÈTRES DE SYNCHRONISATION
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('param-sync') || document.title.includes('Synchronisation')) && !hasDedicatedScript('param-sync.js')) {
    const saveButtons = document.querySelectorAll('button');
    saveButtons.forEach(btn => {
      if (btn.textContent.includes('Sauvegarder') || btn.textContent.includes('Appliquer')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const dhis2Config = await apiDhis2.getConfig();
            const configId = dhis2Config?.[0]?.id || 1;
            const freq = document.getElementById('auto_sync_freq')?.value || '30';
            await apiDhis2.updateConfig(configId, { periode: freq });
            pushNotification('Paramètres de synchronisation sauvegardés.', 'success');
          } catch (err) { pushNotification('Erreur lors de la sauvegarde.', 'error'); }
          hideLoader();
        });
      }
    });

    // Sliders / inputs numériques
    document.querySelectorAll('input[type="range"]').forEach(range => {
      const output = range.nextElementSibling || document.createElement('span');
      if (!range.nextElementSibling) {
        output.className = 'text-sm font-bold text-brand-primary ml-2';
        range.parentElement.appendChild(output);
      }
      output.textContent = range.value;
      range.addEventListener('input', () => { output.textContent = range.value; });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAMÈTRES LINGUISTIQUES
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('param-langues') || document.title.includes('Langue')) && !hasDedicatedScript('param-langues.js')) {
    document.querySelectorAll('[class*="rounded"][class*="p-"] input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const lang = radio.closest('label')?.textContent?.trim().split('\n')[0] || radio.value;
        document.querySelectorAll('[class*="rounded"][class*="p-"]').forEach(card => {
          card.classList.remove('ring-2', 'ring-brand-primary', 'bg-brand-primary/5');
        });
        radio.closest('[class*="rounded"][class*="p-"]')?.classList.add('ring-2', 'ring-brand-primary', 'bg-brand-primary/5');
      });
    });

    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('Appliquer') || btn.textContent.includes('Sauvegarder')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const selected = document.querySelector('input[type="radio"]:checked');
            const lang = selected?.value || 'fr';
            const langues = await apiRequest('GET', '/langues');
            const target = langues?.find(l => l.code === lang);
            if (target) await apiRequest('PUT', `/langues/${target.id}`, { active: true });
            pushNotification('Langue mise à jour.', 'success');
          } catch (err) { pushNotification('Erreur.', 'error'); }
          hideLoader();
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYSE DE DONNÉES
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('analyse') || document.title.includes('Analyse')) && !hasDedicatedScript('analyse-donnees.js')) {
    // Onglets de visualisation
    const tabs = document.querySelectorAll('[role="tab"], [class*="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"], [class*="tab-panel"]');

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('border-b-2', 'border-brand-primary', 'text-brand-primary', 'font-bold');
          t.classList.add('text-gray-500');
        });
        tab.classList.add('border-b-2', 'border-brand-primary', 'text-brand-primary', 'font-bold');
        tab.classList.remove('text-gray-500');

        panels.forEach((p, j) => p.classList.toggle('hidden', j !== i));
      });
    });

    // Boutons d'export
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('Exporter') || btn.textContent.includes('Télécharger')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const captures = await apiCaptures.list({ limit: 5000 });
            const sites = await apiSites.list({ limit: 500 });
            const blob = new Blob([JSON.stringify({ captures, sites, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export-entomo-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            pushNotification('Données exportées avec succès.', 'success');
          } catch (err) { pushNotification('Erreur lors de l\'export.', 'error'); }
          hideLoader();
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG INDICATEURS & MODÈLES RISQUE
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('config-indicateurs') || window.location.pathname.includes('config-modeles')) && !hasDedicatedScript('config-indicateurs.js') && !hasDedicatedScript('config-modeles-risque.js')) {
    // Drag & drop pour ordonner les indicateurs
    let dragging = null;
    document.querySelectorAll('[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', () => { dragging = item; item.classList.add('opacity-50'); });
      item.addEventListener('dragend',   () => { dragging = null; item.classList.remove('opacity-50'); });
      item.addEventListener('dragover',  e => { e.preventDefault(); item.classList.add('ring-2','ring-brand-primary/50'); });
      item.addEventListener('dragleave', ()  => item.classList.remove('ring-2','ring-brand-primary/50'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('ring-2','ring-brand-primary/50');
        if (dragging && dragging !== item) {
          dragging.parentElement.insertBefore(dragging, item);
          pushNotification('Ordre des indicateurs mis à jour.', 'info');
        }
      });
    });

    // Bouton ajouter indicateur
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('Ajouter') || btn.textContent.includes('Nouvel indicateur')) {
        btn.addEventListener('click', () => {
          openModal('Ajouter un indicateur',
            `<div class="space-y-3 text-sm">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom de l'indicateur *</label>
                <input id="ind-nom" type="text" placeholder="ex: Taux d'infection" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Formule / Source</label>
                <input id="ind-formule" type="text" placeholder="ex: captures_positives / total_captures * 100" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 font-mono text-xs"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unité</label>
                <select id="ind-unite" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                  <option>%</option><option>moustiques/nuit</option><option>nombre</option><option>km²</option>
                </select>
              </div>
            </div>`,
            {
              confirmLabel: 'Ajouter',
              confirmClass: 'bg-brand-primary text-white',
              onConfirm: async () => {
                const nom = document.getElementById('ind-nom')?.value?.trim();
                if (!nom) { pushNotification('Nom requis.', 'warning'); return; }
                try {
                  const res = await apiRequest('POST', '/indicateurs/', {
                    nom,
                    formule: document.getElementById('ind-formule')?.value?.trim() || '',
                    unite: document.getElementById('ind-unite')?.value || '%',
                  });
                  if (res) pushNotification('Indicateur ajouté.', 'success');
                } catch (err) { pushNotification('Erreur.', 'error'); }
              },
            }
          );
        });
      }

      if (btn.textContent.includes('Sauvegarder') || btn.textContent.includes('Enregistrer')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const inds = document.querySelectorAll('[data-indicateur-id]');
            for (const el of inds) {
              const id = el.dataset.indicateurId;
              if (id) await apiRequest('PUT', `/indicateurs/${id}`, { statut: 'configure' });
            }
            pushNotification('Configuration sauvegardée.', 'success');
          } catch (err) { pushNotification('Erreur.', 'error'); }
          hideLoader();
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTION HORS LIGNE
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('hors-ligne') || document.title.includes('Hors ligne')) && !hasDedicatedScript('gestion-hors-ligne.js')) {
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();

      if (text.includes('Synchroniser') || text.includes('Envoyer')) {
        btn.addEventListener('click', async () => {
          showLoader();
          try {
            const res = await apiDhis2.sync(1);
            if (res) {
              pushNotification('Données hors ligne synchronisées avec succès.', 'success');
              document.querySelectorAll('[class*="rounded-full"][class*="bg-yellow"]').forEach(badge => {
                badge.classList.remove('bg-yellow-100','text-yellow-800');
                badge.classList.add('bg-green-100','text-green-800');
                badge.textContent = 'Synchronisé';
              });
            }
          } catch (err) { pushNotification('Erreur lors de la synchronisation.', 'error'); }
          hideLoader();
        });
      }

      if (text.includes('Supprimer données locales') || text.includes('Effacer cache')) {
        btn.addEventListener('click', () => {
          confirmDelete('toutes les données hors ligne', async () => {
            try {
              const res = await apiRequest('DELETE', '/sync/cache');
              if (res) pushNotification('Cache local effacé.', 'warning');
            } catch (err) { pushNotification('Erreur.', 'error'); }
          });
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTION MODÈLES VISUELS
  // ═══════════════════════════════════════════════════════════════════════════
  if ((window.location.pathname.includes('modeles-visuels') || document.title.includes('Modèles Visuels')) && !hasDedicatedScript('gestion-modeles-visuels.js')) {
    // Lightbox pour les aperçus d'images
    document.querySelectorAll('img[class*="rounded"], [class*="aspect"][class*="bg-cover"]').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-zoom-out';
        const content = document.createElement('div');
        content.className = 'relative max-w-2xl max-h-[80vh] rounded-xl overflow-hidden';

        if (img.tagName === 'IMG') {
          content.innerHTML = `<img src="${img.src}" class="w-full h-full object-contain rounded-xl"/>`;
        } else {
          content.innerHTML = `<div class="w-96 h-64 rounded-xl" style="${img.style.cssText}"></div>`;
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-2 right-2 text-white bg-black/50 rounded-full p-1 hover:bg-black/70';
        closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';

        content.appendChild(closeBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOUS LES TABLEAUX DE BORD — Boutons communs
  // ═══════════════════════════════════════════════════════════════════════════
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    // Rafraîchir / Recharger
    if (text.includes('Rafraîchir') || text.includes('Actualiser') ||
        btn.querySelector('.material-symbols-outlined')?.textContent === 'refresh') {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.add('animate-spin');
          setTimeout(() => icon.classList.remove('animate-spin'), 1000);
        }
        location.reload();
      });
    }

    // Imprimer
    if (text.includes('Imprimer') || btn.querySelector('.material-symbols-outlined')?.textContent === 'print') {
      btn.addEventListener('click', () => {
        pushNotification('Impression en cours...', 'info');
        setTimeout(() => window.print(), 500);
      });
    }

    // Partager
    if (text.includes('Partager') || btn.querySelector('.material-symbols-outlined')?.textContent === 'share') {
      btn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href });
        } else {
          navigator.clipboard?.writeText(window.location.href);
          pushNotification('Lien copié dans le presse-papier.', 'success');
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMULAIRES — Validation universelle
  // ═══════════════════════════════════════════════════════════════════════════
  document.querySelectorAll('form.generic-submit-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(input => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('ring-2', 'ring-red-500', 'border-red-500');
          const err = input.parentElement.querySelector('.form-err') || (() => {
            const e = document.createElement('p');
            e.className = 'form-err text-red-500 text-xs mt-1';
            e.textContent = 'Ce champ est obligatoire';
            input.parentElement.appendChild(e);
            return e;
          })();
        } else {
          input.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
          input.parentElement.querySelector('.form-err')?.remove();
        }
      });
      if (valid) {
        showLoader();
        const formData = new FormData(form);
        const action = form.action || window.location.pathname;
        try {
          const obj = Object.fromEntries(formData.entries());
          await apiRequest('POST', '/indicateurs/', obj);
          pushNotification('Formulaire soumis avec succès.', 'success');
        } catch (err) { pushNotification('Erreur lors de l\'envoi.', 'error'); }
        hideLoader();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLEAUX — comportements communs
  // ═══════════════════════════════════════════════════════════════════════════
  initTableSort('table');

  const searchInput = document.querySelector('input[placeholder*="Rechercher"], input[type="search"]');
  if (searchInput) initTableSearch('input[placeholder*="Rechercher"], input[type="search"]', 'tbody');

  // Sélection de toutes les lignes (checkbox global)
  const selectAllCb = document.querySelector('thead input[type="checkbox"]');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', () => {
      document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => {
        cb.checked = selectAllCb.checked;
        cb.closest('tr')?.classList.toggle('bg-brand-primary/5', selectAllCb.checked);
      });
    });

    document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const all  = document.querySelectorAll('tbody input[type="checkbox"]');
        const checked = document.querySelectorAll('tbody input[type="checkbox"]:checked');
        selectAllCb.indeterminate = checked.length > 0 && checked.length < all.length;
        selectAllCb.checked = checked.length === all.length;
        cb.closest('tr')?.classList.toggle('bg-brand-primary/5', cb.checked);
      });
    });
  }

});
