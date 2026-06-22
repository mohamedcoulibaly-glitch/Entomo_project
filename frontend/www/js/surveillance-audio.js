/**
 * surveillance-audio.js
 * Surveillance des modèles audio — comportements interactifs
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Lecteur audio simulé ──────────────────────────────────────────────────────
  let isPlaying  = false;
  let currentSrc = null;
  let progressIv = null;
  let progressPct = 0;

  document.querySelectorAll('button').forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.textContent.trim();

    if (icon?.textContent === 'play_circle' || text.includes('Écouter') || text.includes('Play')) {
      btn.addEventListener('click', () => {
        const card = btn.closest('[class*="rounded-xl"]');
        const title = card?.querySelector('h3, p.font-bold, .text-sm.font-medium')?.textContent || 'Enregistrement';
        startAudioPlayer(title, card, btn);
      });
    }

    if (icon?.textContent === 'download' && btn.closest('[class*="rounded-xl"]')) {
      btn.addEventListener('click', () => {
        const title = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'audio';
        showLoader();
        setTimeout(() => {
          hideLoader();
          pushNotification(`Enregistrement "${title}" téléchargé.`, 'success');
        }, 1200);
      });
    }

    // Bouton d'analyse
    if (text.includes('Analyser') || text.includes('Classifier')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const title = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Signal';
        showLoader();
        setTimeout(() => {
          hideLoader();
          openModal(`Résultat de classification — ${title}`,
            `<div class="space-y-4">
              <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
                <span class="material-symbols-outlined text-brand-success text-3xl">check_circle</span>
                <div>
                  <p class="font-bold text-green-700 dark:text-green-300">An. gambiae — Confiance 94.2%</p>
                  <p class="text-xs text-gray-500">Fréquence caractéristique: 458 Hz ± 12 Hz</p>
                </div>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 mb-2">Distribution des espèces détectées :</p>
                ${[['An. gambiae','94.2%',94],['An. funestus','4.1%',4],['Autre / bruit','1.7%',2]].map(([k,v,pct]) => `
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs w-32 text-gray-600 dark:text-gray-400">${k}</span>
                    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-brand-primary rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="text-xs font-bold w-12 text-right">${v}</span>
                  </div>`).join('')}
              </div>
              <p class="text-xs text-gray-400">Modèle: MosqNet-v2 — Traité en 0.34s</p>
            </div>`,
            { confirmLabel: 'Exporter résultats', cancelLabel: 'Fermer',
              onConfirm: () => pushNotification('Résultats exportés.', 'success') }
          );
        }, 2000);
      });
    }
  });

  function startAudioPlayer(title, card, triggerBtn) {
    // Créer ou réutiliser le lecteur flottant
    let player = document.getElementById('audio-player-ui');
    if (!player) {
      player = document.createElement('div');
      player.id = 'audio-player-ui';
      player.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
        flex items-center gap-4 px-5 py-3 min-w-[320px] max-w-md`;
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
            <span class="text-xs text-gray-400" id="ap-duration">1:30</span>
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
      const duration = 90; // secondes simulées
      progressIv = setInterval(() => {
        progressPct += (100 / (duration * 10));
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
    if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  }

  // ── Filtres statut de traitement ─────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const p = btn.querySelector('p');
    if (p?.textContent.startsWith('Statut')) {
      btn.addEventListener('click', () => {
        showDD(btn, ['Tous','Traité','En attente','Erreur'], val => {
          if (p) p.textContent = `Statut: ${val}`;
          pushNotification(`Filtre : ${val}`, 'info');
        });
      });
    }
  });

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
