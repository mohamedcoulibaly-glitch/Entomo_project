document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const captureId = params.get('id');
  if (!captureId) {
    pushNotification('Aucun ID de capture fourni.', 'error');
    return;
  }

  let capture = null;

  async function loadCapture() {
    try {
      showLoader();
      const data = await apiCaptures.get(parseInt(captureId));
      if (!data) {
        hideLoader();
        pushNotification('Capture introuvable.', 'error');
        return;
      }
      capture = data;
      hideLoader();
      renderCapture();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement de la capture.', 'error');
    }
  }

  function renderCapture() {
    const c = capture;
    const code = c.code || c.id_specimen_code || `SPN-${String(c.id || 0).padStart(5, '0')}`;
    const imageUrl = c.specimen_image || c.image_url || c.photo_url || '';
    const espece = c.espece_identifiee || c.espece || c.identification_ia || 'Non identifié';
    const confiance = c.confiance || c.confidence || 0;
    const confiancePct = c.confiance ? `${Math.round(c.confiance * 100)}%` : c.confidence_pct || '0%';
    const statut = c.statut || 'a_valider';

    const statutLabel = { a_valider: 'À valider', valide: 'Validé', validee: 'Validé', corrige: 'Corrigé', rejete: 'Rejeté' };
    const statutColors = { 'À valider': 'bg-yellow-100 text-yellow-800', 'Validé': 'bg-green-100 text-green-800', 'Corrigé': 'bg-orange-100 text-orange-800', 'Rejeté': 'bg-red-100 text-red-800' };
    const label = statutLabel[statut] || statut;

    document.querySelectorAll('[data-field="code"]').forEach(el => el.textContent = code);
    document.querySelectorAll('[data-field="espece"]').forEach(el => el.textContent = espece);
    document.querySelectorAll('[data-field="confiance"]').forEach(el => el.textContent = confiancePct);
    document.querySelectorAll('[data-field="statut"]').forEach(el => { el.textContent = label; el.className = `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statutColors[label] || 'bg-gray-100 text-gray-700'}`; });
    document.querySelectorAll('[data-field="sexe"]').forEach(el => el.textContent = c.sexe || 'Non spécifié');
    document.querySelectorAll('[data-field="stade"]').forEach(el => el.textContent = c.stade || 'Non spécifié');
    document.querySelectorAll('[data-field="site"]').forEach(el => el.textContent = c.site?.nom || c.site_nom || c.site || 'N/A');
    document.querySelectorAll('[data-field="date"]').forEach(el => el.textContent = c.date_capture ? new Date(c.date_capture).toLocaleDateString('fr-FR') : 'N/A');
    document.querySelectorAll('[data-field="technicien"]').forEach(el => el.textContent = c.technicien || c.utilisateur?.nom_complet || 'N/A');
    document.querySelectorAll('[data-field="notes"]').forEach(el => el.textContent = c.notes || 'Aucune note');
    document.querySelectorAll('[data-field="localisation"]').forEach(el => el.textContent = c.localisation || c.region || 'N/A');
    document.querySelectorAll('[data-field="methode"]').forEach(el => el.textContent = c.methode_capture || c.methode || 'N/A');
    document.querySelectorAll('[data-field="temperature"]').forEach(el => el.textContent = c.temperature != null ? `${c.temperature} °C` : 'N/A');
    document.querySelectorAll('[data-field="humidite"]').forEach(el => el.textContent = c.humidite != null ? `${c.humidite}%` : 'N/A');
    const notes = document.getElementById('notes-capture');
    if (notes) notes.value = c.notes || '';

    const imgEl = document.getElementById('capture-image');
    if (imgEl) {
      if (imageUrl) {
        imgEl.innerHTML = `<img src="${imageUrl}" alt="${code}" class="w-full h-full object-contain cursor-pointer" id="capture-img-tag">`;
        document.getElementById('capture-img-tag')?.addEventListener('click', () => {
          openModal('Image — ' + code, `<img src="${imageUrl}" alt="${code}" class="max-w-full max-h-[80vh] mx-auto">`, { confirmLabel: 'Fermer', cancelLabel: '' });
        });
      } else {
        imgEl.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><span class="material-symbols-outlined text-6xl">image</span></div>';
      }
    }
  }

  document.getElementById('btn-valider-capture')?.addEventListener('click', async () => {
    try {
      showLoader();
      const res = await apiCaptures.valider(capture.id, { statut: 'valide' });
      if (res !== null) {
        pushNotification('Capture validée avec succès.', 'success');
        await loadCapture();
      }
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors de la validation.', 'error');
    }
  });

  document.getElementById('btn-corriger-espece')?.addEventListener('click', async () => {
    const especes = await loadReferenceData('especes');
    openModal('Corriger la capture', `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce corrigée *</label>
          <select id="f-espece-corrigee" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
            ${especes.map(e => `<option>${e.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commentaire</label>
          <textarea id="f-commentaire" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none" placeholder="Raison de la correction..."></textarea>
        </div>
      </div>`, {
      confirmLabel: 'Soumettre la correction',
      confirmClass: 'bg-orange-600 text-white',
      onConfirm: async () => {
        const espece = document.getElementById('f-espece-corrigee')?.value;
        const commentaire = document.getElementById('f-commentaire')?.value.trim();
        if (!espece) { pushNotification('Veuillez sélectionner une espèce.', 'error'); return; }
        try {
          showLoader();
          const res = await apiCaptures.valider(capture.id, { statut: 'corrige', espece_corrigee: espece, notes: commentaire || null });
          if (res !== null) {
            pushNotification('Capture corrigée avec succès.', 'success');
            await loadCapture();
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la correction.', 'error');
        }
      },
    });
  });

  document.getElementById('btn-rejeter-capture')?.addEventListener('click', async () => {
    try {
      showLoader();
      const res = await apiCaptures.valider(capture.id, { statut: 'rejete' });
      if (res !== null) {
        pushNotification('Capture rejetée.', 'warning');
        await loadCapture();
      }
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du rejet.', 'error');
    }
  });

  document.getElementById('btn-telecharger-image')?.addEventListener('click', () => {
    const imageUrl = capture?.image_path || capture?.specimen_image || capture?.image_url || capture?.photo_url;
    if (!imageUrl) { pushNotification('Aucune image disponible pour cette capture.', 'warning'); return; }
    const link = document.createElement('a');
    link.href = resolveMediaUrl(imageUrl) || imageUrl;
    link.download = `${capture.code || `capture-${capture.id}`}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  document.getElementById('btn-ajouter-note')?.addEventListener('click', async () => {
    const notes = document.getElementById('notes-capture')?.value.trim() || '';
    const button = document.getElementById('btn-ajouter-note');
    buttonLoading(button, true);
    try {
      const updated = await apiCaptures.update(capture.id, { notes });
      if (updated) {
        capture = updated;
        pushNotification('Note enregistrée en base.', 'success');
      }
    } catch (error) { pushNotification("La note n'a pas pu être enregistrée.", 'error'); }
    finally { buttonLoading(button, false); }
  });

  await loadCapture();
});
