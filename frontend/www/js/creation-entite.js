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
        ['methode_capture', 'Méthode de capture', 'text', false],
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
  };

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
    if (data.date_debut && data.date_fin && new Date(data.date_fin) < new Date(data.date_debut)) {
      const endField = document.getElementById('f-date_fin');
      endField?.setCustomValidity('La date de fin doit être postérieure à la date de début.');
      endField?.reportValidity();
      endField?.addEventListener('input', () => endField.setCustomValidity(''), { once: true });
      return;
    }
    buttonLoading(submitBtn, true);
    const result = await config.create(data);
    buttonLoading(submitBtn, false);
    if (!result) return;
    pushNotification(`${config.singular[0].toUpperCase() + config.singular.slice(1)} créé(e) avec succès.`, 'success');
    const detailRoutes = { capture: 'details-capture.html', site: 'details-site.html', dataset: 'details-dataset.html' };
    setTimeout(() => { window.location.href = detailRoutes[entity] && result.id ? `${detailRoutes[entity]}?id=${result.id}` : config.back; }, 650);
  });
});
