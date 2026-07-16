document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  const ALLOWED_TYPES = ['.csv', '.xlsx', '.xls', '.json'];
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const importBtn = document.getElementById('btn-importer');
  const progressSection = document.getElementById('progress-section');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const resultSection = document.getElementById('result-section');
  const resultContent = document.getElementById('result-content');
  const errorsSection = document.getElementById('errors-section');
  const errorsList = document.getElementById('errors-list');
  const historyTbody = document.getElementById('import-history-tbody');

  let selectedFile = null;

  // --- Drag & Drop ---
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput?.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brand-primary', 'bg-brand-primary/5');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-brand-primary', 'bg-brand-primary/5');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-primary', 'bg-brand-primary/5');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
  }

  function validateFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return `Format non supporté (${ext}). Formats acceptés : ${ALLOWED_TYPES.join(', ')}`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const maxMb = (MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      const fileMb = (file.size / (1024 * 1024)).toFixed(1);
      return `Le fichier (${fileMb} Mo) dépasse la limite de ${maxMb} Mo`;
    }
    if (file.size === 0) {
      return 'Le fichier est vide';
    }
    return null;
  }

  function handleFile(file) {
    const error = validateFile(file);
    if (error) {
      pushNotification(error, 'error');
      return;
    }
    selectedFile = file;
    if (fileInfo) {
      const sizeStr = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(1) + ' Mo'
        : (file.size / 1024).toFixed(1) + ' Ko';
      fileInfo.innerHTML = `
        <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span class="material-symbols-outlined text-green-600">description</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">${file.name}</p>
            <p class="text-xs text-gray-500">${sizeStr}</p>
          </div>
          <button id="clear-file" class="text-gray-400 hover:text-red-500 shrink-0">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>`;
      document.getElementById('clear-file')?.addEventListener('click', clearFile);
    }
  }

  function clearFile() {
    selectedFile = null;
    if (fileInfo) fileInfo.innerHTML = '';
    if (fileInput) fileInput.value = '';
    hideSections();
  }

  function hideSections() {
    if (progressSection) progressSection.classList.add('hidden');
    if (resultSection) resultSection.classList.add('hidden');
    if (errorsSection) errorsSection.classList.add('hidden');
  }

  function resetProgress() {
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = 'Préparation du fichier...';
  }

  function setProgress(pct, text) {
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = text;
  }

  // --- Upload ---
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        pushNotification('Veuillez sélectionner un fichier.', 'error');
        return;
      }

      hideSections();
      resetProgress();
      if (progressSection) progressSection.classList.remove('hidden');

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        setProgress(20, 'Envoi du fichier au serveur...');

        const res = await apiRequest('POST', '/import/upload', formData, true);

        if (!res) {
          setProgress(0, 'Échec de l\'importation.');
          if (resultSection) {
            resultSection.classList.remove('hidden');
            resultContent.innerHTML = `
              <div class="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span class="material-symbols-outlined text-red-600">error</span>
                <p class="font-medium text-red-800 dark:text-red-300">Erreur lors de l'importation</p>
              </div>`;
          }
          return;
        }

        setProgress(70, 'Analyse des résultats...');

        await new Promise(r => setTimeout(r, 300));
        setProgress(100, 'Importation terminée !');

        const hasErrors = res.errors && res.errors.length > 0;
        const hasPartial = res.rejected > 0 && res.imported > 0;

        if (resultSection) {
          resultSection.classList.remove('hidden');

          let badgeClass = 'bg-brand-success/10 text-brand-success';
          let icon = 'check_circle';
          let title = 'Importation réussie';
          if (hasPartial) {
            badgeClass = 'bg-brand-alert-warning/10 text-brand-alert-warning';
            icon = 'warning';
            title = 'Importation partielle';
          } else if (res.imported === 0) {
            badgeClass = 'bg-brand-alert-critical/10 text-brand-alert-critical';
            icon = 'error';
            title = 'Aucun enregistrement importé';
          }

          resultContent.innerHTML = `
            <div class="p-4 rounded-lg ${badgeClass}">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-xl">${icon}</span>
                <p class="font-bold">${title}</p>
              </div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p class="text-2xl font-black">${res.total || 0}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Lignes lues</p>
                </div>
                <div class="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p class="text-2xl font-black text-brand-success">${res.imported || 0}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Importées</p>
                </div>
                <div class="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p class="text-2xl font-black ${res.rejected > 0 ? 'text-brand-alert-critical' : ''}">${res.rejected || 0}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Rejetées</p>
                </div>
              </div>
              ${res.message ? `<p class="text-sm mt-3 text-gray-600 dark:text-gray-400">${res.message}</p>` : ''}
            </div>`;
        }

        if (hasErrors && errorsSection) {
          errorsSection.classList.remove('hidden');
          errorsList.innerHTML = res.errors.map(err =>
            `<div class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 rounded bg-red-50 dark:bg-red-900/20">
              <span class="text-brand-alert-critical shrink-0">•</span>
              <span>${err}</span>
            </div>`
          ).join('');
        }

        if (res.imported > 0) {
          pushNotification(`${res.imported} capture(s) importée(s) avec succès.`, 'success');
        } else if (res.rejected > 0) {
          pushNotification(`${res.rejected} ligne(s) rejetée(s). Vérifiez les erreurs.`, 'warning');
        } else {
          pushNotification('Aucun enregistrement importé.', 'error');
        }

      } catch (err) {
        setProgress(0, 'Erreur inattendue.');
        if (resultSection) {
          resultSection.classList.remove('hidden');
          resultContent.innerHTML = `
            <div class="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span class="material-symbols-outlined text-red-600">error</span>
              <p class="font-medium text-red-800 dark:text-red-300">Erreur : ${err.message || 'Inconnue'}</p>
            </div>`;
        }
        pushNotification('Erreur lors de l\'importation.', 'error');
      }

      clearFile();
      loadHistory();
    });
  }

  // --- Template download ---
  const templateButton = document.getElementById('btn-download-template') || document.getElementById('btn-telecharger-modele');
  templateButton?.addEventListener('click', () => {
    const template = 'code_site,date_capture,espece,sexe,quantite,notes\nSITE001,2024-01-15,An. gambiae,F,10,Échantillon de routine\nSITE001,2024-01-15,An. funestus,M,5,';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_captures.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // --- Import history ---
  async function loadHistory(target) {
    const tbody = target || historyTbody;
    if (!tbody) return;

    try {
      const data = await apiRequest('GET', '/import/history');

      if (!data || !data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-8 text-gray-400 dark:text-gray-500">
              <span class="material-symbols-outlined text-3xl block mb-1">inbox</span>
              Aucun import précédent
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = data.map(h => {
        const statusMap = {
          succes:   { cls: 'bg-brand-success/10 text-brand-success',  label: 'Succès' },
          success:  { cls: 'bg-brand-success/10 text-brand-success',  label: 'Succès' },
          partiel:  { cls: 'bg-brand-alert-warning/10 text-brand-alert-warning', label: 'Partiel' },
          partial:  { cls: 'bg-brand-alert-warning/10 text-brand-alert-warning', label: 'Partiel' },
          erreur:   { cls: 'bg-brand-alert-critical/10 text-brand-alert-critical', label: 'Échec' },
          error:    { cls: 'bg-brand-alert-critical/10 text-brand-alert-critical', label: 'Échec' },
          en_cours: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'En cours' },
        };
        const s = statusMap[h.statut] || { cls: 'bg-gray-100 text-gray-600', label: h.statut || '-' };

        const dateStr = h.date ? new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
        const lines = h.imported != null && h.total != null
          ? (h.rejected > 0 ? `${h.imported}/${h.total}` : h.imported)
          : (h.total || 0);

        return `
          <tr class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td class="py-2.5 text-[#111418] dark:text-white font-medium max-w-[140px] truncate" title="${h.filename || ''}">${h.filename || 'Fichier'}</td>
            <td class="py-2.5 text-gray-500 whitespace-nowrap">${dateStr}</td>
            <td class="py-2.5"><span class="text-xs font-semibold ${s.cls} px-2 py-0.5 rounded-full">${s.label}</span></td>
            <td class="py-2.5 text-right text-gray-500">${lines}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      console.warn('Erreur chargement historique:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-red-400">
            <span class="material-symbols-outlined text-3xl block mb-1">error</span>
            Erreur de chargement
          </td>
        </tr>`;
    }
  }

  // --- Modal historique ---
  document.getElementById('btn-voir-historique')?.addEventListener('click', async () => {
    openModal('Historique des imports', `
      <div id="modal-history-wrap">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
              <th class="text-left pb-2 font-semibold">Fichier</th>
              <th class="text-left pb-2 font-semibold">Date</th>
              <th class="text-left pb-2 font-semibold">Statut</th>
              <th class="text-right pb-2 font-semibold">Lignes</th>
            </tr>
          </thead>
          <tbody id="modal-history-tbody">
            <tr>
              <td colspan="4" class="text-center py-6 text-sm text-gray-400">Chargement...</td>
            </tr>
          </tbody>
        </table>
      </div>`, {
      confirmLabel: 'Fermer', cancelLabel: '',
    });
    const modalTbody = document.getElementById('modal-history-tbody');
    await loadHistory(modalTbody);
  });

  // --- Init: load history in sidebar table ---
  loadHistory();
});
