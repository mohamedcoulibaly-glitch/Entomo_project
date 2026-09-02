document.addEventListener('DOMContentLoaded', async () => {
  const entity = document.body.dataset.entity;
  const form = document.getElementById('entity-form');
  const fieldsRoot = document.getElementById('entity-fields');
  const submitBtn = document.getElementById('entity-submit');

  const configs = {
    capture: {
      singular: 'capture', back: 'gestion-captures.html', create: data => apiCaptures.create(data),
      fields: [
        ['site_id', 'Site sentinelle', 'select-api', true, 'sites'],
        ['date_capture', 'Date et heure de capture', 'datetime-local', true],
        ['espece', 'Espèce observée', 'text', false],
        ['nombre_individus', "Nombre d'individus", 'number', true, null, 1],
        ['methode_capture', 'Méthode de capture', 'select-api', false, 'methodes_capture'],
        ['sexe', 'Sexe', 'select', false, ['Non déterminé', 'Femelle', 'Mâle']],
        ['stade', 'Stade', 'select', false, ['Adulte', 'Larve', 'Nymphe', 'Œuf']],
        ['temperature', 'Température (°C)', 'number', false],
        ['humidite', 'Humidité (%)', 'number', false],
        ['notes', 'Notes de terrain', 'textarea', false],
      ],
    },
    site: {
      singular: 'site', back: 'gestion-sites.html', create: data => apiSites.create(data),
      fields: [
        ['nom', 'Nom du site', 'text', true], ['code', 'Code unique', 'text', true],
        ['region', 'Région', 'text', true], ['district', 'District', 'text', false],
        ['latitude', 'Latitude', 'number', false], ['longitude', 'Longitude', 'number', false],
        ['zone_type', 'Type de zone', 'select', false, ['urbain', 'périurbain', 'rural']],
        ['type_environnement', "Type d'environnement", 'text', false],
        ['responsable', 'Responsable', 'text', false], ['contact', 'Contact', 'text', false],
        ['description', 'Description', 'textarea', false],
      ],
    },
    utilisateur: {
      singular: 'utilisateur', back: 'gestion-utilisateurs.html', create: data => apiUsers.create(data),
      fields: [
        ['full_name', 'Nom complet', 'text', true], ['username', "Nom d'utilisateur", 'text', true],
        ['email', 'Adresse e-mail', 'email', true], ['password', 'Mot de passe initial', 'password', true],
        ['role_id', 'Rôle', 'select-api', false, 'roles'], ['telephone', 'Téléphone', 'tel', false],
        ['etablissement', 'Établissement', 'text', false], ['region', 'Région', 'text', false],
        ['district', 'District', 'text', false],
      ],
    },
    dataset: {
      singular: 'dataset', back: 'gestion-datasets.html', create: data => apiDatasets.create(data),
      fields: [
        ['nom', 'Nom du dataset', 'text', true], ['version', 'Version', 'text', false, null, 'v1.0.0'],
        ['type', 'Type de données', 'select', false, ['images', 'audio', 'mixte', 'tabulaire']],
        ['source_annotations', "Source des annotations", 'text', false],
        ['images_count', "Nombre d'éléments", 'number', false, null, 0],
        ['chemin', 'Chemin ou URI de stockage', 'text', false],
        ['statut', 'Statut initial', 'select', false, ['en_preparation', 'pret', 'en_cours']],
        ['description', 'Description', 'textarea', false],
      ],
    },
    campagne: {
      singular: 'campagne', back: 'campagnes.html', create: data => apiCampagnes.create(data),
      fields: [
        ['nom', 'Nom de la campagne', 'text', true], ['type_campagne', 'Type', 'select', true, ['collecte', 'pulvérisation', 'sensibilisation', 'évaluation']],
        ['date_debut', 'Date de début', 'datetime-local', true], ['date_fin', 'Date de fin', 'datetime-local', false],
        ['region', 'Région', 'text', false], ['responsable', 'Responsable', 'text', false],
        ['budget', 'Budget prévisionnel', 'number', false], ['description', 'Objectifs et description', 'textarea', false],
        ['notes', 'Notes internes', 'textarea', false],
      ],
    },
    intervention: {
      singular: 'intervention', back: 'interventions.html', create: data => apiInterventions.create(data),
      fields: [
        ['titre', "Titre de l'intervention", 'text', true],
        ['site_id', 'Site concerné', 'select-api', false, 'sites'],
        ['type_intervention', 'Type', 'select', true, ['pulverisation', 'assainissement', 'moustiquaire', 'sensibilisation', 'inspection']],
        ['date_prevue', 'Date prévue', 'datetime-local', true], ['responsable', 'Responsable', 'text', false],
        ['description', 'Description', 'textarea', false], ['notes', 'Consignes', 'textarea', false],
      ],
    },
  };

  const config = configs[entity];
  if (!config) return;
  document.querySelectorAll('[data-entity-name]').forEach(el => { el.textContent = config.singular; });
  document.querySelectorAll('[data-back-link]').forEach(el => { el.href = config.back; });

  const apiOptions = {
    sites: async () => (await apiSites.list({ limit: 500 }) || []).map(x => ({ value: x.id, label: `${x.nom}${x.code ? ` — ${x.code}` : ''}` })),
    roles: async () => (await apiRoles.list() || []).map(x => ({ value: x.id, label: x.name })),
    methodes_capture: async () => (await loadReferenceDataEnriched('methodes_capture')).map(x => ({ value: x.code, label: x.label })),
  };

  let pendingImageFile = null;
  let pendingAudioFile = null;
  let recordingTimer = null;

  function injectCaptureMediaSection() {
    const section = document.createElement('div');
    section.id = 'capture-media-section';
    section.className = 'md:col-span-2 grid gap-5 rounded-2xl border border-dashed border-brand-primary/30 bg-gradient-to-br from-sky-50 to-cyan-50 p-5 dark:from-slate-800 dark:to-slate-900 dark:border-slate-600';
    section.innerHTML = `
      <h3 class="text-sm font-bold text-brand-primary flex items-center gap-2"><span class="material-symbols-outlined">perm_media</span>Médias terrain (optionnel)</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-semibold" data-i18n="capture.media.photo">Photo du spécimen</span>
          <input type="file" id="capture-image-file" accept="image/*" capture="environment"
            class="mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-4 file:py-2 file:text-white file:font-semibold" />
          <img id="capture-image-preview" class="mt-3 hidden max-h-40 rounded-xl border object-cover shadow" alt="Aperçu" />
        </label>
        <div>
          <span class="text-sm font-semibold" data-i18n="capture.media.audio">Enregistrement audio</span>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" id="capture-audio-record" class="entomo-btn-primary text-sm py-2">
              <span class="material-symbols-outlined text-base">mic</span><span data-i18n="capture.media.record_start">Démarrer</span>
            </button>
            <button type="button" id="capture-audio-stop" class="hidden rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              <span class="material-symbols-outlined text-base">stop</span><span data-i18n="capture.media.record_stop">Arrêter</span>
            </button>
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold dark:border-slate-600">
              <span class="material-symbols-outlined text-base">upload_file</span>
              <span data-i18n="capture.media.upload">Fichier audio</span>
              <input type="file" id="capture-audio-file" accept="audio/*" class="hidden" />
            </label>
          </div>
          <p id="capture-audio-status" class="mt-2 text-xs text-gray-500"></p>
          <label class="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" id="capture-analyze-audio" class="rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
            <span data-i18n="capture.media.analyze">Analyser l'audio après création</span>
          </label>
        </div>
      </div>`;
    fieldsRoot.appendChild(section);

    document.getElementById('capture-image-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      pendingImageFile = file || null;
      const preview = document.getElementById('capture-image-preview');
      if (file && preview) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
      }
    });

    document.getElementById('capture-audio-file')?.addEventListener('change', (e) => {
      pendingAudioFile = e.target.files?.[0] || null;
      const status = document.getElementById('capture-audio-status');
      if (status && pendingAudioFile) status.textContent = `Fichier : ${pendingAudioFile.name}`;
    });

    const recordBtn = document.getElementById('capture-audio-record');
    const stopBtn = document.getElementById('capture-audio-stop');
    const status = document.getElementById('capture-audio-status');

    recordBtn?.addEventListener('click', async () => {
      if (!window.EntomoAudioRecorder?.isSupported()) {
        pushNotification('Enregistrement micro non disponible sur ce navigateur.', 'warning');
        return;
      }
      try {
        await EntomoAudioRecorder.start();
        recordBtn.classList.add('hidden');
        stopBtn?.classList.remove('hidden');
        if (status) status.textContent = 'Enregistrement en cours…';
        let sec = 0;
        recordingTimer = setInterval(() => { sec += 1; if (status) status.textContent = `Enregistrement : ${sec}s`; }, 1000);
      } catch {
        pushNotification('Impossible d\'accéder au micro.', 'error');
      }
    });

    stopBtn?.addEventListener('click', async () => {
      clearInterval(recordingTimer);
      const result = await EntomoAudioRecorder.stop();
      recordBtn?.classList.remove('hidden');
      stopBtn?.classList.add('hidden');
      if (result?.file) {
        pendingAudioFile = result.file;
        if (status) status.textContent = `Audio enregistré (${Math.round(result.durationMs / 1000)}s) — ${result.file.name}`;
        document.getElementById('capture-analyze-audio').checked = true;
      }
    });

    if (window.EntomoI18n) EntomoI18n.apply(section);
  }

  function fieldMarkup([name, label, type, required, options, defaultValue]) {
    const wide = type === 'textarea' ? 'md:col-span-2' : '';
    const common = `id="f-${name}" name="${name}" ${required ? 'required' : ''} class="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-gray-700 dark:bg-gray-800"`;
    let control;
    if (type === 'textarea') control = `<textarea ${common} rows="4" placeholder="Saisissez les informations utiles…"></textarea>`;
    else if (type === 'select' || type === 'select-api') {
      const entries = Array.isArray(options) ? options.map(value => `<option value="${value}">${value}</option>`).join('') : '';
      control = `<select ${common} data-options-source="${type === 'select-api' ? options : ''}"><option value="">Sélectionner…</option>${entries}</select>`;
    } else {
      const step = type === 'number' ? 'step="any"' : '';
      const constraints = name === 'nombre_individus' ? 'min="1" step="1"'
        : name === 'humidite' ? 'min="0" max="100"'
        : name === 'latitude' ? 'min="-90" max="90"'
        : name === 'longitude' ? 'min="-180" max="180"'
        : name === 'images_count' || name === 'budget' ? 'min="0"' : '';
      control = `<input ${common} type="${type}" ${step} ${constraints} value="${defaultValue ?? ''}" />`;
    }
    return `<div class="${wide}"><label for="f-${name}" class="text-sm font-semibold text-gray-700 dark:text-gray-200">${label}${required ? ' *' : ''}</label>${control}<p class="field-error mt-1 hidden text-xs text-red-600"></p></div>`;
  }

  fieldsRoot.innerHTML = config.fields.map(fieldMarkup).join('');
  if (entity === 'capture') injectCaptureMediaSection();
  for (const select of fieldsRoot.querySelectorAll('[data-options-source]')) {
    const loader = apiOptions[select.dataset.optionsSource];
    if (!loader) continue;
    const options = await loader();
    select.insertAdjacentHTML('beforeend', options.map(x => `<option value="${x.value}">${x.label}</option>`).join(''));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    for (const [name, , type] of config.fields) {
      if (data[name] === '') delete data[name];
      else if (type === 'number' || name.endsWith('_id')) data[name] = Number(data[name]);
    }
    if (entity === 'capture' && data.date_capture && !String(data.date_capture).includes('T')) {
      data.date_capture = `${data.date_capture}:00`;
    }
    if (data.date_debut && data.date_fin && new Date(data.date_fin) < new Date(data.date_debut)) {
      const endField = document.getElementById('f-date_fin');
      endField?.setCustomValidity('La date de fin doit être postérieure à la date de début.');
      endField?.reportValidity();
      endField?.addEventListener('input', () => endField.setCustomValidity(''), { once: true });
      return;
    }
    buttonLoading(submitBtn, true);
    const result = await config.create(data);
    if (result && !result.offline && entity === 'capture' && result.id) {
      try {
        if (pendingImageFile) await apiCaptures.uploadImage(result.id, pendingImageFile);
        if (pendingAudioFile) await apiCaptures.uploadAudio(result.id, pendingAudioFile);
        if (pendingAudioFile && document.getElementById('capture-analyze-audio')?.checked) {
          await apiCaptures.analyser(result.id);
        }
      } catch {
        pushNotification('Capture créée mais erreur lors de l\'upload des médias.', 'warning');
      }
    }
    buttonLoading(submitBtn, false);
    if (!result) return;
    if (result.offline) {
      pushNotification('Capture enregistrée hors ligne. Synchronisation à la reconnexion.', 'warning');
      setTimeout(() => { window.location.href = config.back; }, 650);
      return;
    }
    pushNotification(`${config.singular[0].toUpperCase() + config.singular.slice(1)} créé(e) avec succès.`, 'success');
    const detailRoutes = { capture: 'details-capture.html', site: 'details-site.html', dataset: 'details-dataset.html' };
    setTimeout(() => { window.location.href = detailRoutes[entity] && result.id ? `${detailRoutes[entity]}?id=${result.id}` : config.back; }, 650);
  });
});
