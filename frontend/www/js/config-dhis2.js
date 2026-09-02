document.addEventListener('DOMContentLoaded', async () => {
  let currentConfig = null;

  const fields = {
    url: document.getElementById('dhis2-url'),
    username: document.getElementById('dhis2-user'),
    password: document.getElementById('dhis2-password'),
    periode: document.getElementById('dhis2-periode'),
    actif: document.getElementById('dhis2-active'),
    org_unit: document.getElementById('dhis2-org-unit'),
    data_set: document.getElementById('dhis2-data-set'),
  };

  function collectConfig() {
    return {
      url: fields.url?.value.trim() || '',
      username: fields.username?.value.trim() || null,
      password: fields.password?.value || undefined,
      periode: fields.periode?.value || 'mensuel',
      org_unit: fields.org_unit?.value.trim() || null,
      data_set: fields.data_set?.value.trim() || null,
      actif: fields.actif?.checked !== false,
    };
  }

  function validateConfig(data, creating = false) {
    if (!data.url || !/^https?:\/\//i.test(data.url)) {
      pushNotification('Saisissez une URL DHIS2 valide (http:// ou https://).', 'warning');
      fields.url?.focus();
      return false;
    }
    if (creating && !data.password) {
      pushNotification('Le mot de passe ou token est requis pour la première configuration.', 'warning');
      fields.password?.focus();
      return false;
    }
    return true;
  }

  function renderConnectionStatus(ok, message) {
    const target = document.getElementById('dhis2-connection-status');
    if (!target) return;
    target.innerHTML = `<span class="material-symbols-outlined ${ok ? 'text-green-500' : 'text-yellow-500'}">${ok ? 'check_circle' : 'pending'}</span>
      <p class="${ok ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} text-sm font-medium">${message}</p>`;
  }

  function renderMappings(items = []) {
    const body = document.getElementById('dhis2-mappings-body');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-sm text-gray-500">Aucune règle de mappage enregistrée.</td></tr>';
      return;
    }
    body.innerHTML = items.map(item => `
      <tr class="border-b border-gray-200 dark:border-gray-700" data-id="${item.id}">
        <td class="p-3 text-[#111418] dark:text-white font-medium">${item.indicateur_local}</td>
        <td class="p-3 text-sm text-[#111418] dark:text-white">${item.element_dhis2}<span class="ml-2 text-xs text-gray-400">${item.type_donnee || ''}</span></td>
        <td class="p-3 text-center"><button type="button" class="btn-delete-mapping text-gray-400 hover:text-red-500" title="Supprimer la règle"><span class="material-symbols-outlined text-xl">delete</span></button></td>
      </tr>`).join('');
    body.querySelectorAll('.btn-delete-mapping').forEach(button => {
      button.addEventListener('click', () => {
        const row = button.closest('tr');
        const mappingId = Number(row?.dataset.id);
        confirmDelete('cette règle de mappage', async () => {
          await apiDhis2.deleteMapping(mappingId);
          currentConfig.mappings = currentConfig.mappings.filter(item => item.id !== mappingId);
          renderMappings(currentConfig.mappings);
          pushNotification('Règle de mappage supprimée.', 'success');
        });
      });
    });
  }

  async function loadConfig() {
    const configs = await apiDhis2.getConfig();
    currentConfig = Array.isArray(configs) ? configs[0] : configs;
    if (!currentConfig) {
      renderConnectionStatus(false, 'Configuration non enregistrée');
      renderMappings([]);
      return;
    }
    fields.url.value = currentConfig.url || '';
    fields.username.value = currentConfig.username || '';
    fields.periode.value = currentConfig.periode || 'mensuel';
    fields.actif.checked = currentConfig.actif !== false;
    if (fields.org_unit) fields.org_unit.value = currentConfig.org_unit || '';
    if (fields.data_set) fields.data_set.value = currentConfig.data_set || '';
    renderConnectionStatus(currentConfig.actif !== false, currentConfig.actif !== false ? 'Configuration active' : 'Configuration désactivée');
    renderMappings(currentConfig.mappings || []);
  }

  async function saveConfig(button) {
    const data = collectConfig();
    if (!validateConfig(data, !currentConfig)) return null;
    if (currentConfig && !data.password) delete data.password;
    buttonLoading(button, true);
    try {
      currentConfig = currentConfig
        ? await apiDhis2.updateConfig(currentConfig.id, data)
        : await apiDhis2.saveConfig(data);
      fields.password.value = '';
      renderMappings(currentConfig.mappings || []);
      renderConnectionStatus(true, 'Configuration sauvegardée');
      pushNotification('Configuration DHIS2 sauvegardée dans la base de données.', 'success');
      return currentConfig;
    } finally {
      buttonLoading(button, false);
    }
  }

  document.getElementById('btn-save-dhis2')?.addEventListener('click', event => saveConfig(event.currentTarget));
  document.getElementById('btn-cancel-dhis2')?.addEventListener('click', () => loadConfig());
  document.getElementById('btn-test-dhis2')?.addEventListener('click', async event => {
    const data = collectConfig();
    if (!validateConfig(data, !currentConfig)) return;
    const saved = await saveConfig(event.currentTarget);
    if (!saved) return;
    try {
      const result = await apiDhis2.testConnection(saved.id, fields.password?.value || undefined);
      renderConnectionStatus(result.success, result.message);
      pushNotification(result.success ? 'Connexion DHIS2 vérifiée.' : 'Échec de la connexion DHIS2.', result.success ? 'success' : 'error');
    } catch (error) {
      renderConnectionStatus(false, 'Échec de la vérification');
      pushNotification('La configuration est enregistrée, mais la vérification a échoué.', 'error');
    }
  });

  document.getElementById('btn-add-mapping')?.addEventListener('click', () => {
    if (!currentConfig) {
      pushNotification('Enregistrez d’abord la configuration DHIS2.', 'warning');
      return;
    }
    openModal('Ajouter une règle de mappage', `
      <div class="space-y-4">
        <label class="block text-sm font-medium">Indicateur local *<input id="mapping-local" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700" placeholder="Ex. densite_anopheles"></label>
        <label class="block text-sm font-medium">Élément DHIS2 *<input id="mapping-dhis2" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700" placeholder="Ex. ENTO_DENS_001"></label>
        <label class="block text-sm font-medium">Type de donnée<select id="mapping-type" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"><option value="nombre">Nombre</option><option value="pourcentage">Pourcentage</option><option value="taux">Taux</option><option value="texte">Texte</option></select></label>
      </div>`, {
      confirmLabel: 'Ajouter',
      onConfirm: async () => {
        const indicateur_local = document.getElementById('mapping-local')?.value.trim();
        const element_dhis2 = document.getElementById('mapping-dhis2')?.value.trim();
        if (!indicateur_local || !element_dhis2) {
          pushNotification('Les deux identifiants sont obligatoires.', 'warning');
          return false;
        }
        const mapping = await apiDhis2.addMapping(currentConfig.id, {
          indicateur_local,
          element_dhis2,
          type_donnee: document.getElementById('mapping-type')?.value || 'nombre',
          actif: true,
        });
        currentConfig.mappings = [...(currentConfig.mappings || []), mapping];
        renderMappings(currentConfig.mappings);
        pushNotification('Règle de mappage enregistrée.', 'success');
      },
    });
  });

  try { await loadConfig(); } catch (error) { pushNotification('Impossible de charger la configuration DHIS2.', 'error'); }
});
