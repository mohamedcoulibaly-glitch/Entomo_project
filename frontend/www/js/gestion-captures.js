document.addEventListener('DOMContentLoaded', async () => {
  let captures = [];
  let ncPendingImageFile = null;
  let ncPendingAudioFile = null;
  let ncRecordingTimer = null;

  const STATUT_LABEL = {
    'a_valider': 'À valider',
    'valide': 'Validé',
    'validee': 'Validé',
    'corrige': 'Corrigé',
    'rejete': 'Rejeté',
    'en_attente': 'À valider',
    'analyse': 'Analysé',
  };

  const STATUT_COLORS = {
    'À valider': 'bg-[#FFC107]/20 text-[#D98A00]',
    'Validé': 'bg-[#4CAF50]/20 text-[#2E7D32]',
    'Corrigé': 'bg-[#D32F2F]/20 text-[#B71C1C]',
    'Rejeté': 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
    'Analysé': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  };

  function norm(c) {
    const statut = STATUT_LABEL[c.statut] || c.statut || 'À valider';
    return {
      ...c,
      id_specimen: c.id_specimen || c.id || 0,
      code: c.code || c.id_specimen_code || `SPN-${String(c.id || 0).padStart(5, '0')}`,
      // Le backend renvoie un chemin relatif (image_path), pas une URL absolue —
      // resolveMediaUrl() (api.js) le transforme en URL réellement chargeable.
      specimen_image: resolveMediaUrl(c.specimen_image || c.image_url || c.photo_url || c.image_path) || '',
      identification_ia: c.identification_ia || c.espece_identifiee || c.espece || 'Non identifié',
      confiance: c.confiance || c.confidence || 0,
      confiance_pct: c.confiance ? `${Math.round(c.confiance * 100)}%` : c.confidence_pct || '0%',
      statut,
      sexe: c.sexe || '',
      site: c.site?.nom || c.site_nom || c.site || '',
      date_capture: c.date_capture || c.date || '',
      technicien: c.technicien || c.utilisateur?.nom_complet || '',
      espece: c.espece_identifiee || c.espece || c.identification_ia || '',
      localisation: c.localisation || c.region || '',
      notes: c.notes || '',
    };
  }

  async function loadCaptures() {
    try {
      showLoader();
      const data = await apiCaptures.list({ limit: 200 });
      if (data) captures = data.map(norm);
      hideLoader();
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des captures', 'error');
    }
    renderTable(captures);
  }

  // Certaines captures (données de démo) référencent un chemin d'image qui
  // n'existe pas réellement sur le disque. Comme on utilise background-image
  // (pas <img>), il n'y a pas d'événement onerror natif : on précharge donc
  // chaque vignette en JS et on retombe sur l'icône générique si ça échoue.
  function verifyThumbnails(container) {
    container.querySelectorAll('[data-img-check]').forEach((el) => {
      const url = el.dataset.imgCheck;
      if (!url) return;
      const probe = new Image();
      probe.onerror = () => {
        el.style.backgroundImage = 'none';
        el.style.backgroundColor = '#e5e7eb';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `<span class="material-symbols-outlined text-gray-400 ${el.dataset.imgIconSize || 'text-lg'}">bug_report</span>`;
      };
      probe.src = url;
    });
  }

  function renderTable(data) {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">
        <span class="material-symbols-outlined text-4xl block mb-2">search_off</span>Aucun spécimen trouvé</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr class="border-t border-t-[#dbe0e6] dark:border-t-white/10 hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 cursor-pointer" data-id="${c.id}">
        <td class="h-[72px] px-4 py-2 w-16">
          <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-md w-10 h-10"
               data-img-check="${c.specimen_image || ''}" data-img-icon-size="text-lg"
               style="${c.specimen_image ? `background-image: url('${c.specimen_image}')` : 'background-color: #e5e7eb; display:flex; align-items:center; justify-content:center;'}">
            ${!c.specimen_image ? '<span class="material-symbols-outlined text-gray-400 text-lg">bug_report</span>' : ''}
          </div>
        </td>
        <td class="h-[72px] px-4 py-2 text-[#617589] dark:text-white/60 text-sm font-mono leading-normal">${c.code}</td>
        <td class="h-[72px] px-4 py-2 text-[#111418] dark:text-white text-sm font-medium leading-normal">${c.identification_ia}${c.sexe ? ', ' + c.sexe : ''}</td>
        <td class="h-[72px] px-4 py-2 w-24 text-[#617589] dark:text-white/60 text-sm font-normal leading-normal">${c.confiance_pct}</td>
        <td class="h-[72px] px-4 py-2 w-32">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[c.statut] || 'bg-gray-100 text-gray-700'}">${c.statut}</span>
        </td>
      </tr>`).join('');

    verifyThumbnails(tbody);

    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = parseInt(row.dataset.id);
        const c = captures.find(x => x.id === id);
        if (c) openValidationModal(c);
      });
    });
  }

  async function openValidationModal(c) {
    const especes = await loadReferenceData('especes');
    const body = `
      <div class="space-y-4">
        <div class="flex items-start gap-4">
          <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-20 h-20 flex-shrink-0"
               data-img-check="${c.specimen_image || ''}" data-img-icon-size="text-3xl"
               style="${c.specimen_image ? `background-image: url('${c.specimen_image}')` : 'background-color: #e5e7eb; display:flex; align-items:center; justify-content:center;'}">
            ${!c.specimen_image ? '<span class="material-symbols-outlined text-gray-400 text-3xl">bug_report</span>' : ''}
          </div>
          <div class="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div><span class="text-gray-500">ID:</span> <strong class="font-mono">${c.code}</strong></div>
            <div><span class="text-gray-500">Confiance:</span> <strong id="val-confiance">${c.confiance_pct}</strong></div>
            <div class="col-span-2"><span class="text-gray-500">Identification IA:</span> <strong id="val-identification-ia">${c.identification_ia}${c.sexe ? ' (' + c.sexe + ')' : ''}</strong></div>
            <div><span class="text-gray-500">Statut:</span> <strong>${c.statut}</strong></div>
            ${c.site ? `<div class="col-span-2"><span class="text-gray-500">Site:</span> <strong>${c.site}</strong></div>` : ''}
            ${c.date_capture ? `<div class="col-span-2"><span class="text-gray-500">Date:</span> <strong>${new Date(c.date_capture).toLocaleDateString('fr-FR')}</strong></div>` : ''}
            <div class="col-span-2 flex items-center gap-3">
              <button type="button" id="btn-modifier-details" class="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline">
                <span class="material-symbols-outlined text-sm">edit</span>Modifier les détails du spécimen
              </button>
              ${c.specimen_image ? `<button type="button" id="btn-analyser-image" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                <span class="material-symbols-outlined text-sm">neurology</span>Analyser (IA)
              </button>` : ''}
            </div>
          </div>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Action de validation</label>
          <div class="flex gap-2 mb-3">
            <button id="val-action-valider" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">Valider</button>
            <button id="val-action-corriger" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Corriger</button>
            <button id="val-action-rejeter" class="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">Rejeter</button>
          </div>
          <div id="val-correction-section" class="hidden">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce corrigée</label>
            <select id="f-espece-corrigee" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 mb-2">
              ${especes.map(e => `<option ${c.espece === e.label ? 'selected' : ''}>${e.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commentaire</label>
            <textarea id="f-commentaire" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-16 resize-none" placeholder="Notes optionnelles...">${c.notes || ''}</textarea>
          </div>
          <p id="val-error" class="text-red-500 text-xs hidden mt-1"></p>
        </div>
      </div>`;

    openModal(`Validation — ${c.code}`, body, {
      confirmLabel: 'Soumettre',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const actionEl = document.querySelector('#val-action-valider.bg-green-200, #val-action-corriger.bg-yellow-200, #val-action-rejeter.bg-red-200');
        let action = 'valider';
        if (actionEl) {
          if (actionEl.id === 'val-action-corriger') action = 'corriger';
          else if (actionEl.id === 'val-action-rejeter') action = 'rejeter';
        }
        const commentaire = document.getElementById('f-commentaire')?.value.trim() || '';
        const especeCorrigee = document.getElementById('f-espece-corrigee')?.value || '';

        // Le backend attend { statut, notes, espece_corrigee } (schéma CaptureValidate),
        // pas { action, commentaire } — c'était le bug : chaque validation échouait
        // avec un 422 "Field required: statut", silencieusement pour l'utilisateur.
        const STATUT_PAR_ACTION = { valider: 'valide', corriger: 'corrige', rejeter: 'rejete' };
        const validationData = {
          statut: STATUT_PAR_ACTION[action],
          notes: commentaire || undefined,
          espece_corrigee: action === 'corriger' ? especeCorrigee : undefined,
        };

        try {
          showLoader();
          const res = await apiCaptures.valider(c.id, validationData);
          if (res !== null) {
            await loadCaptures();
            pushNotification(`Spécimen ${c.code} ${action === 'valider' ? 'validé' : action === 'corriger' ? 'corrigé' : 'rejeté'} avec succès.`, 'success');
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification("Erreur lors de la validation", 'error');
        }
      },
    });

    verifyThumbnails(document);

    setTimeout(() => {
      const validerBtn = document.getElementById('val-action-valider');
      const corrigerBtn = document.getElementById('val-action-corriger');
      const rejeterBtn = document.getElementById('val-action-rejeter');
      const correctionSection = document.getElementById('val-correction-section');
      const errorEl = document.getElementById('val-error');

      function setAction(btn) {
        [validerBtn, corrigerBtn, rejeterBtn].forEach(b => {
          if (b) {
            b.classList.remove('bg-green-200', 'bg-yellow-200', 'bg-red-200', 'ring-2', 'ring-offset-1');
            if (b.id === 'val-action-valider') b.classList.add('bg-green-100');
            else if (b.id === 'val-action-corriger') b.classList.add('bg-yellow-100');
            else if (b.id === 'val-action-rejeter') b.classList.add('bg-red-100');
          }
        });
        if (btn) {
          btn.classList.remove('bg-green-100', 'bg-yellow-100', 'bg-red-100');
          btn.classList.add('ring-2', 'ring-offset-1');
          if (btn.id === 'val-action-valider') btn.classList.add('bg-green-200');
          else if (btn.id === 'val-action-corriger') btn.classList.add('bg-yellow-200');
          else if (btn.id === 'val-action-rejeter') btn.classList.add('bg-red-200');
        }
        if (correctionSection) {
          correctionSection.classList.toggle('hidden', !btn || btn.id !== 'val-action-corriger');
        }
      }

      if (validerBtn) validerBtn.addEventListener('click', () => setAction(validerBtn));
      if (corrigerBtn) corrigerBtn.addEventListener('click', () => setAction(corrigerBtn));
      if (rejeterBtn) rejeterBtn.addEventListener('click', () => setAction(rejeterBtn));

      document.getElementById('btn-modifier-details')?.addEventListener('click', () => {
        openEditCaptureModal(c);
      });

      const analyserBtn = document.getElementById('btn-analyser-image');
      analyserBtn?.addEventListener('click', async () => {
        buttonLoading(analyserBtn, true);
        try {
          const res = await apiCaptures.analyserImage(c.id);
          if (res) {
            c.espece = res.espece_detectee;
            c.identification_ia = res.espece_detectee;
            c.confiance = res.confiance;
            c.confiance_pct = res.confiance != null ? `${Math.round(res.confiance * 100)}%` : '0%';

            const idEl = document.getElementById('val-identification-ia');
            const confEl = document.getElementById('val-confiance');
            if (idEl) idEl.textContent = `${c.identification_ia}${c.sexe ? ' (' + c.sexe + ')' : ''}`;
            if (confEl) confEl.textContent = c.confiance_pct;

            const inCache = captures.find(item => item.id === c.id);
            if (inCache) {
              inCache.espece = c.espece;
              inCache.identification_ia = c.identification_ia;
              inCache.confiance = c.confiance;
              inCache.confiance_pct = c.confiance_pct;
              renderTable(captures);
            }

            pushNotification(`Analyse IA terminée : ${res.espece_detectee} (confiance ${Math.round((res.confiance || 0) * 100)}%).`, 'success');
          }
        } catch (err) {
          pushNotification(err?.message || 'Erreur lors de l\'analyse de l\'image.', 'error');
        } finally {
          buttonLoading(analyserBtn, false);
        }
      });
    }, 50);
  }

  // Modifier les détails d'une capture (nombre d'individus, sexe, stade,
  // méthode, température, humidité, notes). Le site, la date et l'espèce
  // d'origine ne sont pas modifiables après création (schéma CaptureUpdate
  // côté backend — seule l'espèce corrigée peut être fixée via la validation).
  function openEditCaptureModal(c) {
    let edPendingImageFile = null;
    const currentImage = resolveMediaUrl(c.specimen_image || c.image_path) || '';
    const body = `
      <div class="grid grid-cols-1 gap-4 text-sm">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce</label>
          <input id="ed-espece" type="text" value="${c.espece || c.identification_ia || ''}" placeholder="ex: An. gambiae"
            class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          <p class="mt-1 text-xs text-gray-500">Corrige une erreur de saisie de l'agent — distinct de la correction officielle du laboratoire.</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo du spécimen</label>
          <div class="flex items-center gap-3">
            <div id="ed-image-preview" class="h-16 w-16 shrink-0 rounded-lg border bg-gray-100 dark:bg-gray-700 bg-center bg-cover bg-no-repeat flex items-center justify-center"
                 style="${currentImage ? `background-image:url('${currentImage}')` : ''}">
              ${!currentImage ? '<span class="material-symbols-outlined text-gray-400">image</span>' : ''}
            </div>
            <input type="file" id="ed-image-file" accept="image/*" capture="environment"
              class="flex-1 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-white file:font-semibold"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nb. individus</label>
            <input id="ed-nb" type="number" min="1" value="${c.nombre_individus ?? 1}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sexe</label>
            <select id="ed-sexe" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              <option value="" ${!c.sexe ? 'selected' : ''}>Non déterminé</option>
              <option value="F" ${c.sexe === 'F' ? 'selected' : ''}>Femelle</option>
              <option value="M" ${c.sexe === 'M' ? 'selected' : ''}>Mâle</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stade</label>
            <select id="ed-stade" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              ${['adulte', 'larve', 'nymphe', 'oeuf'].map(v => `<option value="${v}" ${c.stade === v ? 'selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Méthode de capture</label>
            <select id="ed-methode" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              ${['CDC Light Trap', 'BG-Sentinel', 'Filet à moustiques', 'Aspirateur à bouche', 'PSC', 'Pièges lumineux'].map(v => `<option value="${v}" ${c.methode_capture === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Température (°C)</label>
            <input id="ed-temperature" type="number" step="any" value="${c.temperature ?? ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Humidité (%)</label>
            <input id="ed-humidite" type="number" min="0" max="100" step="any" value="${c.humidite ?? ''}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
          <textarea id="ed-notes" rows="3" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 resize-none">${c.notes || ''}</textarea>
        </div>
        <p class="text-xs text-gray-500">Le site et la date de capture ne peuvent pas être modifiés après la création.</p>
      </div>`;

    openModal(`Modifier — ${c.code}`, body, {
      confirmLabel: 'Enregistrer',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const temperature = document.getElementById('ed-temperature')?.value;
        const humidite = document.getElementById('ed-humidite')?.value;
        const espece = document.getElementById('ed-espece')?.value.trim();
        const data = {
          espece: espece || undefined,
          nombre_individus: parseInt(document.getElementById('ed-nb')?.value) || 1,
          sexe: document.getElementById('ed-sexe')?.value || undefined,
          stade: document.getElementById('ed-stade')?.value || undefined,
          methode_capture: document.getElementById('ed-methode')?.value || undefined,
          temperature: temperature !== '' ? Number(temperature) : undefined,
          humidite: humidite !== '' ? Number(humidite) : undefined,
          notes: document.getElementById('ed-notes')?.value.trim() || '',
        };
        try {
          showLoader();
          const res = await apiCaptures.update(c.id, data);
          if (res !== null) {
            // apiRequest() n'utilise jamais throw sur une erreur HTTP (400/413/...) —
            // il affiche déjà la vraie raison (format/taille) et renvoie null. Le
            // try/catch ici ne pouvait donc jamais s'activer : un envoi de photo
            // refusé passait inaperçu et le message "modifié avec succès" s'affichait
            // quand même juste après, masquant l'erreur réelle.
            let photoOk = true;
            if (edPendingImageFile) {
              const uploadRes = await apiCaptures.uploadImage(c.id, edPendingImageFile);
              photoOk = uploadRes !== null;
            }
            await loadCaptures();
            if (photoOk) {
              pushNotification(`Spécimen ${c.code} modifié avec succès.`, 'success');
            }
          }
          hideLoader();
        } catch (err) {
          hideLoader();
          pushNotification('Erreur lors de la modification.', 'error');
        }
      },
    });

    setTimeout(() => {
      document.getElementById('ed-image-file')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        edPendingImageFile = file || null;
        const preview = document.getElementById('ed-image-preview');
        if (file && preview) {
          preview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
          preview.innerHTML = '';
        }
      });
    }, 50);
  }

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Valider en masse')) {
      btn.addEventListener('click', async () => {
        try {
          const data = await apiCaptures.aValider();
          if (data && data.length) {
            for (const c of data) {
              await apiCaptures.valider(c.id, { statut: 'valide' });
            }
            await loadCaptures();
            pushNotification(`${data.length} spécimen(s) validé(s) en masse.`, 'success');
          } else {
            pushNotification('Aucun spécimen à valider.', 'info');
          }
        } catch (err) {
          pushNotification('Erreur lors de la validation en masse', 'error');
        }
      });
    }
  });

  async function openCreateCaptureModal() {
    showLoader();
    let sitesOptions = '<option value="">Sélectionner un site</option>';
    try {
      const sitesList = await apiSites.list({ limit: 200 });
      if (sitesList && sitesList.length) {
        sitesOptions = '<option value="">Sélectionner un site</option>' +
          sitesList.map(s => `<option value="${s.id}">${s.nom} (${s.region || ''})</option>`).join('');
      }
    } catch(e) {}
    hideLoader();

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowLocal = now.toISOString().slice(0, 16);
    ncPendingImageFile = null;
    ncPendingAudioFile = null;

    const body = `
      <div class="grid grid-cols-1 gap-4 text-sm">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Site sentinelle *</label>
          <select id="nc-site" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
            ${sitesOptions}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date et heure de capture *</label>
          <input id="nc-date" type="datetime-local" value="${nowLocal}" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce *</label>
            <input id="nc-espece" type="text" placeholder="ex: An. gambiae" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nb. individus *</label>
            <input id="nc-nb" type="number" min="1" value="1" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sexe</label>
            <select id="nc-sexe" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              <option value="">Non déterminé</option>
              <option value="F">Femelle</option>
              <option value="M">Mâle</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stade</label>
            <select id="nc-stade" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
              <option value="adulte">Adulte</option>
              <option value="larve">Larve</option>
              <option value="nymphe">Nymphe</option>
              <option value="oeuf">Œuf</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Méthode de capture</label>
          <select id="nc-methode" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
            <option value="CDC Light Trap">CDC Light Trap</option>
            <option value="BG-Sentinel">BG-Sentinel</option>
            <option value="Filet à moustiques">Filet à moustiques</option>
            <option value="Aspirateur à bouche">Aspirateur à bouche</option>
            <option value="PSC">PSC (Pulvérisation intra-domiciliaire)</option>
            <option value="Pièges lumineux">Pièges lumineux</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Température (°C)</label>
            <input id="nc-temperature" type="number" step="any" placeholder="ex: 28.5" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Humidité (%)</label>
            <input id="nc-humidite" type="number" min="0" max="100" step="any" placeholder="ex: 72" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
          <textarea id="nc-notes" rows="2" placeholder="Observations complémentaires..." class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 resize-none"></textarea>
        </div>
        <div class="rounded-xl border border-dashed border-brand-primary/30 bg-sky-50 dark:bg-slate-800 p-4">
          <p class="text-xs font-bold text-brand-primary mb-3 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">perm_media</span>Médias terrain (optionnel)
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Photo du spécimen</span>
              <input type="file" id="nc-image-file" accept="image/*" capture="environment"
                class="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-white file:font-semibold" />
              <img id="nc-image-preview" class="mt-2 hidden max-h-28 rounded-lg border object-cover" alt="Aperçu" />
            </label>
            <div>
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Enregistrement audio</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <button type="button" id="nc-audio-record" class="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">mic</span>Démarrer
                </button>
                <button type="button" id="nc-audio-stop" class="hidden rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                  <span class="material-symbols-outlined text-sm">stop</span>Arrêter
                </button>
                <label class="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-600">
                  <span class="material-symbols-outlined text-sm">upload_file</span>Fichier
                  <input type="file" id="nc-audio-file" accept="audio/*" class="hidden" />
                </label>
              </div>
              <p id="nc-audio-status" class="mt-1 text-xs text-gray-500"></p>
            </div>
          </div>
        </div>
        <p id="nc-error" class="text-red-500 text-xs hidden">Veuillez remplir tous les champs obligatoires.</p>
      </div>`;

    openModal('Nouvelle Capture', body, {
      confirmLabel: 'Enregistrer',
      confirmClass: 'bg-brand-primary text-white',
      onConfirm: async () => {
        const siteId = parseInt(document.getElementById('nc-site')?.value);
        const dateCapture = document.getElementById('nc-date')?.value;
        const espece = document.getElementById('nc-espece')?.value.trim();
        const nb = parseInt(document.getElementById('nc-nb')?.value) || 1;
        if (!siteId || !dateCapture || !espece) {
          document.getElementById('nc-error')?.classList.remove('hidden');
          return;
        }
        const temperature = document.getElementById('nc-temperature')?.value;
        const humidite = document.getElementById('nc-humidite')?.value;
        const data = {
          site_id: siteId,
          date_capture: dateCapture,
          espece,
          nombre_individus: nb,
          sexe: document.getElementById('nc-sexe')?.value || undefined,
          stade: document.getElementById('nc-stade')?.value || undefined,
          methode_capture: document.getElementById('nc-methode')?.value || 'CDC Light Trap',
          temperature: temperature !== '' ? Number(temperature) : undefined,
          humidite: humidite !== '' ? Number(humidite) : undefined,
          notes: document.getElementById('nc-notes')?.value.trim() || '',
          statut: 'a_valider',
        };
        try {
          showLoader();
          const res = await apiCaptures.create(data);
          if (res && res.id) {
            try {
              if (ncPendingImageFile) await apiCaptures.uploadImage(res.id, ncPendingImageFile);
              if (ncPendingAudioFile) await apiCaptures.uploadAudio(res.id, ncPendingAudioFile);
            } catch {
              pushNotification('Capture créée mais erreur lors de l\'upload des médias.', 'warning');
            }
            await loadCaptures();
            pushNotification('Capture enregistrée avec succès.', 'success');
          }
          hideLoader();
        } catch(err) {
          hideLoader();
          pushNotification('Erreur lors de la création de la capture.', 'error');
        }
      },
    });

    setTimeout(() => {
      document.getElementById('nc-image-file')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        ncPendingImageFile = file || null;
        const preview = document.getElementById('nc-image-preview');
        if (file && preview) {
          preview.src = URL.createObjectURL(file);
          preview.classList.remove('hidden');
        }
      });

      document.getElementById('nc-audio-file')?.addEventListener('change', (e) => {
        ncPendingAudioFile = e.target.files?.[0] || null;
        const status = document.getElementById('nc-audio-status');
        if (status && ncPendingAudioFile) status.textContent = `Fichier : ${ncPendingAudioFile.name}`;
      });

      const recordBtn = document.getElementById('nc-audio-record');
      const stopBtn = document.getElementById('nc-audio-stop');
      const status = document.getElementById('nc-audio-status');

      recordBtn?.addEventListener('click', async () => {
        if (!window.EntomoAudioRecorder?.isSupported()) {
          pushNotification('Enregistrement micro non disponible sur ce navigateur.', 'warning');
          return;
        }
        try {
          await EntomoAudioRecorder.start();
          recordBtn.classList.add('hidden');
          stopBtn?.classList.remove('hidden');
          if (status) status.textContent = 'Enregistrement en cours…';
          let sec = 0;
          ncRecordingTimer = setInterval(() => { sec += 1; if (status) status.textContent = `Enregistrement : ${sec}s`; }, 1000);
        } catch {
          pushNotification('Impossible d\'accéder au micro.', 'error');
        }
      });

      stopBtn?.addEventListener('click', async () => {
        clearInterval(ncRecordingTimer);
        const result = await EntomoAudioRecorder.stop();
        recordBtn?.classList.remove('hidden');
        stopBtn?.classList.add('hidden');
        if (result?.file) {
          ncPendingAudioFile = result.file;
          if (status) status.textContent = `Audio enregistré (${Math.round(result.durationMs / 1000)}s) — ${result.file.name}`;
        }
      });
    }, 50);
  }

  window.openCreateCaptureModal = openCreateCaptureModal;

  const dateFilter = document.getElementById('date-filter');
  const statusFilter = document.getElementById('status-filter');
  const speciesFilter = document.getElementById('species-filter');
  const locationFilter = document.getElementById('location-filter');

  function applyFilters() {
    const dateVal = dateFilter?.value || '';
    const statusVal = statusFilter?.value || 'Tous';
    const speciesVal = speciesFilter?.value || 'Toutes';
    const locationVal = locationFilter?.value || 'Toutes';

    const filtered = captures.filter(c => {
      const matchDate = !dateVal || (c.date_capture && c.date_capture.startsWith(dateVal)) || (c.date && c.date.startsWith(dateVal));
      const statutValMap = { 'À valider': ['À valider', 'a_valider'], 'Validé': ['Validé', 'valide', 'validee'], 'Corrigé': ['Corrigé', 'corrige'], 'Rejeté': ['Rejeté', 'rejete'] };
      const matchStatus = statusVal === 'Tous' || (statutValMap[statusVal] || [statusVal]).includes(c.statut);
      const matchSpecies = speciesVal === 'Toutes' || c.espece === speciesVal || c.identification_ia === speciesVal || c.identification_ia.startsWith(speciesVal);
      const matchLocation = locationVal === 'Toutes' || c.localisation === locationVal || c.site === locationVal || c.region === locationVal;
      return matchDate && matchStatus && matchSpecies && matchLocation;
    });
    renderTable(filtered);
  }

  [dateFilter, statusFilter, speciesFilter, locationFilter].forEach(el => {
    if (el) el.addEventListener('change', applyFilters);
  });

  const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  await loadCaptures();

  const btnNouvCapture = document.getElementById('btn-nouvelle-capture');
  if (btnNouvCapture) {
    btnNouvCapture.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof window.openCreateCaptureModal === 'function') {
        window.openCreateCaptureModal();
        return;
      }
      window.location.href = 'nouvelle-capture.html';
    });
  } else {
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim().includes('Nouvelle Capture') && !btn.dataset.attached) {
        btn.dataset.attached = '1';
        btn.addEventListener('click', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (typeof window.openCreateCaptureModal === 'function') {
            window.openCreateCaptureModal();
            return;
          }
          window.location.href = 'nouvelle-capture.html';
        });
      }
    });
  }

  // Bouton Valider en masse
  const btnValiderMasse = document.getElementById('btn-valider-masse');
  if (btnValiderMasse) {
    btnValiderMasse.addEventListener('click', async () => {
      try {
        const data = await apiCaptures.aValider();
        if (data && data.length) {
          buttonLoading(btnValiderMasse, true);
          for (const c of data) {
            await apiCaptures.valider(c.id, { statut: 'valide' });
          }
          await loadCaptures();
          pushNotification(`${data.length} spécimen(s) validé(s) en masse.`, 'success');
          buttonLoading(btnValiderMasse, false);
        } else {
          pushNotification('Aucun spécimen à valider.', 'info');
        }
      } catch (err) {
        pushNotification('Erreur lors de la validation en masse', 'error');
      }
    });
  }
});
