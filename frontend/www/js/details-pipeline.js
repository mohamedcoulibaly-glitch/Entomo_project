document.addEventListener('DOMContentLoaded', async () => {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const root = document.getElementById('pipeline-detail');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  if (!id) { root.innerHTML = '<p class="rounded-xl bg-red-50 p-5 text-red-700">Pipeline invalide.</p>'; return; }
  async function render() {
    const pipeline = await apiModels.getPipeline(id);
    if (!pipeline) { root.innerHTML = '<p class="rounded-xl bg-red-50 p-5 text-red-700">Pipeline introuvable.</p>'; return false; }
    const running = pipeline.statut === 'en_cours';
    root.innerHTML = `<section class="rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 shadow-sm"><div class="flex flex-wrap justify-between gap-4"><div><p class="text-sm text-teal-700 font-semibold">${escapeHtml(pipeline.type_pipeline || 'Pipeline ML')}</p><h1 class="text-3xl font-black mt-1">${escapeHtml(pipeline.nom)}</h1><p class="text-slate-500 mt-2">Statut : <b>${escapeHtml(pipeline.statut)}</b></p></div><button id="pipeline-control" class="h-11 rounded-xl px-5 font-semibold ${running ? 'bg-amber-100 text-amber-800' : 'bg-teal-700 text-white'}">${running ? 'Arrêter' : 'Lancer'}</button></div><div class="mt-8"><div class="flex justify-between mb-2 text-sm"><span>Progression persistée</span><b>${pipeline.progression || 0}%</b></div><div class="h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div class="h-full bg-teal-600 transition-all duration-700" style="width:${pipeline.progression || 0}%"></div></div></div></section><section class="rounded-2xl bg-slate-950 text-emerald-300 p-6"><h2 class="text-white font-bold mb-3">Journal d'exécution</h2><pre class="whitespace-pre-wrap text-xs leading-6 max-h-96 overflow-auto">${escapeHtml(pipeline.logs || 'En attente de la première exécution.')}</pre></section>`;
    document.getElementById('pipeline-control').addEventListener('click', async event => { buttonLoading(event.currentTarget, true); const result = running ? await apiModels.stopPipeline(id) : await apiModels.runPipeline(id); if (result) { pushNotification(running ? 'Pipeline arrêté.' : 'Pipeline démarré.', 'success'); await render(); } });
    return running;
  }
  let running = await render();
  const timer = setInterval(async () => { if (running) running = await render(); }, 4000);
  window.addEventListener('beforeunload', () => clearInterval(timer));
});
