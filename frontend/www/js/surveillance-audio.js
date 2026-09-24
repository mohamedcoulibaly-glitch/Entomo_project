document.addEventListener('DOMContentLoaded', async () => {
  const audioEl = document.createElement('audio');
  audioEl.id = 'hidden-audio-player';
  audioEl.preload = 'metadata';
  document.body.appendChild(audioEl);

  let isPlaying = false;
  let currentSrc = null;
  let currentAudioId = null;
  let currentCard = null;
  let cachedCaptures = [];

  const STATUT_UI = {
    a_valider: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    valide: { label: 'Traité', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    corrige: { label: 'Corrigé', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
    rejete: { label: 'Erreur', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  };

  const STATUT_FILTER = {
  Tous: null,
  'En attente': 'a_valider',
  Traité: 'valide',
  Erreur: 'rejete',
  };

  await Promise.all([loadAudioStats(), loadAudioCaptures()]);

  document.querySelector('[data-audio-export-actions]')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-export]');
    if (!btn) return;
    const format = btn.dataset.export;
    await exportCaptures(format);
  });

  document.querySelectorAll('button').forEach(btn => {
    const p = btn.querySelector('p');
    if (p?.textContent.startsWith('Statut')) {
      btn.addEventListener('click', () => {
        showDD(btn, Object.keys(STATUT_FILTER), async val => {
          if (p) p.textContent = `Statut: ${val}`;
          const statut = STATUT_FILTER[val];
          await loadAudioCaptures(statut ? { statut } : {});
        });
      });
    }
    if (p?.textContent.startsWith('Période')) {
      btn.addEventListener('click', () => {
        showDD(btn, ['30 derniers jours', '7 derniers jours', 'Toute la période'], async val => {
          if (p) p.textContent = `Période: ${val}`;
          const days = val.includes('7') ? 7 : val.includes('30') ? 30 : null;
          const params = days ? { date_debut: new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) } : {};
          await loadAudioCaptures(params);
        });
      });
    }
    if (p?.textContent.startsWith('Localisation')) {
      btn.addEventListener('click', async () => {
        const sites = await apiSites.list();
        const options = ['Toutes', ...(sites || []).map(s => s.nom)];
        showDD(btn, options, async val => {
          if (p) p.textContent = `Localisation: ${val}`;
          if (val === 'Toutes') await loadAudioCaptures();
          else {
            const site = (sites || []).find(s => s.nom === val);
            await loadAudioCaptures(site ? { site_id: site.id } : {});
          }
        });
      });
    }
    if (p?.textContent.startsWith('Espèce cible')) {
      btn.addEventListener('click', () => {
        showDD(btn, ['Toutes', 'An. gambiae', 'An. funestus', 'Ae. aegypti', 'Cx. quinquefasciatus'], async val => {
          if (p) p.textContent = `Espèce cible: ${val}`;
          await loadAudioCaptures(val === 'Toutes' ? {} : { espece: val });
        });
      });
    }
  });

  const container = document.querySelector('[data-audio-container]');
  if (container) {
    container.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const card = btn.closest('[data-id]');
      if (!card) return;
      const id = card.dataset.id;
      const title = card.querySelector('h3')?.textContent || 'Enregistrement';
      const icon = btn.querySelector('.material-symbols-outlined');
      const text = btn.textContent.trim();

      if (icon?.textContent === 'play_circle' || text.includes('Écouter')) {
        e.preventDefault();
        await startAudioPlayer(title, id, card);
        return;
      }

      if (icon?.textContent === 'download') {
        e.preventDefault();
        buttonLoading(btn, true);
        try {
          const capture = await apiCaptures.get(id);
          const url = resolveAudioUrl(capture);
          if (!url) {
            pushNotification('Fichier audio non disponible.', 'warning');
            return;
          }
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title}.wav`;
          a.click();
          pushNotification(`Enregistrement "${title}" téléchargé.`, 'success');
        } catch (err) {
          pushNotification('Erreur lors du téléchargement.', 'error');
        } finally {
          buttonLoading(btn, false);
        }
        return;
      }

      if (text.includes('Analyser') || text.includes('Classifier')) {
        e.preventDefault();
        e.stopPropagation();
        buttonLoading(btn, true);
        try {
          const res = await apiCaptures.analyser(id);
          if (res) {
            openModal(`Résultat de classification — ${title}`,
              `<div class="space-y-4">
                <div class="p-3 ${res.espece_detectee ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'} rounded-lg flex items-center gap-3">
                  <span class="material-symbols-outlined text-brand-success text-3xl">check_circle</span>
                  <div>
                    <p class="font-bold text-green-700 dark:text-green-300">${res.espece_detectee || 'Non classifié'} — Confiance ${res.confiance ? (res.confiance * 100).toFixed(1) + '%' : 'N/A'}</p>
                    <p class="text-xs text-gray-500">Fréquence caractéristique: ${res.frequence ? res.frequence + ' Hz' : 'N/A'}</p>
                  </div>
                </div>
                ${res.distribution ? `<div><p class="text-xs font-medium text-gray-500 mb-2">Distribution des espèces détectées :</p>${Object.entries(res.distribution).map(([k, v]) => `<div class="flex items-center gap-2 mb-1"><span class="text-xs w-32 text-gray-600 dark:text-gray-400">${k}</span><div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div class="h-full bg-brand-primary rounded-full" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="text-xs font-bold w-12 text-right">${(v * 100).toFixed(1)}%</span></div>`).join('')}</div>` : ''}
                <p class="text-xs text-gray-400">Modèle: ${res.modele || 'N/A'} — Traité en ${res.temps_traitement || 'N/A'}s</p>
              </div>`,
              { confirmLabel: 'Exporter résultats', cancelLabel: 'Fermer',
                onConfirm: () => {
                  const capture = cachedCaptures.find(c => String(c.id) === String(id)) || { id, nom: title };
                  exportAnalysisResult(res, capture, 'json');
                  pushNotification('Résultats exportés en JSON.', 'success');
                } }
            );
            await Promise.all([loadAudioStats(), loadAudioCaptures()]);
          }
        } catch (err) {
          pushNotification(err?.message || 'Erreur lors de l\'analyse.', 'error');
        } finally {
          buttonLoading(btn, false);
        }
        return;
      }

      if (btn.classList.contains('btn-audio-valider')) {
        e.preventDefault();
        openModal('Confirmer la validation',
          `<p class="text-sm">Valider l'enregistrement <strong>${title}</strong> ?</p>`,
          {
            confirmLabel: 'Valider',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: async () => {
              const res = await apiCaptures.valider(id, { statut: 'valide' });
              if (res) {
                pushNotification(`Enregistrement "${title}" validé.`, 'success');
                await Promise.all([loadAudioStats(), loadAudioCaptures()]);
              }
            },
          }
        );
        return;
      }

      if (btn.classList.contains('btn-audio-corriger')) {
        e.preventDefault();
        const especes = await loadReferenceData('especes');
        const capture = cachedCaptures.find(x => String(x.id) === String(id));
        openModal('Corriger l\'espèce',
          `<label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Espèce corrigée</label>
           <select id="audio-espece-corrigee" class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3">
             ${especes.map(sp => `<option ${capture?.espece_detectee === sp.label ? 'selected' : ''}>${sp.label}</option>`).join('')}
           </select>`,
          {
            confirmLabel: 'Corriger',
            confirmClass: 'bg-yellow-500 text-white',
            onConfirm: async () => {
              const espece_corrigee = document.getElementById('audio-espece-corrigee')?.value;
              const res = await apiCaptures.valider(id, { statut: 'corrige', espece_corrigee });
              if (res) {
                pushNotification(`Enregistrement "${title}" corrigé.`, 'success');
                await Promise.all([loadAudioStats(), loadAudioCaptures()]);
              }
            },
          }
        );
        return;
      }

      if (btn.classList.contains('btn-audio-rejeter')) {
        e.preventDefault();
        openModal('Rejeter l\'enregistrement',
          `<label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Motif du rejet</label>
           <textarea id="audio-reject-notes" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none" placeholder="Ex: enregistrement inexploitable, bruit ambiant..."></textarea>`,
          {
            confirmLabel: 'Rejeter',
            confirmClass: 'bg-red-600 text-white',
            onConfirm: async () => {
              const notes = document.getElementById('audio-reject-notes')?.value.trim() || '';
              const res = await apiCaptures.valider(id, { statut: 'rejete', notes: notes || undefined });
              if (res) {
                pushNotification(`Enregistrement "${title}" rejeté.`, 'warning');
                await Promise.all([loadAudioStats(), loadAudioCaptures()]);
              }
            },
          }
        );
      }
    });
  }

  document.getElementById('ap-play')?.addEventListener('click', togglePlayback);
  document.getElementById('ap-close')?.addEventListener('click', () => {
    stopPlayback();
    document.getElementById('audio-player-ui')?.remove();
  });
  document.getElementById('ap-progress-bar')?.addEventListener('click', e => {
    if (!audioEl.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = ratio * audioEl.duration;
    updateTime();
  });

  async function loadAudioStats() {
    try {
      const stats = await apiCaptures.statsAudio();
      if (!stats) return;
      const precisionEl = document.querySelector('[data-stat="precision"]');
      const detectionEl = document.querySelector('[data-stat="detection"]');
      const echantillonsEl = document.querySelector('[data-stat="echantillons"]');
      if (precisionEl) precisionEl.textContent = `${(stats.precision * 100).toFixed(1)}%`;
      if (detectionEl) detectionEl.textContent = `${(stats.detection * 100).toFixed(1)}%`;
      if (echantillonsEl) echantillonsEl.textContent = String(stats.echantillons);
    } catch (err) {
      console.error('Impossible de charger les statistiques audio', err);
    }
  }

  async function loadAudioCaptures(params = {}) {
    showLoader();
    try {
      const captures = await apiCaptures.list({ methode_capture: 'audio', ...params });
      hideLoader();
      cachedCaptures = captures || [];
      const containerEl = document.querySelector('[data-audio-container]');
      if (!containerEl) return;
      containerEl.innerHTML = captures?.length ? captures.map(renderCaptureCard).join('') :
        '<div class="col-span-full text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">music_off</span>Aucun enregistrement audio trouvé</div>';
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des enregistrements.', 'error');
    }
  }

  function renderCaptureCard(c) {
    const statut = STATUT_UI[c.statut] || STATUT_UI.a_valider;
    const dureeLabel = c.duree ? `${Number(c.duree).toFixed(1)}s` : '—';
    return `
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow" data-id="${c.id}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <span class="material-symbols-outlined text-brand-primary">graphic_eq</span>
            </div>
            <div>
              <h3 class="font-bold text-sm text-[#111418] dark:text-white">${c.nom || 'Enregistrement'}</h3>
              <p class="text-xs text-gray-500">${c.site_nom || c.site_id || 'Site inconnu'} • ${c.date_capture ? new Date(c.date_capture).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
          </div>
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statut.className}">${statut.label}</span>
        </div>
        ${c.espece_detectee ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Espèce détectée: <strong>${c.espece_detectee}</strong> (confiance: ${c.confiance ? (c.confiance * 100).toFixed(1) + '%' : 'N/A'})</p>` : ''}
        <div class="flex items-center justify-between text-xs mb-2">
          <span class="text-gray-400">Durée: ${dureeLabel}</span>
          <div class="flex gap-1">
            <button class="px-2 py-1 text-xs rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"><span class="material-symbols-outlined text-sm align-text-bottom">play_circle</span> Écouter</button>
            <button class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"><span class="material-symbols-outlined text-sm align-text-bottom">download</span></button>
            <button class="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">Analyser</button>
          </div>
        </div>
        ${c.statut === 'a_valider' ? `
        <div class="flex gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button class="btn-audio-valider flex-1 px-2 py-1 text-xs rounded-lg font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">Valider</button>
          <button class="btn-audio-corriger flex-1 px-2 py-1 text-xs rounded-lg font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Corriger</button>
          <button class="btn-audio-rejeter flex-1 px-2 py-1 text-xs rounded-lg font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">Rejeter</button>
        </div>` : ''}
      </div>`;
  }

  function resolveAudioUrl(capture) {
    if (!capture) return null;
    if (capture.fichier_url) return resolveMediaUrl(capture.fichier_url) || capture.fichier_url;
    if (capture.audio_path) return resolveMediaUrl(capture.audio_path);
    return null;
  }

  async function startAudioPlayer(title, id, card) {
    let player = document.getElementById('audio-player-ui');
    if (!player) {
      player = document.createElement('div');
      player.id = 'audio-player-ui';
      player.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 px-5 py-3 min-w-[320px] max-w-lg';
      player.innerHTML = `
        <div class="flex items-center gap-4 w-full">
        <div class="flex-shrink-0">
          <span class="material-symbols-outlined text-brand-primary text-3xl" id="ap-icon">graphic_eq</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-[#111418] dark:text-white truncate" id="ap-title">—</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-xs text-gray-400" id="ap-time">0:00</span>
            <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer" id="ap-progress-bar">
              <div class="h-full bg-brand-primary rounded-full transition-none" id="ap-progress" style="width:0%"></div>
            </div>
            <span class="text-xs text-gray-400" id="ap-duration">0:00</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="ap-play" class="text-brand-primary hover:text-brand-primary/80">
            <span class="material-symbols-outlined text-3xl">play_circle</span>
          </button>
          <button id="ap-close" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        </div>
        <canvas id="ap-waveform" class="w-full h-12 rounded-lg bg-gray-50 dark:bg-gray-900/40" height="48"></canvas>
        <canvas id="ap-spectrogram" class="w-full h-16 rounded-lg bg-gray-50 dark:bg-gray-900/40" height="64"></canvas>`;
      document.body.appendChild(player);
      document.getElementById('ap-close').addEventListener('click', () => {
        stopPlayback();
        player.remove();
      });
      document.getElementById('ap-play').addEventListener('click', togglePlayback);
      document.getElementById('ap-progress-bar').addEventListener('click', e => {
        if (!audioEl.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioEl.currentTime = ratio * audioEl.duration;
        updateTime();
      });
    }

    try {
      const capture = await apiCaptures.get(id);
      const url = resolveAudioUrl(capture);
      if (!url) {
        pushNotification('Fichier audio non disponible.', 'warning');
        return;
      }
      audioEl.src = url;
      audioEl.load();
      document.getElementById('ap-title').textContent = title;
      currentSrc = title;
      currentAudioId = id;
      currentCard = card;
      isPlaying = false;
      document.getElementById('ap-play').querySelector('.material-symbols-outlined').textContent = 'play_circle';
      try {
        const waveCanvas = document.getElementById('ap-waveform');
        const specCanvas = document.getElementById('ap-spectrogram');
        await AudioWaveform.renderToCanvases(url, waveCanvas, specCanvas);
      } catch (waveErr) {
        console.warn('Waveform indisponible', waveErr);
      }
      await togglePlayback();
    } catch (err) {
      pushNotification('Impossible de charger l\'enregistrement.', 'error');
    }
  }

  async function togglePlayback() {
    const playBtn = document.getElementById('ap-play');
    const icon = playBtn?.querySelector('.material-symbols-outlined');
    if (!playBtn || !audioEl.src) return;

    if (isPlaying) {
      audioEl.pause();
      isPlaying = false;
      if (icon) icon.textContent = 'play_circle';
      return;
    }

    try {
      await audioEl.play();
      isPlaying = true;
      if (icon) icon.textContent = 'pause_circle';
      audioEl.onended = () => {
        isPlaying = false;
        if (icon) icon.textContent = 'play_circle';
        pushNotification(`Lecture de "${currentSrc}" terminée.`, 'info');
      };
      audioEl.ontimeupdate = updateTime;
      audioEl.onloadedmetadata = updateTime;
      updateTime();
    } catch (err) {
      pushNotification('Lecture audio impossible.', 'error');
    }
  }

  function stopPlayback() {
    isPlaying = false;
    audioEl.pause();
    audioEl.currentTime = 0;
    const icon = document.querySelector('#ap-play .material-symbols-outlined');
    if (icon) icon.textContent = 'play_circle';
  }

  function updateTime() {
    const elapsed = Math.floor(audioEl.currentTime || 0);
    const total = Math.floor(audioEl.duration || 0);
    const format = sec => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const timeEl = document.getElementById('ap-time');
    const durationEl = document.getElementById('ap-duration');
    const progress = document.getElementById('ap-progress');
    if (timeEl) timeEl.textContent = format(elapsed);
    if (durationEl) durationEl.textContent = format(total);
    if (progress && total > 0) progress.style.width = `${(audioEl.currentTime / audioEl.duration) * 100}%`;
  }

  function showDD(anchor, options, onSelect) {
    document.querySelectorAll('.audio-dd').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'audio-dd absolute z-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[150px] py-1';
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

  function exportAnalysisResult(result, capture, format = 'json') {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const payload = {
      capture_id: capture.id,
      titre: capture.nom || capture.espece,
      site: capture.site_nom,
      date_capture: capture.date_capture,
      analyse: result,
      exporte_le: new Date().toISOString(),
    };
    if (format === 'csv') {
      downloadCsv([{
        capture_id: payload.capture_id,
        titre: payload.titre,
        espece_detectee: result.espece_detectee,
        confiance: result.confiance,
        frequence: result.frequence,
        modele: result.modele,
        temps_traitement: result.temps_traitement,
      }], `analyse_audio_${capture.id}_${stamp}.csv`);
    } else {
      downloadJson(payload, `analyse_audio_${capture.id}_${stamp}.json`);
    }
  }

  async function exportCaptures(format) {
    if (!cachedCaptures.length) {
      pushNotification('Aucun enregistrement à exporter.', 'warning');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const rows = cachedCaptures.map(c => ({
      id: c.id,
      nom: c.nom || '',
      site: c.site_nom || c.site_id,
      date_capture: c.date_capture,
      espece: c.espece,
      espece_detectee: c.espece_detectee || '',
      confiance: c.confiance ?? c.confidence_ia ?? '',
      duree_sec: c.duree ?? '',
      statut: c.statut,
      frequence: c.audio_metadata?.frequence ?? '',
      modele: c.audio_metadata?.modele ?? '',
    }));
    if (format === 'json') {
      downloadJson({ exporte_le: new Date().toISOString(), captures: rows }, `captures_audio_${stamp}.json`);
    } else {
      downloadCsv(rows, `captures_audio_${stamp}.csv`);
    }
    pushNotification(`${rows.length} enregistrement(s) exporté(s) en ${format.toUpperCase()}.`, 'success');
  }
});
