/** Visualisation waveform / spectrogramme via Web Audio API. */

const AudioWaveform = (() => {
  let audioContext = null;

  function getContext() {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio API non supportée');
      audioContext = new Ctx();
    }
    return audioContext;
  }

  async function loadBuffer(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Impossible de charger l'audio (${response.status})`);
    const arrayBuffer = await response.arrayBuffer();
    const ctx = getContext();
    return ctx.decodeAudioData(arrayBuffer);
  }

  function drawWaveform(canvas, audioBuffer, options = {}) {
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth || 320;
    const height = canvas.height = canvas.clientHeight || 64;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const mid = height / 2;
    const color = options.color || '#005689';
    const bg = options.background || 'transparent';

    ctx.clearRect(0, 0, width, height);
    if (bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      const start = x * step;
      for (let i = 0; i < step; i++) {
        const sample = data[start + i] || 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      ctx.moveTo(x, (1 + min) * mid);
      ctx.lineTo(x, (1 + max) * mid);
    }
    ctx.stroke();
  }

  function drawSpectrogram(canvas, audioBuffer, options = {}) {
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth || 320;
    const height = canvas.height = canvas.clientHeight || 80;
    const channel = audioBuffer.getChannelData(0);
    const fftSize = options.fftSize || 256;
    const hop = Math.max(1, Math.floor(channel.length / width));
    const image = ctx.createImageData(width, height);

    for (let x = 0; x < width; x++) {
      const start = x * hop;
      const slice = channel.subarray(start, start + fftSize);
      let energy = 0;
      for (let i = 0; i < slice.length; i++) energy += slice[i] * slice[i];
      energy = Math.sqrt(energy / (slice.length || 1));
      const intensity = Math.min(255, Math.floor(energy * 900));
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        const ratio = 1 - y / height;
        image.data[idx] = Math.floor(intensity * ratio);
        image.data[idx + 1] = Math.floor(intensity * 0.6);
        image.data[idx + 2] = Math.floor(80 + intensity * 0.4);
        image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  async function renderToCanvases(url, waveformCanvas, spectrogramCanvas) {
    const buffer = await loadBuffer(url);
    if (waveformCanvas) drawWaveform(waveformCanvas, buffer);
    if (spectrogramCanvas) drawSpectrogram(spectrogramCanvas, buffer);
    return buffer;
  }

  return { loadBuffer, drawWaveform, drawSpectrogram, renderToCanvases };
})();
