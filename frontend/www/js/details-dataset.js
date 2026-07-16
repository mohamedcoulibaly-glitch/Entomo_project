document.addEventListener('DOMContentLoaded', async () => {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const errorBox = document.getElementById('dataset-error');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  if (!Number.isInteger(id) || id <= 0) {
    showError("L'identifiant du dataset est absent ou invalide.");
    return;
  }

  const dataset = await apiDatasets.get(id);
  if (!dataset) {
    showError('Dataset introuvable ou inaccessible.');
    return;
  }

  const fields = {
    nom: dataset.nom || 'Dataset sans nom',
    description: dataset.description || 'Aucune description',
    statut: dataset.statut || '—',
    version: dataset.version || '—',
    type: dataset.type || '—',
    images_count: Number(dataset.images_count || 0).toLocaleString('fr-FR'),
    source_annotations: dataset.source_annotations || '—',
  };
  Object.entries(fields).forEach(([name, value]) => {
    document.querySelectorAll(`[data-field="${name}"]`).forEach(el => { el.textContent = value; });
  });
  document.title = `${fields.nom} — Ento-App Afrique`;

  const annotations = Array.isArray(dataset.annotations)
    ? dataset.annotations
    : (await apiDatasets.annotations(id) || []);
  const list = document.getElementById('annotations-list');
  document.getElementById('annotation-count').textContent = `${annotations.length} élément${annotations.length > 1 ? 's' : ''}`;
  if (!annotations.length) {
    list.innerHTML = '<p class="py-8 text-center text-gray-400">Aucune annotation enregistrée.</p>';
    return;
  }
  list.replaceChildren(...annotations.map(annotation => {
    const row = document.createElement('article');
    row.className = 'py-4';
    const title = document.createElement('h3');
    title.className = 'font-semibold';
    title.textContent = annotation.label || 'Annotation';
    const notes = document.createElement('p');
    notes.className = 'mt-1 text-sm text-gray-500';
    notes.textContent = annotation.notes || 'Aucune note';
    row.append(title, notes);
    return row;
  }));
});
