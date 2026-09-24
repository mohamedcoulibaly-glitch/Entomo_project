document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#pipelines-table-body');
  const createBtn = document.getElementById('btn-new-pipeline');
  let pipelines = [];
  let models = [];
  let risqueModels = [];
  let activeFilter = 'all';

  const escapeHtml = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const statusMeta = s => ({
    en_cours: ['En cours', 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'],
    termine: ['Terminé', 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'],
    erreur: ['Erreur', 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'],
    arrete: ['Arrêté', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'],
    en_attente: ['En attente', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  })[s] || [s || 'Inconnu', 'bg-gray-100 text-gray-700'];

  function modelFor(p) { return models.find(m => m.id === p.ml_model_id); }

  function updateStats() {
    const total = pipelines.length;
    const enCours = pipelines.filter(p => p.statut === 'en_cours').length;
    const termine = pipelines.filter(p => p.statut === 'termine').length;
    const erreur = pipelines.filter(p => p.statut === 'erreur').length;
    const statTotal = document.getElementById('stat-total');
    const statEnCours = document.getElementById('stat-en-cours');
    const statTermine = document.getElementById('stat-termine');
    const statErreur = document.getElementById('stat-erreur');
    if (statTotal) statTotal.textContent = total;
    if (statEnCours) statEnCours.textContent = enCours;
    if (statTermine) statTermine.textContent = termine;
    if (statErreur) statErreur.textContent = erreur;
  }

  function renderRiskModels() {
    const container = document.getElementById('risk-models-container');
    if (!container) return;
    if (!risqueModels.length) {
      container.innerHTML = '<p class="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">Aucun modèle de risque disponible.</p>';
      return;
    }
    container.innerHTML = risqueModels.map(rm => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-700/50">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-brand-primary">risk_alert</span>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(rm.nom)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(rm.type_risque || 'Risque')} — Seuil: ${rm.seuil_alerte != null ? rm.seuil_alerte : 'N/A'}</p>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${rm.actif ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}">
          <span class="size-1.5 rounded-full ${rm.actif ? 'bg-green-500' : 'bg-gray-400'}"></span>
          ${rm.actif ? 'Actif' : 'Inactif'}
        </span>
      </div>
    `).join('');
  }

  function render() {
    if (!tbody) return;
    const visible = pipelines.filter(p => {
      if (activeFilter === 'scheduled') return ['en_attente', 'planifie', 'planifiee'].includes(p.statut);
      if (activeFilter === 'history') return ['termine', 'erreur', 'arrete'].includes(p.statut);
      return true;
    });
    updateStats();
    renderRiskModels();
    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-gray-500"><span class="material-symbols-outlined text-4xl block mb-2">account_tree</span>Aucun pipeline. Créez le premier pour lancer un entraînement.</td></tr>';
      return;
    }
    tbody.innerHTML = visible.map(p => {
      const model = modelFor(p);
      const [label, classes] = statusMeta(p.statut);
      return `<tr class="border-b border-gray-200 dark:border-[#3b4754] hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" data-pipeline-id="${p.id}">
        <td class="h-[72px] px-4 py-2">
          <p class="text-gray-900 dark:text-white text-sm font-medium">${escapeHtml(p.nom)}</p>
          <p class="text-xs text-gray-500">${escapeHtml(p.type_pipeline || 'Pipeline ML')}</p>
        </td>
        <td class="h-[72px] px-4 py-2">
          <div class="inline-flex items-center gap-2 rounded-full py-1 px-3 text-xs font-medium ${classes}">
            <span class="size-2 rounded-full ${classes.split(' ')[0].replace('bg-', 'bg-')}"></span> ${label}
          </div>
        </td>
        <td class="h-[72px] px-4 py-2 min-w-40">
          <div class="flex items-center gap-2">
            <div class="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
              <div class="h-2 rounded-full bg-brand-primary transition-all" style="width:${p.progression || 0}%"></div>
            </div>
            <span class="text-xs text-gray-500">${p.progression || 0}%</span>
          </div>
        </td>
        <td class="h-[72px] px-4 py-2 text-gray-500 dark:text-[#9dabb9] text-sm">${escapeHtml(model?.nom || 'Non associé')}</td>
        <td class="h-[72px] px-4 py-2 text-gray-500 dark:text-[#9dabb9] text-sm">${model?.precision != null ? (model.precision * 100).toFixed(1) + '%' : '—'}</td>
        <td class="h-[72px] px-4 py-2 text-gray-500 dark:text-[#9dabb9] text-sm">${model?.f1_score != null ? model.f1_score.toFixed(2) : '—'}</td>
        <td class="h-[72px] px-4 py-2 text-right">
          <div class="flex justify-end gap-1">
            <button data-pipeline-action="details" title="Détails" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <span class="material-symbols-outlined text-xl">description</span>
            </button>
            ${p.statut === 'en_cours'
              ? '<button data-pipeline-action="stop" title="Arrêter" class="p-2 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"><span class="material-symbols-outlined text-xl">stop_circle</span></button>'
              : '<button data-pipeline-action="run" title="Lancer" class="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-brand-primary"><span class="material-symbols-outlined text-xl">play_circle</span></button>'}
            <button data-pipeline-action="edit" title="Configurer" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <span class="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function load() {
    try {
      const [pRes, mRes, rRes] = await Promise.all([
        apiModels.listPipelines(),
        apiModels.list(),
        apiModels.listRisque(),
      ]);
      pipelines = Array.isArray(pRes) ? pRes : [];
      models = Array.isArray(mRes) ? mRes : [];
      risqueModels = Array.isArray(rRes) ? rRes : [];
      render();
    } catch (err) {
      console.error('[Pipelines-4] Load error:', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-red-500 dark:text-red-400"><span class="material-symbols-outlined text-4xl block mb-2">error</span>Erreur de chargement des pipelines.</td></tr>';
      pushNotification('Impossible de charger les pipelines ML.', 'error');
    }
  }

  function pipelineForm(p = {}) {
    return `<form class="space-y-4" novalidate>
      <label class="block text-sm font-medium">Nom du pipeline *
        <input id="pipeline-name" value="${escapeHtml(p.nom || '')}" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3" placeholder="Ex. Réentraînement hebdomadaire">
      </label>
      <label class="block text-sm font-medium">Type
        <select id="pipeline-type" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
          ${['entrainement', 'evaluation', 'deploiement'].map(t => `<option value="${t}" ${p.type_pipeline === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
      </label>
      <label class="block text-sm font-medium">Modèle associé
        <select id="pipeline-model" class="mt-1 w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
          <option value="">Aucun</option>
          ${models.map(m => `<option value="${m.id}" ${p.ml_model_id === m.id ? 'selected' : ''}>${escapeHtml(m.nom)} · v${escapeHtml(m.version || '1.0')}</option>`).join('')}
        </select>
      </label>
      <p id="pipeline-error" class="hidden text-sm text-red-600">Le nom est obligatoire.</p>
    </form>`;
  }

  function openPipelineForm(p = null) {
    openModal(p ? 'Configurer le pipeline' : 'Nouveau pipeline ML', pipelineForm(p || {}), {
      confirmLabel: p ? 'Enregistrer' : 'Créer le pipeline',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const nom = document.getElementById('pipeline-name')?.value.trim();
        if (!nom) { document.getElementById('pipeline-error')?.classList.remove('hidden'); return false; }
        const data = {
          nom,
          type_pipeline: document.getElementById('pipeline-type')?.value,
          ml_model_id: Number(document.getElementById('pipeline-model')?.value) || null,
        };
        const result = p ? await apiModels.updatePipeline(p.id, data) : await apiModels.createPipeline(data);
        if (!result) return false;
        pushNotification(p ? 'Pipeline mis à jour.' : 'Pipeline créé avec succès.', 'success');
        await load();
        return true;
      },
    });
  }

  if (createBtn) createBtn.addEventListener('click', () => openPipelineForm());

  document.querySelectorAll('[data-pipeline-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.pipelineFilter;
      document.querySelectorAll('[data-pipeline-filter]').forEach(b => {
        b.classList.toggle('border-b-brand-primary', b === btn);
        b.classList.toggle('text-brand-primary', b === btn);
        b.classList.toggle('border-b-transparent', b !== btn);
        b.classList.toggle('text-gray-500', b !== btn);
        b.classList.toggle('dark:text-[#9dabb9]', b !== btn);
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
      openModal(`Détails — ${escapeHtml(pipeline.nom)}`, `
        <div class="space-y-3 text-sm">
          <div class="flex justify-between"><span class="text-gray-500">Statut</span><span class="font-medium">${statusMeta(pipeline.statut)[0]}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Progression</span><span class="font-medium">${pipeline.progression || 0}%</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Type</span><span class="font-medium">${escapeHtml(pipeline.type_pipeline || 'N/A')}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Modèle</span><span class="font-medium">${escapeHtml(modelFor(pipeline)?.nom || 'Non associé')}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Créé le</span><span class="font-medium">${pipeline.date_creation ? new Date(pipeline.date_creation).toLocaleDateString('fr-FR') : 'N/A'}</span></div>
          ${pipeline.logs ? `<div><span class="text-gray-500 block mb-1">Logs</span><pre class="whitespace-pre-wrap rounded-xl bg-gray-950 text-green-300 p-4 text-xs max-h-60 overflow-auto">${escapeHtml(pipeline.logs)}</pre></div>` : ''}
        </div>
      `, { confirmLabel: 'Fermer', cancelLabel: '' });
      return;
    }

    if (action === 'edit') { openPipelineForm(pipeline); return; }

    if (action === 'logs') {
      openModal(`Logs · ${escapeHtml(pipeline.nom)}`, `<pre class="whitespace-pre-wrap rounded-xl bg-gray-950 text-green-300 p-4 text-xs max-h-80 overflow-auto">${escapeHtml(pipeline.logs || 'Aucun journal disponible pour cette exécution.')}</pre>`, { confirmLabel: 'Fermer', cancelLabel: '' });
      return;
    }

    buttonLoading(btn, true);
    try {
      const result = action === 'run' ? await apiModels.runPipeline(pipeline.id) : await apiModels.stopPipeline(pipeline.id);
      if (!result) throw new Error('Action indisponible');
      pushNotification(action === 'run' ? 'Pipeline démarré.' : 'Pipeline arrêté.', 'success');
      await load();
    } catch (err) {
      pushNotification("L'action sur le pipeline a échoué.", 'error');
    } finally {
      buttonLoading(btn, false);
    }
  });

  load();
  const refreshTimer = setInterval(() => {
    if (pipelines.some(p => p.statut === 'en_cours')) load();
  }, 5000);
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
});
