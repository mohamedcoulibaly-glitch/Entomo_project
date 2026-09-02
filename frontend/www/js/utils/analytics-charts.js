/**
 * analytics-charts.js — Factory Chart.js pour les tableaux de bord Entomo
 */
const EntomoCharts = (() => {
  const COLORS = {
    primary: '#005689',
    accent: '#00A3E0',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
    purple: '#7c3aed',
    pink: '#ec4899',
    teal: '#14b8a6',
    palette: ['#005689', '#00A3E0', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'],
  };

  const _instances = {};

  function _isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function _textColor() {
    return _isDark() ? '#e5e7eb' : '#374151';
  }

  function _gridColor() {
    return _isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  }

  function _baseOptions(type) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: _textColor(), font: { family: 'Inter, sans-serif', size: 11 } },
        },
        tooltip: {
          backgroundColor: _isDark() ? '#1f2937' : '#fff',
          titleColor: _textColor(),
          bodyColor: _textColor(),
          borderColor: _isDark() ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: type !== 'doughnut' && type !== 'polarArea' && type !== 'radar' ? {
        x: { ticks: { color: _textColor(), font: { size: 10 } }, grid: { color: _gridColor() } },
        y: { ticks: { color: _textColor(), font: { size: 10 } }, grid: { color: _gridColor() }, beginAtZero: true },
      } : undefined,
    };
  }

  function destroy(canvasId) {
    if (_instances[canvasId]) {
      _instances[canvasId].destroy();
      delete _instances[canvasId];
    }
  }

  function bar(canvasId, labels, values, opts = {}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, opts.color || COLORS.primary);
    gradient.addColorStop(1, opts.colorEnd || COLORS.accent);
    _instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: opts.label || 'Valeur',
          data: values,
          backgroundColor: opts.horizontal ? COLORS.palette : gradient,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        ..._baseOptions('bar'),
        indexAxis: opts.horizontal ? 'y' : 'x',
        ...opts.chartOptions,
      },
    });
    return _instances[canvasId];
  }

  function line(canvasId, labels, datasets, opts = {}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    const ctx = canvas.getContext('2d');
    const chartDatasets = (Array.isArray(datasets[0]) ? datasets : [datasets]).map((data, i) => {
      const color = COLORS.palette[i % COLORS.palette.length];
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '05');
      return {
        label: opts.labels?.[i] || `Série ${i + 1}`,
        data: Array.isArray(datasets[0]) ? data : datasets,
        borderColor: color,
        backgroundColor: grad,
        fill: opts.fill !== false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      };
    });
    if (!Array.isArray(datasets[0])) chartDatasets[0].data = datasets;
    _instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
      options: { ..._baseOptions('line'), ...opts.chartOptions },
    });
    return _instances[canvasId];
  }

  function doughnut(canvasId, labels, values, opts = {}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    _instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS.palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: _isDark() ? '#1f2937' : '#fff',
          hoverOffset: 8,
        }],
      },
      options: {
        ..._baseOptions('doughnut'),
        cutout: opts.cutout || '65%',
        ...opts.chartOptions,
      },
    });
    return _instances[canvasId];
  }

  function radar(canvasId, labels, values, opts = {}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    _instances[canvasId] = new Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: opts.label || 'Distribution',
          data: values,
          backgroundColor: COLORS.primary + '30',
          borderColor: COLORS.primary,
          pointBackgroundColor: COLORS.accent,
        }],
      },
      options: {
        ..._baseOptions('radar'),
        scales: {
          r: {
            ticks: { color: _textColor(), backdropColor: 'transparent' },
            grid: { color: _gridColor() },
            pointLabels: { color: _textColor(), font: { size: 10 } },
          },
        },
      },
    });
    return _instances[canvasId];
  }

  function multiLine(canvasId, labels, seriesMap, opts = {}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    const datasets = Object.entries(seriesMap).map(([label, data], i) => ({
      label,
      data,
      borderColor: COLORS.palette[i % COLORS.palette.length],
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 2,
    }));
    _instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: { ..._baseOptions('line'), ...opts.chartOptions },
    });
    return _instances[canvasId];
  }

  function animateNumber(el, from, to, decimals = 0, duration = 800) {
    if (!el) return;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = from + (to - from) * eased;
      el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('fr-FR');
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { bar, line, doughnut, radar, multiLine, destroy, animateNumber, COLORS };
})();

if (typeof window !== 'undefined') window.EntomoCharts = EntomoCharts;
