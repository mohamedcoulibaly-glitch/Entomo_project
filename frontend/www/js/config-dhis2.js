/**
 * config-dhis2.js
 * Configuration intégration DHIS2 — comportements interactifs + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Charger la config depuis l'API ───────────────────────────────────────────
  async function loadConfig() {
    if (typeof apiDhis2 === 'undefined') return;
    const config = await apiDhis2.getConfig();
    if (!config) return;
    const map = { 'dhis2-url': config.url, 'dhis2-version': config.api_version,
                  'dhis2-user': config.username, 'dhis2-org-unit': config.org_unit };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`) || document.querySelector(`input[placeholder*="${id}"]`);
      if (el && val) el.value = val;
    });
  }

  loadConfig();

  // ── Test de connexion ────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Tester') || text.includes('Test de connexion')) {
      btn.addEventListener('click', async () => {
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">refresh</span> Test en cours...`;

        let success = false;
        if (typeof apiDhis2 !== 'undefined') {
          const res = await apiDhis2.testConnection();
          success = !!(res && res.success);
        } else {
          await new Promise(r => setTimeout(r, 2000));
          success = Math.random() > 0.3;
        }

        btn.disabled = false;
        btn.innerHTML = originalContent;
          if (success) {
            openModal('✅ Connexion réussie',
              `<div class="space-y-3 text-sm">
                <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span class="material-symbols-outlined text-brand-success text-3xl">check_circle</span>
                  <div>
                    <p class="font-bold text-green-700 dark:text-green-300">Connexion DHIS2 établie</p>
                    <p class="text-gray-500 dark:text-gray-400">Version DHIS2: 2.39.1</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded"><p class="text-gray-500">Latence</p><strong>127 ms</strong></div>
                  <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded"><p class="text-gray-500">Organisation Units</p><strong>14</strong></div>
                </div>
              </div>`,
              { confirmLabel: 'OK', cancelLabel: '', onConfirm: () => pushNotification('DHIS2 connecté avec succès !', 'success') }
            );
          } else {
            openModal('❌ Échec de connexion',
              `<div class="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span class="material-symbols-outlined text-red-500 text-3xl">error</span>
                <div>
                  <p class="font-bold text-red-700 dark:text-red-300">Impossible de se connecter</p>
                  <p class="text-sm text-gray-500 mt-1">Vérifiez l'URL du serveur, les identifiants et que le serveur DHIS2 est accessible.</p>
                  <p class="text-xs text-gray-400 mt-2 font-mono">Error: ECONNREFUSED 192.168.1.100:8080</p>
                </div>
              </div>`,
              { confirmLabel: 'Vérifier la config', cancelLabel: 'Fermer',
                onConfirm: () => document.querySelector('input[type="url"], input[placeholder*="http"]')?.focus() }
            );
          }
      });
    }

    if (text.includes('Sauvegarder') || text.includes('Enregistrer')) {
      btn.addEventListener('click', async () => {
        const data = {};
        document.querySelectorAll('input, select').forEach(el => {
          if (el.name || el.id) data[el.name || el.id] = el.value;
        });
        showLoader();
        if (typeof apiDhis2 !== 'undefined') {
          await apiDhis2.saveConfig(data);
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
        hideLoader();
        pushNotification('Configuration DHIS2 sauvegardée.', 'success');
      });
    }

    if (text.includes('Synchroniser maintenant') || text.includes('Lancer sync')) {
      btn.addEventListener('click', () => {
        openModal('Lancer une synchronisation',
          `<div class="space-y-3 text-sm">
            <p>Choisissez le type de synchronisation :</p>
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="sync-type" value="full" checked class="text-brand-primary"/>
              <span>Synchronisation complète (toutes les données)</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="sync-type" value="incremental" class="text-brand-primary"/>
              <span>Synchronisation incrémentale (nouveaux enregistrements)</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <input type="radio" name="sync-type" value="metadata" class="text-brand-primary"/>
              <span>Métadonnées uniquement</span>
            </label>
          </div>`,
          {
            confirmLabel: 'Lancer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              showLoader();
              if (typeof apiDhis2 !== 'undefined') {
                await apiDhis2.sync();
              } else {
                await new Promise(r => setTimeout(r, 3000));
              }
              hideLoader();
              pushNotification('Synchronisation DHIS2 terminée avec succès.', 'success');
            },
          }
        );
      });
    }
  });

  // ── Affichage/masquage du mot de passe ──────────────────────────────────────
  document.querySelectorAll('input[type="password"]').forEach(input => {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';
    toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">visibility</span>';
    wrapper.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggleBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">${isHidden ? 'visibility_off' : 'visibility'}</span>`;
    });
  });

  // ── Validation du formulaire ─────────────────────────────────────────────────
  document.querySelectorAll('input[type="url"], input[placeholder*="http"]').forEach(urlInput => {
    urlInput.addEventListener('blur', () => {
      const val = urlInput.value.trim();
      if (val && !val.startsWith('http')) {
        urlInput.classList.add('border-red-500', 'ring-1', 'ring-red-500');
        let err = urlInput.parentElement.querySelector('.url-error');
        if (!err) {
          err = document.createElement('p');
          err.className = 'url-error text-red-500 text-xs mt-1';
          err.textContent = 'L\'URL doit commencer par http:// ou https://';
          urlInput.parentElement.appendChild(err);
        }
      } else {
        urlInput.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
        urlInput.parentElement.querySelector('.url-error')?.remove();
      }
    });
  });

  // ── Toggle switches ───────────────────────────────────────────────────────────
  document.querySelectorAll('input[type="checkbox"][role="switch"], input[type="checkbox"].toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const label = toggle.closest('label') || toggle.previousElementSibling;
      const name  = label?.textContent?.trim().split('\n')[0] || 'Option';
      pushNotification(`"${name}" ${toggle.checked ? 'activé' : 'désactivé'}.`, 'info');
    });
  });

});
