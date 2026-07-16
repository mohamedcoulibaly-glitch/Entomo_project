document.addEventListener('DOMContentLoaded', () => {
  const table = document.querySelector('main table');
  const tbody = table?.querySelector('tbody');
  const createButton = Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('nouveau pipeline'));
  let pipelines = [];
  let models = [];
  let activeFilter = 'all';

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const statusMeta = status => ({
    en_cours: ['En cours', 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'],
    termine: ['Terminé', 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'],
    erreur: ['Erreur', 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'],
    arrete: ['Arrêté', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'],
    en_attente: ['En attente', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  })[status] || [status || 'Inconnu', 'bg-gray-100 text-gray-700'];

  function modelFor(pipeline) { return models.find(model => model.id === pipeline.ml_model_id); }

  function updateStats() {
    const cards = Array.from(document.querySelectorAll('main [class*="rounded-lg"][class*="p-6"]')).filter(card => card.querySelector('p') && card.querySelector('p + p'));
    const values = [
      pipelines.filter(p => p.statut === 'en_cours').length,
      pipelines.filter(p => p.statut === 'termine').length,
      pipelines.length ? `${Math.round(pipelines.reduce((sum, p) => sum + (p.progression || 0), 0) / pipelines.length)}%` : '0%',
    ];
    cards.slice(0, 3).forEach((card, index) => { const value = card.querySelector('p + p'); if (value) value.textContent = values[index]; });
  }

  function render() {
    if (!tbody) return;
    const visiblePipelines = pipelines.filter(pipeline => {
      if (activeFilter === 'scheduled') return ['en_attente', 'planifie', 'planifiee'].includes(pipeline.statut);
      if (activeFilter === 'history') return ['termine', 'erreur', 'arrete'].includes(pipeline.statut);
      return true;
    });
    if (!visiblePipelines.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-gray-500"><span class="material-symbols-outlined text-4xl block mb-2">account_tree</span>Aucun pipeline. Créez le premier pour lancer un entraînement.</td></tr>';
      updateStats();
      return;
    }
    tbody.innerHTML = visiblePipelines.map(pipeline => {
      const model = modelFor(pipeline);
      const [label, classes] = statusMeta(pipeline.statut);
      return `<tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5" data-pipeline-id="${pipeline.id}">
        <td class="px-4 py-4"><p class="font-medium text-gray-900 dark:text-white">${escapeHtml(pipeline.nom)}</p><p class="text-xs text-gray-500">${escapeHtml(pipeline.type_pipeline || 'Pipeline ML')}</p></td>
        <td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}">${label}</span></td>
        <td class="px-4 py-4 min-w-40"><div class="flex items-center gap-2"><div class="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-2 rounded-full bg-brand-primary transition-all" style="width:${pipeline.progression || 0}%"></div></div><span class="text-xs text-gray-500">${pipeline.progression || 0}%</span></div></td>
        <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">${escapeHtml(model?.nom || 'Non associé')}</td>
        <td class="px-4 py-4 text-sm text-gray-500">${model?.precision != null ? `${(model.precision * 100).toFixed(1)}%` : '—'}</td>
        <td class="px-4 py-4 text-sm text-gray-500">${model?.f1_score != null ? model.f1_score.toFixed(2) : '—'}</td>
        <td class="px-4 py-4"><div class="flex justify-end gap-1">
          <button data-pipeline-action="details" title="Ouvrir le suivi" class="size-9 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><span class="material-symbols-outlined text-lg">description</span></button>
          ${pipeline.statut === 'en_cours'
            ? '<button data-pipeline-action="stop" title="Arrêter" class="size-9 rounded-lg text-amber-600 hover:bg-amber-50"><span class="material-symbols-outlined text-lg">stop_circle</span></button>'
            : '<button data-pipeline-action="run" title="Lancer" class="size-9 rounded-lg text-brand-primary hover:bg-blue-50"><span class="material-symbols-outlined text-lg">play_circle</span></button>'}
          <button data-pipeline-action="edit" title="Configurer" class="size-9 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><span class="material-symbols-outlined text-lg">settings</span></button>
        </div></td>
      </tr>`;
    }).join('');
    updateStats();
  }

  async function load() {
    try {
      [pipelines, models] = await Promise.all([apiModels.listPipelines(), apiModels.list()]);
      if (!Array.isArray(pipelines) || !Array.isArray(models)) throw new Error('API ML indisponible');
      render();
    } catch (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-red-600">Le backend ML est indisponible. Réessayez après avoir vérifié la connexion.</td></tr>';
      pushNotification('Impossible de charger les pipelines ML.', 'error');
    }
  }

  function pipelineForm(pipeline = {}) {
    return `<form class="space-y-4" novalidate>
      <label class="block text-sm font-medium">Nom du pipeline *<input id="pipeline-name" value="${escapeHtml(pipeline.nom || '')}" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3" placeholder="Ex. Réentraînement hebdomadaire"></label>
      <label class="block text-sm font-medium">Type<select id="pipeline-type" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">${['entrainement', 'evaluation', 'deploiement'].map(type => `<option value="${type}" ${pipeline.type_pipeline === type ? 'selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
      <label class="block text-sm font-medium">Modèle associé<select id="pipeline-model" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"><option value="">Aucun</option>${models.map(model => `<option value="${model.id}" ${pipeline.ml_model_id === model.id ? 'selected' : ''}>${escapeHtml(model.nom)} · v${escapeHtml(model.version || '1.0')}</option>`).join('')}</select></label>
      <p id="pipeline-error" class="hidden text-sm text-red-600">Le nom est obligatoire.</p>
    </form>`;
  }

  function openPipelineForm(pipeline = null) {
    openModal(pipeline ? 'Configurer le pipeline' : 'Nouveau pipeline ML', pipelineForm(pipeline || {}), {
      confirmLabel: pipeline ? 'Enregistrer' : 'Créer le pipeline', confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const nom = document.getElementById('pipeline-name')?.value.trim();
        if (!nom) { document.getElementById('pipeline-error')?.classList.remove('hidden'); return false; }
        const data = {
          nom,
          type_pipeline: document.getElementById('pipeline-type')?.value,
          ml_model_id: Number(document.getElementById('pipeline-model')?.value) || null,
        };
        const result = pipeline ? await apiModels.updatePipeline(pipeline.id, data) : await apiModels.createPipeline(data);
        if (!result) return false;
        pushNotification(pipeline ? 'Pipeline mis à jour.' : 'Pipeline créé en base.', 'success');
        await load();
        return true;
      },
    });
  }

  createButton?.addEventListener('click', () => openPipelineForm());

  document.querySelectorAll('[data-pipeline-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.pipelineFilter;
    document.querySelectorAll('[data-pipeline-filter]').forEach(item => {
      item.classList.toggle('border-b-primary', item === button);
      item.classList.toggle('text-primary', item === button);
      item.classList.toggle('border-b-transparent', item !== button);
      item.classList.toggle('text-gray-500', item !== button);
    });
    render();
  }));

  tbody?.addEventListener('click', async event => {
    const button = event.target.closest('[data-pipeline-action]');
    const row = event.target.closest('[data-pipeline-id]');
    if (!button || !row) return;
    const pipeline = pipelines.find(item => item.id === Number(row.dataset.pipelineId));
    if (!pipeline) return;
    const action = button.dataset.pipelineAction;
    if (action === 'details') { window.location.href = `details-pipeline.html?id=${pipeline.id}`; return; }
    if (action === 'edit') { openPipelineForm(pipeline); return; }
    if (action === 'logs') {
      openModal(`Logs · ${escapeHtml(pipeline.nom)}`, `<pre class="whitespace-pre-wrap rounded-xl bg-gray-950 text-green-300 p-4 text-xs max-h-80 overflow-auto">${escapeHtml(pipeline.logs || 'Aucun journal disponible pour cette exécution.')}</pre>`, { confirmLabel: 'Fermer', cancelLabel: '' });
      return;
    }
    buttonLoading(button, true);
    try {
      const result = action === 'run' ? await apiModels.runPipeline(pipeline.id) : await apiModels.stopPipeline(pipeline.id);
      if (!result) throw new Error('Action pipeline indisponible');
      pushNotification(action === 'run' ? 'Pipeline démarré.' : 'Pipeline arrêté.', 'success');
      await load();
    } catch (error) { pushNotification("L'action sur le pipeline a échoué.", 'error'); }
    finally { buttonLoading(button, false); }
  });

  load();
  const refreshTimer = setInterval(() => { if (pipelines.some(pipeline => pipeline.statut === 'en_cours')) load(); }, 5000);
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
});
