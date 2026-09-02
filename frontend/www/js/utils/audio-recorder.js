/**
 * audio-recorder.js — Enregistrement micro terrain (MediaRecorder → WAV Blob)
 */
const EntomoAudioRecorder = (() => {
  let mediaStream = null;
  let mediaRecorder = null;
  let chunks = [];
  let startTime = 0;

  async function start() {
    if (mediaRecorder?.state === 'recording') return;
    chunks = [];
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: pickMimeType() });
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    mediaRecorder.start(250);
    startTime = Date.now();
    return true;
  }

  function pickMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const durationMs = Date.now() - startTime;
        cleanup();
        const file = await blobToWavFile(blob, durationMs);
        resolve({ blob, file, durationMs });
      };
      mediaRecorder.stop();
    });
  }

  function cleanup() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
    chunks = [];
  }

  function isRecording() {
    return mediaRecorder?.state === 'recording';
  }

  async function blobToWavFile(blob, durationMs) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      ctx.close();
      const name = `capture_audio_${Date.now()}.wav`;
      return new File([wavBlob], name, { type: 'audio/wav' });
    } catch {
      const ext = (blob.type || '').includes('ogg') ? 'ogg' : 'webm';
      return new File([blob], `capture_audio_${Date.now()}.${ext}`, { type: blob.type });
    }
  }

  function audioBufferToWav(buffer) {
    const numChannels = Math.min(buffer.numberOfChannels, 1);
    const sampleRate = buffer.sampleRate;
    const samples = buffer.getChannelData(0);
    const bufferLength = samples.length;
    const arrayBuffer = new ArrayBuffer(44 + bufferLength * 2);
    const view = new DataView(arrayBuffer);
    const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + bufferLength * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, bufferLength * 2, true);
    let offset = 44;
    for (let i = 0; i < bufferLength; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function isSupported() {
    return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  }

  return { start, stop, isRecording, isSupported, cleanup };
})();

window.EntomoAudioRecorder = EntomoAudioRecorder;
