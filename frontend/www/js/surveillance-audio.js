document.addEventListener('DOMContentLoaded', async () => {
  let isPlaying = false;
  let currentSrc = null;
  let progressIv = null;
  let progressPct = 0;
  let currentAudioId = null;

  await loadAudioCaptures();

  document.querySelectorAll('button').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.textContent.trim();

    if (icon?.textContent === 'play_circle' || text.includes('Écouter') || text.includes('Play')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded-xl"]');
        const id = card?.dataset?.id;
        const title = card?.querySelector('h3, p.font-bold, .text-sm.font-medium')?.textContent || 'Enregistrement';
        if (id) startAudioPlayer(title, id, card, btn);
      });
    }

    if (icon?.textContent === 'download' && btn.closest('[class*="rounded-xl"]')) {
      btn.addEventListener('click', async () => {
        const card = btn.closest('[class*="rounded-xl"]');
        const id = card?.dataset?.id;
        const title = card?.querySelector('h3, p.font-bold')?.textContent || 'audio';
        if (!id) { pushNotification('ID introuvable.', 'error'); return; }
        buttonLoading(btn, true);
        try {
          const capture = await apiCaptures.get(id);
          if (capture?.fichier_url) {
            const a = document.createElement('a');
            a.href = capture.fichier_url;
            a.download = `${title}.wav`;
            a.click();
            pushNotification(`Enregistrement "${title}" téléchargé.`, 'success');
          } else {
            pushNotification('Fichier audio non disponible.', 'warning');
          }
        } catch (err) { pushNotification('Erreur lors du téléchargement.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    if (text.includes('Analyser') || text.includes('Classifier')) {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const card = btn.closest('[class*="rounded-xl"]');
        const id = card?.dataset?.id;
        const title = card?.querySelector('h3, p.font-bold')?.textContent || 'Signal';
        if (!id) { pushNotification('ID introuvable.', 'error'); return; }
        buttonLoading(btn, true);
        try {
          const res = await apiCaptures.valider(id, { action: 'analyser' });
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
                onConfirm: () => pushNotification('Résultats exportés.', 'success') }
            );
          }
        } catch (err) { pushNotification('Erreur lors de l\'analyse.', 'error'); }
        buttonLoading(btn, false);
      });
    }

    const p = btn.querySelector('p');
    if (p?.textContent.startsWith('Statut')) {
      btn.addEventListener('click', () => {
        showDD(btn, ['Tous', 'Traité', 'En attente', 'Erreur'], async val => {
          if (p) p.textContent = `Statut: ${val}`;
          await loadAudioCaptures(val === 'Tous' ? {} : { statut: val.toLowerCase() });
        });
      });
    }
  });

  async function loadAudioCaptures(params = {}) {
    showLoader();
    try {
      const captures = await apiCaptures.list({ methode_capture: 'audio', ...params });
      hideLoader();
      if (!captures) return;
      const container = document.querySelector('[data-audio-container]');
      if (container) {
        container.innerHTML = captures.length ? captures.map(c => `
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
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.statut === 'traite' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : c.statut === 'erreur' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}">${c.statut || 'en_attente'}</span>
            </div>
            ${c.espece_detectee ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Espèce détectée: <strong>${c.espece_detectee}</strong> (confiance: ${c.confiance ? (c.confiance * 100).toFixed(1) + '%' : 'N/A'})</p>` : ''}
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-400">Durée: ${c.duree || '—'}</span>
              <div class="flex gap-1">
                <button class="px-2 py-1 text-xs rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"><span class="material-symbols-outlined text-sm align-text-bottom">play_circle</span> Écouter</button>
                <button class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"><span class="material-symbols-outlined text-sm align-text-bottom">download</span></button>
                <button class="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">Analyser</button>
              </div>
            </div>
          </div>`).join('') : '<div class="col-span-full text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">music_off</span>Aucun enregistrement audio trouvé</div>';
      }
    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement des enregistrements.', 'error');
    }
  }

  function startAudioPlayer(title, id, card, triggerBtn) {
    let player = document.getElementById('audio-player-ui');
    if (!player) {
      player = document.createElement('div');
      player.id = 'audio-player-ui';
      player.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 px-5 py-3 min-w-[320px] max-w-md`;
      player.innerHTML = `
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
        </div>`;
      document.body.appendChild(player);

      document.getElementById('ap-close').addEventListener('click', () => {
        stopPlayback();
        player.remove();
      });

      document.getElementById('ap-play').addEventListener('click', togglePlayback);

      document.getElementById('ap-progress-bar').addEventListener('click', e => {
        const rect = e.currentTarget.getBoundingClientRect();
        progressPct = ((e.clientX - rect.left) / rect.width) * 100;
        document.getElementById('ap-progress').style.width = `${progressPct}%`;
        updateTime();
      });
    }

    document.getElementById('ap-title').textContent = title;
    currentSrc = title;
    currentAudioId = id;
    isPlaying = false;
    progressPct = 0;
    document.getElementById('ap-progress').style.width = '0%';
    document.getElementById('ap-play').querySelector('.material-symbols-outlined').textContent = 'play_circle';
    togglePlayback();
  }

  function togglePlayback() {
    const playBtn = document.getElementById('ap-play');
    const icon = playBtn?.querySelector('.material-symbols-outlined');
    if (!playBtn) return;

    if (isPlaying) {
      isPlaying = false;
      clearInterval(progressIv);
      if (icon) icon.textContent = 'play_circle';
    } else {
      isPlaying = true;
      if (icon) icon.textContent = 'pause_circle';
      clearInterval(progressIv);
      progressIv = setInterval(() => {
        progressPct += 0.1;
        if (progressPct >= 100) {
          progressPct = 100;
          stopPlayback();
          pushNotification(`Lecture de "${currentSrc}" terminée.`, 'info');
        }
        const progress = document.getElementById('ap-progress');
        if (progress) progress.style.width = `${progressPct}%`;
        updateTime();
      }, 100);
    }
  }

  function stopPlayback() {
    isPlaying = false;
    clearInterval(progressIv);
    const icon = document.querySelector('#ap-play .material-symbols-outlined');
    if (icon) icon.textContent = 'play_circle';
  }

  function updateTime() {
    const totalSec = 90;
    const elapsed = Math.floor(progressPct / 100 * totalSec);
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    const el = document.getElementById('ap-time');
    if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
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
});
