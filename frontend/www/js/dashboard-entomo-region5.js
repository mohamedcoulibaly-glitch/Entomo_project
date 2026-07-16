/**
 * dashboard-entomo-region5.js
 * Tableau de bord Région Médicale 5 — données dynamiques + API backend
 */
document.addEventListener('DOMContentLoaded', async () => {

  const REGION = 'Région 5';

  // ── Chargement des stats ───────────────────────────────────────────────────
  async function loadRegionStats() {
    try {
      const stats = typeof apiDashboard !== 'undefined' ? await apiDashboard.stats() : null;
      if (!stats) { showOfflineMessage(); return; }
      hideOfflineMessage();

      const map = {
        'densite-moyenne':  stats.region5?.densite_moyenne ?? stats.densite_moyenne ?? 0,
        'alertes-actives':  stats.region5?.alertes_actives ?? stats.alertes_actives ?? 0,
        'espece-dominante': stats.region5?.espece_dominante ?? stats.espece_dominante ?? 'N/A',
        'couverture-irs':   stats.region5?.couverture_irs ?? stats.couverture_irs ?? 0,
      };

      Object.entries(map).forEach(([key, val]) => {
        const el = document.querySelector(`[data-stat="${key}"]`);
        if (!el) return;
        if (typeof val === 'number') {
          const old = parseFloat(el.textContent) || 0;
          animateNumber(el, old, val, key === 'couverture-irs' ? 0 : 1);
        } else {
          el.textContent = val;
        }
      });

      if (stats.alertes?.length) {
        renderAlertes(stats.alertes.filter(a =>
          !a.localisation || a.localisation.toLowerCase().includes('region 5') ||
          a.localisation.toLowerCase().includes('kedougou') ||
          a.localisation.toLowerCase().includes('tambacounda') ||
          a.localisation.toLowerCase().includes('kolda') ||
          a.localisation.toLowerCase().includes('sedhiou') ||
          a.localisation.toLowerCase().includes('ziguinchor')
        ));
      }
    } catch (err) {
      console.warn('[region5] loadRegionStats error:', err);
      showOfflineMessage();
    }
  }

  // ── Chargement des graphiques ──────────────────────────────────────────────
  async function loadCharts() {
    try {
      const [parEspece, parSite] = await Promise.all([
        typeof apiDashboard !== 'undefined' ? apiDashboard.capturesParEspece() : null,
        typeof apiDashboard !== 'undefined' ? apiDashboard.capturesParSite() : null,
      ]);

      if (parEspece && parEspece.length) renderEspeceChart(parEspece);
      if (parSite && parSite.length) renderSiteChart(parSite);
    } catch (err) {
      console.warn('[region5] loadCharts error:', err);
    }
  }

  // ── Graphique barres espèces ──────────────────────────────────────────────
  function renderEspeceChart(data) {
    const canvas = document.getElementById('chart-espece');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = data.map(d => d.espece || d.nom || 'Inconnu');
    const values = data.map(d => d.count || d.total || 0);
    const max = Math.max(...values, 1);
    const barW = Math.max(8, Math.min(40, (canvas.width - 60) / labels.length - 4));
    const h = canvas.height - 50;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    values.forEach((v, i) => {
      const x = 30 + i * (barW + 4);
      const barH = (v / max) * h;
      const y = canvas.height - 25 - barH;

      const grad = ctx.createLinearGradient(0, y, 0, canvas.height - 25);
      grad.addColorStop(0, '#0891b2');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '10px sans-serif';
      const lbl = labels[i].length > 12 ? labels[i].slice(0, 12) + '…' : labels[i];
      ctx.fillText(lbl, x + barW / 2, canvas.height - 8);

      ctx.fillStyle = '#111418';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(v, x + barW / 2, y - 4);
    });
  }

  // ── Graphique barres sites ─────────────────────────────────────────────────
  function renderSiteChart(data) {
    const canvas = document.getElementById('chart-site');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = data.map(d => d.site || d.nom || 'Inconnu');
    const values = data.map(d => d.count || d.total || 0);
    const max = Math.max(...values, 1);
    const barW = Math.max(8, Math.min(40, (canvas.width - 60) / labels.length - 4));
    const h = canvas.height - 50;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    values.forEach((v, i) => {
      const x = 30 + i * (barW + 4);
      const barH = (v / max) * h;
      const y = canvas.height - 25 - barH;

      const grad = ctx.createLinearGradient(0, y, 0, canvas.height - 25);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(1, '#a78bfa');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '10px sans-serif';
      const lbl = labels[i].length > 12 ? labels[i].slice(0, 12) + '…' : labels[i];
      ctx.fillText(lbl, x + barW / 2, canvas.height - 8);

      ctx.fillStyle = '#111418';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(v, x + barW / 2, y - 4);
    });
  }

  // ── Graphique d'évolution (ligne) ──────────────────────────────────────────
  function renderEvolutionChart(data) {
    const canvas = document.getElementById('chart-evolution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = data.map(d => d.mois || d.periode || d.label || '');
    const values = data.map(d => d.densite || d.valeur || d.count || 0);
    if (!values.length) return;

    const max = Math.max(...values, 1);
    const padL = 40, padR = 10, padT = 10, padB = 30;
    const w = canvas.width - padL - padR;
    const h = canvas.height - padT - padB;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px sans-serif';

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(canvas.width - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'right';
      ctx.fillText((max - (max / 4) * i).toFixed(0), padL - 4, y + 3);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#005689';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    values.forEach((v, i) => {
      const x = padL + (i / (values.length - 1)) * w;
      const y = padT + h - (v / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    ctx.lineTo(padL + w, padT + h);
    ctx.lineTo(padL, padT + h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + h);
    grad.addColorStop(0, 'rgba(0,86,137,0.25)');
    grad.addColorStop(1, 'rgba(0,86,137,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Dots + labels
    values.forEach((v, i) => {
      const x = padL + (i / (values.length - 1)) * w;
      const y = padT + h - (v / max) * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#005689';
      ctx.fill();

      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      if (labels[i]) ctx.fillText(labels[i], x, canvas.height - 6);
    });
  }

  // ── Mini carte ─────────────────────────────────────────────────────────────
  function renderMiniMap(sites) {
    const container = document.getElementById('region5-map');
    if (!container) return;
    container.innerHTML = '';

    const coords = {
      'kedougou':     { top: '45%', left: '65%', risk: 'eleve' },
      'tambacounda':  { top: '25%', left: '22%', risk: 'modere' },
      'kolda':        { top: '60%', left: '40%', risk: 'modere' },
      'sedhiou':      { top: '70%', left: '20%', risk: 'faible' },
      'ziguinchor':   { top: '75%', left: '10%', risk: 'modere' },
    };

    Object.entries(coords).forEach(([city, pos]) => {
      const riskClass = pos.risk === 'eleve' ? 'text-brand-alert-critical' : pos.risk === 'modere' ? 'text-brand-alert-warning' : 'text-brand-success';

      const site = sites?.find(s => s.nom?.toLowerCase().includes(city) || s.ville?.toLowerCase().includes(city));
      const tooltip = site
        ? `<p class="font-bold">${site.nom}</p><p>Risque: ${site.niveau_risque || 'N/A'}</p><p>Densité: ${site.densite_moyenne ?? 'N/A'}</p>`
        : `<p class="font-bold">${city.charAt(0).toUpperCase() + city.slice(1)}</p><p>Risque ${pos.risk}</p>`;

      const btn = document.createElement('button');
      btn.className = 'absolute group';
      btn.style.cssText = `top:${pos.top};left:${pos.left};`;
      btn.innerHTML = `
        <span class="material-symbols-outlined ${riskClass} text-3xl drop-shadow-lg" style="font-variation-settings:'FILL' 1;">location_on</span>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">${tooltip}</div>`;
      container.appendChild(btn);
    });
  }

  // ── Alertes ────────────────────────────────────────────────────────────────
  function renderAlertes(alertes) {
    const container = document.querySelector('[data-alertes-container]');
    if (!container) return;
    if (!alertes.length) {
      container.innerHTML = '<div class="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">Aucune alerte pour la Région 5.</div>';
      return;
    }
    container.innerHTML = alertes.map(a => `
      <div class="flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30
        ${a.critique ? 'bg-red-50 dark:bg-red-900/20 border-brand-alert-critical' : 'bg-orange-50 dark:bg-orange-900/20 border-brand-alert-warning'}">
        <span class="material-symbols-outlined ${a.critique ? 'text-brand-alert-critical' : 'text-brand-alert-warning'} mt-1">
          ${a.critique ? 'error' : 'warning'}</span>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-[#111418] dark:text-white">${a.titre || 'Alerte'}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">${a.localisation || ''} — ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</p>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${a.description || ''}</p>
        </div>
        <button class="voir-details-alerte text-brand-primary text-xs font-medium hover:underline flex-shrink-0">Voir détails</button>
      </div>`).join('');

    container.querySelectorAll('.voir-details-alerte').forEach((btn, idx) => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const a = alertes[idx];
        if (!a) return;
        openModal(a.titre || 'Alerte', `
          <div class="space-y-3 text-sm">
            <p><strong>Localisation :</strong> ${a.localisation || 'N/A'}</p>
            <p><strong>Date :</strong> ${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : 'N/A'}</p>
            <p><strong>Densité :</strong> ${a.densite_observee || 'N/A'}</p>
            <p><strong>Seuil :</strong> ${a.seuil_alerte || 'N/A'}</p>
            <p><strong>Statut :</strong> <span class="${a.traite ? 'text-green-500' : 'text-red-500'} font-medium">${a.traite ? 'Traité' : 'Non traité'}</span></p>
            <hr class="dark:border-gray-700"/>
            <p class="text-gray-500 dark:text-gray-400">${a.description || ''}</p>
          </div>`, {
          confirmLabel: 'Planifier une intervention',
          confirmClass: 'bg-brand-primary text-white',
          onConfirm: () => pushNotification('Intervention planifiée.', 'success'),
        });
      });
    });
  }

  // ── Offline helpers ────────────────────────────────────────────────────────
  function showOfflineMessage() {
    const c = document.querySelector('[data-stats-container]');
    if (!c) return;
    let msg = c.querySelector('.offline-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'offline-msg col-span-full text-center py-8 text-gray-500 dark:text-gray-400';
      c.prepend(msg);
    }
    msg.innerHTML = '<span class="material-symbols-outlined text-3xl mb-2">cloud_off</span><p>Backend hors ligne.</p>';
  }
  function hideOfflineMessage() { document.querySelector('.offline-msg')?.remove(); }

  // ── Animation nombres ──────────────────────────────────────────────────────
  function animateNumber(el, from, to, decimals = 1, duration = 600) {
    const start = performance.now();
    const update = now => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = (from + (to - from) * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // ── Initialisation ─────────────────────────────────────────────────────────
  await Promise.all([loadRegionStats(), loadCharts()]);

  // Charger les sites pour la carte
  try {
    if (typeof apiSites !== 'undefined') {
      const sites = await apiSites.list({ limit: 100 });
      renderMiniMap(sites);
    } else {
      renderMiniMap(null);
    }
  } catch { renderMiniMap(null); }

  // Auto-refresh 60s
  setInterval(async () => {
    await Promise.all([loadRegionStats(), loadCharts()]);
  }, 60000);
});
