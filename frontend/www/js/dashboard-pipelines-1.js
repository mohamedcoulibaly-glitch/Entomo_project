document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('main table tbody');
  const createBtn = document.querySelector('[data-pipeline-create-btn]');
  let pipelines = [];
  let models = [];
  let activeFilter = 'all';

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);

  const statusMeta = s => ({
    en_cours:    ['En cours',   'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'],
    termine:     ['Terminé',    'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'],
    erreur:      ['Échec',      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'],
    arrete:      ['Arrêté',     'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'],
    en_attente:  ['En attente', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  })[s] || [s || 'Inconnu', 'bg-gray-100 text-gray-700'];

  function modelFor(p) { return models.find(m => m.id === p.ml_model_id); }

  function updateStats() {
    const total = pipelines.length;
    const running = pipelines.filter(p => p.statut === 'en_cours').length;
    const completed = pipelines.filter(p => p.statut === 'termine').length;
    const failed = pipelines.filter(p => p.statut === 'erreur').length;

    const setStat = (name, val) => {
      const el = document.querySelector(`[data-stat="${name}"]`);
      if (el) el.textContent = val;
    };
    setStat('total', total);
    setStat('running', running);
    setStat('completed', completed);
    setStat('failed', failed);
  }

  function render() {
    if (!tbody) return;

    const visible = pipelines.filter(p => {
      if (activeFilter === 'scheduled') return ['en_attente', 'planifie', 'planifiee'].includes(p.statut);
      if (activeFilter === 'history') return ['termine', 'erreur', 'arrete'].includes(p.statut);
      return true;
    });

    if (!visible.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-gray-500">
        <span class="material-symbols-outlined text-4xl block mb-2">account_tree</span>
        Aucun pipeline. Créez le premier pour lancer un entraînement.</td></tr>`;
      updateStats();
      return;
    }

    tbody.innerHTML = visible.map(p => {
      const model = modelFor(p);
      const [label, classes] = statusMeta(p.statut);
      const lastRun = p.derniere_execution || p.updated_at || '—';
      const lastRunFmt = lastRun !== '—' ? new Date(lastRun).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

      return `<tr class="border-b border-gray-200 dark:border-[#3b4754] hover:bg-gray-50 dark:hover:bg-white/5" data-pipeline-id="${p.id}">
        <td class="h-[72px] px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">${esc(p.nom)}</td>
        <td class="h-[72px] px-4 py-2">
          <span class="inline-flex items-center gap-2 rounded-full py-1 px-3 text-xs font-medium ${classes}">
            <span class="size-2 rounded-full ${classes.split(' ')[0].replace('bg-', 'bg-')}"></span> ${label}
          </span>
        </td>
        <td class="h-[72px] px-4 py-2 text-sm text-gray-500 dark:text-[#9dabb9]">${lastRunFmt}</td>
        <td class="h-[72px] px-4 py-2 text-sm text-gray-500 dark:text-[#9dabb9]">${esc(model?.nom || model?.version || '—')}</td>
        <td class="h-[72px] px-4 py-2 text-sm text-gray-500 dark:text-[#9dabb9]">${model?.precision != null ? (model.precision * 100).toFixed(1) + '%' : '—'}</td>
        <td class="h-[72px] px-4 py-2 text-sm text-gray-500 dark:text-[#9dabb9]">${model?.f1_score != null ? model.f1_score.toFixed(2) : '—'}</td>
        <td class="h-[72px] px-4 py-2 text-right">
          <div class="flex justify-end gap-1">
            <button data-pipeline-action="details" title="Ouvrir le suivi" class="size-9 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <span class="material-symbols-outlined text-xl">description</span>
            </button>
            ${p.statut === 'en_cours'
              ? `<button data-pipeline-action="stop" title="Arrêter" class="size-9 rounded-full text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                  <span class="material-symbols-outlined text-xl">stop_circle</span>
                </button>`
              : `<button data-pipeline-action="run" title="Lancer" class="size-9 rounded-full text-brand-primary hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <span class="material-symbols-outlined text-xl">play_circle</span>
                </button>`
            }
          </div>
        </td>
      </tr>`;
    }).join('');

    updateStats();
  }

  async function load() {
    try {
      [pipelines, models] = await Promise.all([apiModels.listPipelines(), apiModels.list()]);
      if (!Array.isArray(pipelines) || !Array.isArray(models)) throw new Error('API indisponible');
      render();
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-600">
          Le backend ML est indisponible. Vérifiez la connexion.</td></tr>`;
      }
      pushNotification('Impossible de charger les pipelines ML.', 'error');
    }
  }

  function pipelineForm(pipeline = {}) {
    const types = [
      ['entrainement', 'Entraînement'],
      ['fine_tuning', 'Fine-tuning'],
      ['evaluation', 'Évaluation'],
      ['deploiement', 'Déploiement'],
    ];
    return `<form class="space-y-4" novalidate>
      <label class="block text-sm font-medium">Nom du pipeline *
        <input id="pipeline-name" value="${esc(pipeline.nom || '')}"
          class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"
          placeholder="Ex. Réentraînement hebdomadaire" required>
      </label>
      <label class="block text-sm font-medium">Type
        <select id="pipeline-type" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
          ${types.map(([val, lbl]) => `<option value="${val}" ${pipeline.type_pipeline === val ? 'selected' : ''}>${lbl}</option>`).join('')}
        </select>
      </label>
      <label class="block text-sm font-medium">Modèle associé
        <select id="pipeline-model" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
          <option value="">Aucun</option>
          ${models.map(m => `<option value="${m.id}" ${pipeline.ml_model_id === m.id ? 'selected' : ''}>${esc(m.nom)} · v${esc(m.version || '1.0')}</option>`).join('')}
        </select>
      </label>
      <p id="pipeline-error" class="hidden text-sm text-red-600">Le nom est obligatoire.</p>
    </form>`;
  }

  function openPipelineForm(pipeline = null) {
    openModal(pipeline ? 'Configurer le pipeline' : 'Nouveau Pipeline', pipelineForm(pipeline || {}), {
      confirmLabel: pipeline ? 'Enregistrer' : 'Créer le pipeline',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const nom = document.getElementById('pipeline-name')?.value.trim();
        if (!nom) {
          document.getElementById('pipeline-error')?.classList.remove('hidden');
          return false;
        }
        const data = {
          nom,
          type_pipeline: document.getElementById('pipeline-type')?.value || 'entrainement',
          ml_model_id: Number(document.getElementById('pipeline-model')?.value) || null,
        };
        const result = pipeline
          ? await apiModels.updatePipeline(pipeline.id, data)
          : await apiModels.createPipeline(data);
        if (!result) return false;
        pushNotification(pipeline ? 'Pipeline mis à jour.' : 'Pipeline créé.', 'success');
        await load();
        return true;
      },
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => openPipelineForm());
  }

  document.querySelectorAll('[data-pipeline-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.pipelineFilter;
      document.querySelectorAll('[data-pipeline-filter]').forEach(b => {
        const active = b === btn;
        b.classList.toggle('border-b-brand-primary', active);
        b.classList.toggle('text-brand-primary', active);
        b.classList.toggle('border-b-transparent', !active);
        b.classList.toggle('text-gray-500', !active);
      });
      render();
    });
  });

  tbody?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-pipeline-action]');
    const row = e.target.closest('[data-pipeline-id]');
    if (!btn || !row) return;

    const pipeline = pipelines.find(p => p.id === Number(row.dataset.pipelineId));
    if (!pipeline) return;

    const action = btn.dataset.pipelineAction;

    if (action === 'details') {
      window.location.href = `details-pipeline.html?id=${pipeline.id}`;
      return;
    }

    if (action === 'run') {
      buttonLoading(btn, true);
      try {
        const result = await apiModels.runPipeline(pipeline.id);
        if (result) {
          pushNotification('Pipeline démarré.', 'success');
          await load();
        }
      } catch { pushNotification("Erreur lors du lancement.", 'error'); }
      finally { buttonLoading(btn, false); }
      return;
    }

    if (action === 'stop') {
      buttonLoading(btn, true);
      try {
        const result = await apiModels.stopPipeline(pipeline.id);
        if (result) {
          pushNotification('Pipeline arrêté.', 'success');
          await load();
        }
      } catch { pushNotification("Erreur lors de l'arrêt.", 'error'); }
      finally { buttonLoading(btn, false); }
      return;
    }
  });

  load();
  const refreshTimer = setInterval(() => {
    if (pipelines.some(p => p.statut === 'en_cours')) load();
  }, 5000);
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
});
