document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const container = document.getElementById('gite-details');
  if (!id) {
    container.innerHTML = '<p class="text-red-500">Identifiant de fiche gîte manquant.</p>';
    return;
  }

  try {
    const site = await apiSites.get(id);
    if (!site) {
      container.innerHTML = '<p class="text-gray-500">Fiche gîte introuvable.</p>';
      return;
    }
    container.innerHTML = `
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">${site.nom || 'Fiche gîte'}</h1>
        <p class="text-sm text-gray-500 mb-4">${site.code || ''} — ${site.region || 'Région inconnue'}, ${site.district || ''}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span class="text-gray-500">Type de zone</span><p class="font-medium">${site.zone_type || '—'}</p></div>
          <div><span class="text-gray-500">Environnement</span><p class="font-medium">${site.type_environnement || '—'}</p></div>
          <div><span class="text-gray-500">Latitude</span><p class="font-medium">${site.latitude ?? '—'}</p></div>
          <div><span class="text-gray-500">Longitude</span><p class="font-medium">${site.longitude ?? '—'}</p></div>
          <div><span class="text-gray-500">Statut</span><p class="font-medium">${site.actif ? 'Actif' : 'Inactif'}</p></div>
        </div>
        <div class="mt-6 flex gap-2">
          <a href="gestion-sites.html" class="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium">Retour aux sites</a>
          <a href="gestion-hors-ligne.html" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Synchronisation</a>
        </div>
      </div>`;
    document.title = `${site.nom || 'Fiche gîte'} - Ento-App`;
  } catch (err) {
    container.innerHTML = '<p class="text-red-500">Impossible de charger la fiche gîte.</p>';
  }
});
