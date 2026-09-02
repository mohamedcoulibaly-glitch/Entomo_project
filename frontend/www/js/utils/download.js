/** Téléchargements côté client (CSV / JSON / Blob). */

function downloadBlob(content, filename, mimeType = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, filename, 'application/json;charset=utf-8');
}

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(rows, filename) {
  if (!rows?.length) {
    downloadBlob('', filename, 'text/csv;charset=utf-8');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escapeCsvCell(row[h])).join(',')),
  ];
  downloadBlob(lines.join('\n'), filename, 'text/csv;charset=utf-8');
}
