document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const siteId = params.get('id');
  if (!siteId) {
    pushNotification('Aucun ID de site fourni.', 'error');
    return;
  }

  let site = null;

  async function loadSite() {
    try {
      showLoader();
      const data = await apiSites.get(parseInt(siteId));
      if (!data) {
        hideLoader();
        pushNotification('Site introuvable.', 'error');
        return;
      }
      site = data;
      hideLoader();
      document.querySelectorAll('[data-field="nom"]').forEach(el => el.textContent = data.nom || data.name || '');
      document.querySelectorAll('[data-field="code"]').forEach(el => el.textContent = data.code || '');
      document.querySelectorAll('[data-field="region"]').forEach(el => el.textContent = data.region || 'N/A');
      document.querySelectorAll('[data-field="district"]').forEach(el => el.textContent = data.district || 'N/A');
      document.querySelectorAll('[data-field="type"]').forEach(el => el.textContent = data.type_zone || data.type || 'N/A');
      document.querySelectorAll('[data-field="environnement"]').forEach(el => el.textContent = data.environnement || 'N/A');
      document.querySelectorAll('[data-field="coordonnees"]').forEach(el => el.textContent = data.latitude != null && data.longitude != null ? `${data.latitude}, ${data.longitude}` : 'N/A');
      document.querySelectorAll('[data-field="statut"]').forEach(el => {
        const actif = data.actif !== false;
        el.textContent = actif ? 'Actif' : 'Inactif';
        el.className = `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
      });

      const region = data.region || '';
      const district = data.district || '';
      const coord = data.coordonnees || data.coord || '';
      const mapEl = document.getElementById('site-map');
      if (mapEl) {
        mapEl.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
          <span class="material-symbols-outlined text-4xl">map</span>
          <p class="text-sm">${region}${district ? ' / ' + district : ''}</p>
          ${coord ? `<p class="text-xs font-mono">${coord}</p>` : ''}
          <a class="text-xs font-semibold text-brand-primary hover:underline" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${data.latitude || ''}&mlon=${data.longitude || ''}#map=10/${data.latitude || 14.5}/${data.longitude || -14.5}">Voir la carte interactive OpenStreetMap</a>
        </div>`;
      }

      const mapsLink = document.getElementById('site-maps-link');
      if (mapsLink) {
        const query = data.latitude != null && data.longitude != null
          ? `${data.latitude},${data.longitude}`
          : [data.nom, district, region].filter(Boolean).join(', ');
        mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }

      return data;
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement du site.', 'error');
    }
  }

  async function loadActivities() {
    try {
      const data = await apiSites.activites(parseInt(siteId));
      const container = document.getElementById('activities-list');
      if (!container) return;
      if (!data || !data.length) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Aucune activité enregistrée.</p>';
        return;
      }
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500'];
      container.innerHTML = data.map((act, i) => `
        <div class="relative pl-6 pb-4">
          <div class="absolute left-2 top-2 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          <div class="absolute left-0 top-2 w-4 h-4 rounded-full ${colors[i % colors.length]} border-2 border-white dark:border-gray-800"></div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">${act.titre || act.type || 'Activité'}</p>
          <p class="text-xs text-gray-500">${act.date ? new Date(act.date).toLocaleDateString('fr-FR') : ''}${act.utilisateur ? ' par ' + act.utilisateur : ''}</p>
          ${act.description ? `<p class="text-xs text-gray-500 mt-1">${act.description}</p>` : ''}
        </div>`).join('');
    } catch (err) {
      console.warn('Erreur chargement activités:', err);
    }
  }

  async function loadRecentCaptures() {
    try {
      const data = await apiCaptures.list({ site_id: siteId, limit: 10 });
      const container = document.getElementById('recent-captures');
      if (!container) return;
      if (!data || !data.length) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Aucune capture récente.</p>';
        return;
      }
      container.innerHTML = data.map(c => `
        <a href="details-capture.html?id=${c.id}" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-gray-400">bug_report</span>
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">${c.code || c.id_specimen_code || 'SPN-' + String(c.id || 0).padStart(5, '0')}</p>
              <p class="text-xs text-gray-500">${c.espece_identifiee || c.espece || c.identification_ia || ''}${c.date_capture ? ' — ' + new Date(c.date_capture).toLocaleDateString('fr-FR') : ''}</p>
            </div>
          </div>
          <span class="text-xs font-medium ${c.statut === 'valide' || c.statut === 'validee' ? 'text-green-600' : c.statut === 'rejete' ? 'text-red-600' : c.statut === 'corrige' ? 'text-orange-600' : 'text-yellow-600'}">${c.statut || ''}</span>
        </a>`).join('');
    } catch (err) {
      console.warn('Erreur chargement captures:', err);
    }
  }

  document.getElementById('btn-ajouter-activite')?.addEventListener('click', () => {
    openModal('Ajouter une activité', `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre *</label>
          <input id="f-titre" type="text" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3" placeholder="Ex: Visite terrain">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea id="f-description" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none" placeholder="Détails de l'activité..."></textarea>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
          <input id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
        </div>
      </div>`, {
      confirmLabel: 'Ajouter',
      onConfirm: async () => {
        const titre = document.getElementById('f-titre')?.value.trim();
        if (!titre) { pushNotification('Le titre est obligatoire.', 'error'); return; }
        try {
          showLoader();
          const selectedDate = document.getElementById('f-date')?.value;
          const res = await apiSites.addActivite(parseInt(siteId), {
            type_activite: titre,
            description: document.getElementById('f-description')?.value.trim(),
            date_activite: selectedDate ? new Date(`${selectedDate}T00:00:00`).toISOString() : new Date().toISOString(),
          });
          if (res !== null) {
            pushNotification('Activité ajoutée avec succès.', 'success');
            await loadActivities();
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification("Erreur lors de l'ajout de l'activité.", 'error');
        }
      },
    });
  });

  document.getElementById('btn-modifier-site')?.addEventListener('click', () => {
    if (!site) return;
    openModal('Modifier le site', `
      <div class="space-y-3">
        <label class="block text-sm font-medium">Nom *<input id="site-edit-nom" value="${site.nom || ''}" class="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700"></label>
        <label class="block text-sm font-medium">Région<input id="site-edit-region" value="${site.region || ''}" class="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700"></label>
        <label class="block text-sm font-medium">District<input id="site-edit-district" value="${site.district || ''}" class="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-700"></label>
      </div>`, {
      confirmLabel: 'Enregistrer',
      onConfirm: async () => {
        const nom = document.getElementById('site-edit-nom')?.value.trim();
        if (!nom) { pushNotification('Le nom du site est obligatoire.', 'error'); return false; }
        const updated = await apiSites.update(Number(siteId), {
          nom,
          region: document.getElementById('site-edit-region')?.value.trim() || null,
          district: document.getElementById('site-edit-district')?.value.trim() || null,
        });
        if (!updated) return false;
        site = updated;
        await loadSite();
        pushNotification('Site mis à jour en base.', 'success');
        return true;
      },
    });
  });

  const openSiteCaptures = () => { window.location.href = `gestion-captures.html?site_id=${encodeURIComponent(siteId)}`; };
  document.getElementById('btn-voir-captures')?.addEventListener('click', openSiteCaptures);
  document.getElementById('btn-toutes-captures-site')?.addEventListener('click', openSiteCaptures);

  await loadSite();
  loadActivities();
  loadRecentCaptures();
});
