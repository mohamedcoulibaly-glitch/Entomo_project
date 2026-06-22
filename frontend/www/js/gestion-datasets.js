/**
 * gestion-datasets.js
 * Gestion des datasets et annotations — comportements interactifs
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Upload de fichiers (drag & drop + clic) ──────────────────────────────────
  const dropZones = document.querySelectorAll('[class*="border-dashed"], [class*="border-2"][class*="rounded"]');

  dropZones.forEach(zone => {
    zone.style.cursor = 'pointer';
    zone.setAttribute('tabindex', '0');

    ['dragenter', 'dragover'].forEach(ev => {
      zone.addEventListener(ev, e => {
        e.preventDefault();
        zone.classList.add('border-brand-primary', 'bg-brand-primary/5');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      zone.addEventListener(ev, e => {
        e.preventDefault();
        zone.classList.remove('border-brand-primary', 'bg-brand-primary/5');
        if (ev === 'drop') handleFiles(e.dataTransfer.files, zone);
      });
    });

    zone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.csv,.json,.zip,.xlsx,.txt,.png,.jpg';
      input.addEventListener('change', () => handleFiles(input.files, zone));
      input.click();
    });
  });

  function handleFiles(files, zone) {
    if (!files.length) return;
    const fileList = Array.from(files);

    fileList.forEach(file => {
      const sizeMb = (file.size / 1048576).toFixed(2);
      const item = document.createElement('div');
      item.className = 'flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 mt-2';
      item.innerHTML = `
        <span class="material-symbols-outlined text-brand-primary">insert_drive_file</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[#111418] dark:text-white truncate">${file.name}</p>
          <div class="flex items-center gap-2 mt-1">
            <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div class="h-full bg-brand-primary rounded-full transition-all duration-1500 upload-bar" style="width:0%"></div>
            </div>
            <span class="text-xs text-gray-500 upload-pct">0%</span>
          </div>
          <p class="text-xs text-gray-400">${sizeMb} MB</p>
        </div>
        <button class="text-red-400 hover:text-red-600 cancel-upload">
          <span class="material-symbols-outlined" style="font-size:18px">close</span>
        </button>`;
      zone.appendChild(item);

      item.querySelector('.cancel-upload').addEventListener('click', () => item.remove());

      // Simulation upload
      let pct = 0;
      const bar = item.querySelector('.upload-bar');
      const pctEl = item.querySelector('.upload-pct');
      const iv = setInterval(() => {
        pct = Math.min(pct + Math.random() * 15, 100);
        bar.style.width = `${pct.toFixed(0)}%`;
        pctEl.textContent = `${pct.toFixed(0)}%`;
        if (pct >= 100) {
          clearInterval(iv);
          pctEl.textContent = '✓';
          bar.classList.add('bg-brand-success');
          bar.classList.remove('bg-brand-primary');
          pushNotification(`"${file.name}" uploadé avec succès.`, 'success');
        }
      }, 150);
    });
  }

  // ── Annotation de dataset ─────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();

    if (text.includes('Annoter') || text.includes('Étiqueter')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const dataset = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold')?.textContent || 'Dataset';
        openModal(`Annoter — ${dataset}`,
          `<div class="space-y-4 text-sm">
            <p class="text-gray-500">Sélectionnez les étiquettes à appliquer à ce dataset :</p>
            <div class="grid grid-cols-2 gap-2">
              ${['An. gambiae','An. funestus','An. arabiensis','Culex sp.','Non identifié','Artefact'].map(l => `
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border border-gray-200 dark:border-gray-700">
                  <input type="checkbox" class="rounded text-brand-primary"/>
                  <span>${l}</span>
                </label>`).join('')}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes additionnelles</label>
              <textarea class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 h-20 resize-none"
                        placeholder="Contexte de capture, conditions météo..."></textarea>
            </div>
          </div>`,
          {
            confirmLabel: 'Sauvegarder l\'annotation',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification(`Dataset "${dataset}" annoté avec succès.`, 'success'),
          }
        );
      });
    }

    if (text.includes('Prétraiter') || text.includes('Traiter')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openModal('Options de prétraitement',
          `<div class="space-y-3 text-sm">
            ${[
              ['Normalisation des valeurs', true],
              ['Suppression des doublons', true],
              ['Gestion des valeurs manquantes', false],
              ['Augmentation des données', false],
              ['Extraction de features audio', false],
            ].map(([label, checked]) => `
              <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" ${checked?'checked':''} class="rounded text-brand-primary"/>
                <span>${label}</span>
              </label>`).join('')}
          </div>`,
          {
            confirmLabel: 'Lancer le prétraitement',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => {
              showLoader();
              setTimeout(() => { hideLoader(); pushNotification('Prétraitement du dataset terminé.', 'success'); }, 2500);
            },
          }
        );
      });
    }

    if (text.includes('Supprimer') || text.includes('delete')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const name = btn.closest('[class*="rounded-xl"]')?.querySelector('h3, p.font-bold, .text-sm.font-medium')?.textContent || 'Dataset';
        confirmDelete(name, () => {
          btn.closest('[class*="rounded-xl"]')?.remove();
          pushNotification(`Dataset "${name}" supprimé.`, 'info');
        });
      });
    }
  });

  // ── Barre de progression des datasets ────────────────────────────────────────
  document.querySelectorAll('[class*="h-2"][class*="rounded-full"]').forEach(container => {
    const bar = container.querySelector('[class*="bg-brand-primary"], [class*="bg-green"]');
    if (bar && !bar.dataset.animated) {
      bar.dataset.animated = '1';
      const target = bar.style.width || '0%';
      bar.style.width = '0%';
      bar.style.transition = 'width 1s ease';
      setTimeout(() => { bar.style.width = target; }, 200 + Math.random() * 300);
    }
  });

  // ── Recherche de datasets ─────────────────────────────────────────────────────
  const searchInput = document.querySelector('input[placeholder]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll('[class*="rounded-xl"][class*="border"]').forEach(card => {
        if (card.querySelector('aside, nav, header')) return;
        card.style.display = card.textContent.toLowerCase().includes(q) || !q ? '' : 'none';
      });
    });
  }

});
