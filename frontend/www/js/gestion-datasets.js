document.addEventListener('DOMContentLoaded', async () => {
  let datasets = [];
  let editingId = null;

  function norm(d) {
    return {
      ...d,
      nom: d.nom || d.name || 'Dataset',
      version: d.version || 'v1.0.0',
      modifie_le: d.modifie_le || d.updated_at || d.date_modification || d.created_at || '',
      source_annotations: d.source_annotations || d.source || d.annotation_source || '',
      images_count: d.images_count || d.nb_images || d.image_count || 0,
      statut: d.statut || d.status || 'En cours',
      description: d.description || '',
    };
  }

  const STATUT_COLORS = {
    'Validé': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'En Révision': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    'En cours': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'Erreur': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    'Brouillon': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Annotation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  };

  async function loadDatasets() {
    try {
      showLoader();
      const data = await apiDatasets.list({ limit: 200 });
      if (data) datasets = data.map(norm);
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des datasets', 'error');
    }
    renderTable(datasets);
  }

  function renderTable(data) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">folder_off</span>Aucun dataset trouvé</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(d => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50" data-id="${d.id}">
        <td class="table-col-1 h-[72px] px-4 py-2 text-gray-900 dark:text-white text-sm font-medium">${d.nom}</td>
        <td class="table-col-2 h-[72px] px-4 py-2 text-gray-500 dark:text-gray-400 text-sm font-mono">${d.version}</td>
        <td class="table-col-3 h-[72px] px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">${d.modifie_le ? new Date(d.modifie_le).toLocaleDateString('fr-FR') : '-'}</td>
        <td class="table-col-4 h-[72px] px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">${d.source_annotations || '-'}</td>
        <td class="table-col-5 h-[72px] px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">${d.images_count ? Number(d.images_count).toLocaleString() : '0'}</td>
        <td class="table-col-6 h-[72px] px-4 py-2 text-sm">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[d.statut] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}">${d.statut}</span>
        </td>
        <td class="table-col-7 h-[72px] px-4 py-2 text-sm font-medium">
          <div class="flex items-center gap-2">
            <a class="text-brand-primary hover:underline text-sm" href="details-dataset.html?id=${d.id}">Détails</a>
            <button class="btn-edit text-primary hover:underline text-sm" data-id="${d.id}">Modifier</button>
            <button class="btn-annotate text-purple-600 hover:underline text-sm" data-id="${d.id}">Annoter</button>
            <button class="btn-delete text-red-600 hover:underline text-sm" data-id="${d.id}">Supprimer</button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openDatasetModal(parseInt(btn.dataset.id)));
    });

    tbody.querySelectorAll('.btn-annotate').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = datasets.find(x => x.id === parseInt(btn.dataset.id));
        if (d) openAnnotationModal(d);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = datasets.find(x => x.id === parseInt(btn.dataset.id));
        if (!d) return;
        confirmDelete(d.nom, async () => {
          try {
            const res = await apiDatasets.delete(d.id);
            if (res !== null) {
              datasets = datasets.filter(x => x.id !== d.id);
              renderTable(datasets);
              pushNotification(`Dataset "${d.nom}" supprimé.`, 'success');
            }
          } catch (err) {
            pushNotification('Erreur lors de la suppression', 'error');
          }
        });
      });
    });
  }

  function openDatasetModal(id = null) {
    editingId = id;
    const d = id ? datasets.find(x => x.id === id) : null;

    const body = `
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom du dataset *</label>
          <input id="f-nom" value="${d?.nom || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Version</label>
          <input id="f-version" value="${d?.version || 'v1.0.0'}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 font-mono"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
          <select id="f-statut" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${['En cours', 'En Révision', 'Validé', 'Brouillon', 'Erreur'].map(s => `<option ${d?.statut === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Source annotations</label>
          <input id="f-source" value="${d?.source_annotations || ''}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre d'images</label>
          <input id="f-images" type="number" min="0" value="${d?.images_count || 0}"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-desc" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none">${d?.description || ''}</textarea>
        </div>
      </div>`;

    openModal(id ? `Modifier — ${d.nom}` : 'Nouveau jeu de données', body, {
      confirmLabel: id ? 'Enregistrer' : 'Créer',
      onConfirm: async () => {
        const nom = document.getElementById('f-nom')?.value.trim();
        if (!nom) { pushNotification('Le nom est obligatoire.', 'error'); return; }
        const data = {
          nom,
          version: document.getElementById('f-version')?.value.trim() || 'v1.0.0',
          statut: document.getElementById('f-statut')?.value || 'En cours',
          source_annotations: document.getElementById('f-source')?.value.trim() || '',
          images_count: parseInt(document.getElementById('f-images')?.value || 0),
          description: document.getElementById('f-desc')?.value.trim() || '',
        };
        try {
          showLoader();
          if (editingId) {
            const res = await apiDatasets.update(editingId, data);
            if (res !== null) {
              await loadDatasets();
              pushNotification(`Dataset "${nom}" mis à jour.`, 'success');
            }
          } else {
            const res = await apiDatasets.create(data);
            if (res !== null) {
              await loadDatasets();
              pushNotification(`Dataset "${nom}" créé.`, 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la sauvegarde', 'error');
        }
      },
    });
  }

  async function openAnnotationModal(d) {
    const especes = await loadReferenceData('especes');
    const body = `
      <div class="space-y-4 text-sm">
        <p class="text-gray-500">Ajouter des annotations au dataset <strong>${d.nom}</strong></p>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Étiquettes</label>
          <div class="grid grid-cols-2 gap-2">
            ${especes.map(l => `
              <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border border-gray-200 dark:border-gray-700">
                <input type="checkbox" class="annotation-label rounded text-brand-primary"/>
                <span>${l.label}</span>
              </label>`).join('')}
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
          <textarea id="f-annot-notes" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none"
                    placeholder="Contexte de capture, conditions météo..."></textarea>
        </div>
      </div>`;

    openModal(`Annoter — ${d.nom}`, body, {
      confirmLabel: "Sauvegarder l'annotation",
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const labels = Array.from(document.querySelectorAll('.annotation-label:checked')).map(cb => cb.closest('label')?.querySelector('span')?.textContent || '').filter(Boolean);
        const notes = document.getElementById('f-annot-notes')?.value.trim() || '';
        if (!labels.length && !notes) {
          pushNotification('Sélectionnez au moins une étiquette ou saisissez une note.', 'warning');
          return;
        }
        try {
          showLoader();
          const labelsToSave = labels.length ? labels : ['Note libre'];
          const results = [];
          for (const label of labelsToSave) {
            results.push(await apiDatasets.addAnnotation(d.id, { label, notes: notes || null }));
          }
          if (results.every(Boolean)) {
            await apiDatasets.update(d.id, { statut: 'Annotation' });
            await loadDatasets();
            pushNotification(`${results.length} annotation(s) ajoutée(s) à "${d.nom}".`, 'success');
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification("Erreur lors de l'annotation", 'error');
        }
      },
    });
  }

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Nouveau Jeu de Données')) {
      btn.addEventListener('click', () => openDatasetModal());
    }
  });

  const searchInput = document.querySelector('input[type="search"], input[placeholder*="Rechercher"]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = datasets.filter(d => {
        return !q || d.nom.toLowerCase().includes(q) || d.source_annotations.toLowerCase().includes(q);
      });
      renderTable(filtered);
    });
  }

  document.querySelectorAll('[class*="flex"][class*="gap-3"] button, .flex-wrap.items-center.gap-3 button').forEach(btn => {
    const p = btn.querySelector('p');
    if (!p) return;
    const text = p.textContent || '';

    if (text.startsWith('Source')) {
      btn.addEventListener('click', () => {
        const sources = [...new Set(datasets.map(d => d.source_annotations).filter(Boolean))];
        showFilterDD(btn, ['Toutes', ...sources], val => { p.textContent = `Source: ${val}`; filterTable(); });
      });
    } else if (text.startsWith('Statut')) {
      btn.addEventListener('click', () => {
        showFilterDD(btn, ['Tous', 'En cours', 'En Révision', 'Validé', 'Brouillon', 'Annotation', 'Erreur'], val => { p.textContent = `Statut: ${val}`; filterTable(); });
      });
    } else if (text.startsWith('Date')) {
      btn.addEventListener('click', () => {
        showFilterDD(btn, ['Toutes', 'Aujourd\'hui', 'Cette semaine', 'Ce mois', 'Cette année'], val => { p.textContent = `Date: ${val}`; filterTable(); });
      });
    }
  });

  function showFilterDD(anchor, options, onSelect) {
    document.querySelectorAll('.filter-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'filter-dd absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] py-1';
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

  let filterSource = 'Toutes';
  let filterStatus = 'Tous';
  let filterDate = 'Toutes';

  function filterTable() {
    const filtered = datasets.filter(d => {
      const matchSource = filterSource === 'Toutes' || d.source_annotations === filterSource;
      const matchStatus = filterStatus === 'Tous' || d.statut === filterStatus;
      let matchDate = true;
      if (filterDate !== 'Toutes' && d.modifie_le) {
        const date = new Date(d.modifie_le);
        const now = new Date();
        if (filterDate === "Aujourd'hui") matchDate = date.toDateString() === now.toDateString();
        else if (filterDate === 'Cette semaine') {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
          matchDate = date >= weekAgo;
        } else if (filterDate === 'Ce mois') matchDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        else if (filterDate === 'Cette année') matchDate = date.getFullYear() === now.getFullYear();
      }
      return matchSource && matchStatus && matchDate;
    });
    renderTable(filtered);
  }

  await loadDatasets();
});
