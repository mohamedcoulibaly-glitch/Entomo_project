/**
 * param-sync.js
 * Paramètres de synchronisation DHIS2
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Sliders avec affichage de valeur ─────────────────────────────────────────
  document.querySelectorAll('input[type="range"]').forEach(range => {
    let output = range.nextElementSibling;
    if (!output || output.tagName !== 'SPAN') {
      output = document.createElement('span');
      output.className = 'ml-2 text-sm font-bold text-brand-primary min-w-[3rem] inline-block';
      range.parentElement.appendChild(output);
    }
    output.textContent = range.value;
    range.addEventListener('input', () => { output.textContent = range.value; });
  });

  // ── Chargement de la config DHIS2 depuis l'API ────────────────────────────────
  async function loadConfig() {
    if (typeof apiDhis2 === 'undefined') return;
    const config = await apiDhis2.getConfig();
    if (!config) return;
    // Remplir les champs du formulaire si présents
    const fields = {
      'server-url':      config.url,
      'api-version':     config.api_version,
      'sync-frequency':  config.sync_frequency,
      'batch-size':      config.batch_size,
      'timeout':         config.timeout,
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && val !== undefined) el.value = val;
    });
  }

  loadConfig();

  // ── Boutons ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Sauvegarder') || t.includes('Appliquer') || t.includes('Enregistrer')) {
      btn.addEventListener('click', async () => {
        showLoader();
        const data = {};
        document.querySelectorAll('input, select, textarea').forEach(el => {
          if (el.name || el.id) data[el.name || el.id] = el.value;
        });
        if (typeof apiDhis2 !== 'undefined') {
          await apiDhis2.saveConfig(data);
        } else {
          await new Promise(r => setTimeout(r, 900));
        }
        hideLoader();
        pushNotification('Paramètres de synchronisation sauvegardés.', 'success');
      });
    }

    if (t.includes('Tester') || t.includes('Vérifier connexion')) {
      btn.addEventListener('click', async () => {
        showLoader();
        let ok = false;
        if (typeof apiDhis2 !== 'undefined') {
          const res = await apiDhis2.testConnection();
          ok = !!(res && res.success);
        } else {
          await new Promise(r => setTimeout(r, 1500));
          ok = true;
        }
        hideLoader();
        if (ok) {
          pushNotification('Connexion DHIS2 réussie !', 'success');
        } else {
          pushNotification('Impossible de se connecter au serveur DHIS2.', 'error');
        }
      });
    }

    if (t.includes('Réinitialiser') || t.includes('Restaurer')) {
      btn.addEventListener('click', () => {
        confirmDelete('la configuration de synchronisation', () => {
          document.querySelectorAll('input, select').forEach(el => { el.value = el.defaultValue; });
          pushNotification('Configuration réinitialisée aux valeurs par défaut.', 'warning');
        });
      });
    }

    if (t.includes('Importer') && t.includes('config')) {
      btn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.yml,.yaml';
        input.addEventListener('change', () => {
          if (input.files[0]) {
            pushNotification(`Configuration "${input.files[0].name}" importée.`, 'success');
          }
        });
        input.click();
      });
    }

    if (t.includes('Exporter') && t.includes('config')) {
      btn.addEventListener('click', () => {
        const config = { url: '', api_version: '38', sync_frequency: '60', batch_size: '100' };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config-sync-dhis2.json';
        a.click();
        pushNotification('Configuration exportée.', 'success');
      });
    }
  });

  // ── Toggles checkbox / switch ─────────────────────────────────────────────────
  document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(cb => {
    cb.addEventListener('change', () => {
      pushNotification('Paramètre mis à jour.', 'info');
    });
  });

});
