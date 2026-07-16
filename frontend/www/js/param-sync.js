document.addEventListener('DOMContentLoaded', async () => {
  const autoSync = document.getElementById('sync-active');
  const frequency = document.getElementById('sync-frequency');
  const dataInputs = Array.from(document.querySelectorAll('input[name="data-type"]'));
  let loadingSettings = true;

  function selectedDataTypes() {
    return dataInputs.filter(input => input.checked && input.id !== 'all-data').map(input => input.id);
  }

  async function saveSettings() {
    if (loadingSettings) return;
    await apiSync.saveSettings({
      auto_sync: autoSync?.checked !== false,
      frequence: Number(frequency?.value || 60),
      data_types: selectedDataTypes(),
    });
    pushNotification('Préférences de synchronisation enregistrées.', 'success');
  }

  async function loadSettings() {
    const settings = await apiSync.settings();
    if (autoSync) autoSync.checked = settings.auto_sync !== false;
    if (frequency) frequency.value = String(settings.frequence || 60);
    const selected = new Set(settings.data_types || []);
    dataInputs.forEach(input => {
      if (input.id !== 'all-data') input.checked = selected.has(input.id);
    });
    const allData = document.getElementById('all-data');
    if (allData) allData.checked = dataInputs.filter(input => input.id !== 'all-data').every(input => input.checked);
    loadingSettings = false;
  }

  async function refreshStatus() {
    const status = await apiDhis2.getStatus();
    const date = document.getElementById('sync-last-date');
    const connection = document.getElementById('sync-connection-label');
    if (date) date.textContent = status?.last_sync ? new Date(status.last_sync).toLocaleString('fr-FR') : 'Aucune synchronisation connue';
    if (connection) connection.textContent = status?.configured
      ? `Connecté à ${status.config_name} — ${status.pending_count || 0} élément(s) en attente`
      : 'DHIS2 n’est pas encore configuré';
  }

  autoSync?.addEventListener('change', saveSettings);
  frequency?.addEventListener('change', saveSettings);
  dataInputs.forEach(input => input.addEventListener('change', async () => {
    if (input.id === 'all-data') dataInputs.filter(item => item !== input).forEach(item => { item.checked = input.checked; });
    else {
      const allData = document.getElementById('all-data');
      if (allData) allData.checked = dataInputs.filter(item => item.id !== 'all-data').every(item => item.checked);
    }
    await saveSettings();
  }));

  document.getElementById('btn-sync-now')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const progress = document.getElementById('sync-progress-button');
    button.classList.add('hidden');
    progress?.classList.remove('hidden');
    try {
      const status = await apiDhis2.getStatus();
      if (!status?.config_id) {
        pushNotification('Configurez DHIS2 avant de lancer la synchronisation.', 'warning');
        return;
      }
      const result = await apiDhis2.sync(status.config_id);
      pushNotification(`${result.nb_enregistrements || 0} enregistrement(s) synchronisé(s).`, 'success');
      await refreshStatus();
    } catch (error) {
      pushNotification('La synchronisation a échoué.', 'error');
    } finally {
      progress?.classList.add('hidden');
      button.classList.remove('hidden');
    }
  });

  try {
    await loadSettings();
    await refreshStatus();
  } catch (error) {
    loadingSettings = false;
    pushNotification('Impossible de charger les paramètres de synchronisation.', 'error');
  }
});
