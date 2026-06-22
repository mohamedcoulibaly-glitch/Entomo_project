/**
 * param-langues.js
 * Paramètres de langues / régionalisation
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Sélection de langue par carte ─────────────────────────────────────────────
  const langCards = document.querySelectorAll('[class*="rounded"][class*="p-"]:has(input[type="radio"]), .lang-card');
  const radios    = document.querySelectorAll('input[type="radio"]');

  function updateLangCards() {
    radios.forEach(radio => {
      const card = radio.closest('[class*="rounded"][class*="p-"]') || radio.closest('.lang-card');
      if (!card) return;
      if (radio.checked) {
        card.classList.add('ring-2', 'ring-brand-primary', 'bg-brand-primary/5', 'dark:bg-brand-primary/10');
      } else {
        card.classList.remove('ring-2', 'ring-brand-primary', 'bg-brand-primary/5', 'dark:bg-brand-primary/10');
      }
    });
  }

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateLangCards();
      const label = radio.closest('label') || radio.parentElement;
      const lang  = label?.querySelector('span, p, strong')?.textContent?.trim() || radio.value;
      pushNotification(`Langue sélectionnée : ${lang}`, 'info');
    });
    // Rendre les cartes cliquables même sans cliquer sur le radio
    const card = radio.closest('[class*="rounded"][class*="p-"]') || radio.closest('.lang-card');
    if (card && !radio.dataset.bound) {
      radio.dataset.bound = '1';
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => { radio.checked = true; radio.dispatchEvent(new Event('change')); });
    }
  });

  updateLangCards();

  // ── Boutons ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();

    if (t.includes('Appliquer') || t.includes('Sauvegarder') || t.includes('Confirmer')) {
      btn.addEventListener('click', async () => {
        const selected = document.querySelector('input[type="radio"]:checked');
        const lang = selected?.value || 'fr';
        showLoader();
        await new Promise(r => setTimeout(r, 700));
        hideLoader();
        localStorage.setItem('app_language', lang);
        pushNotification(`Langue "${lang}" appliquée. Actualisation dans 2s...`, 'success');
        setTimeout(() => location.reload(), 2000);
      });
    }

    if (t.includes('Ajouter langue') || t.includes('Nouvelle langue')) {
      btn.addEventListener('click', () => {
        openModal('Ajouter une langue',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code langue (ISO 639-1) *</label>
              <input type="text" placeholder="ex: wo (Wolof), ff (Peul)" maxlength="5"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom de la langue *</label>
              <input type="text" placeholder="ex: Wolof"
                class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fichier de traduction (.json)</label>
              <input type="file" accept=".json"
                class="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1 file:px-3
                       file:rounded file:border-0 file:text-sm file:bg-brand-primary/10 file:text-brand-primary"/>
            </div>
          </div>`,
          {
            confirmLabel: 'Ajouter',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Langue ajoutée. Elle sera disponible après redémarrage.', 'success'),
          }
        );
      });
    }

    if (t.includes('Format date') || t.includes('Format heure') || t.includes('Fuseau')) {
      btn.addEventListener('click', () => {
        openModal('Format régional',
          `<div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Format de date</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option selected>DD/MM/YYYY (France)</option>
                <option>MM/DD/YYYY (US)</option>
                <option>YYYY-MM-DD (ISO)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fuseau horaire</label>
              <select class="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option selected>Africa/Dakar (UTC+0)</option>
                <option>Africa/Abidjan (UTC+0)</option>
                <option>Africa/Lagos (UTC+1)</option>
                <option>Africa/Nairobi (UTC+3)</option>
              </select>
            </div>
          </div>`,
          {
            confirmLabel: 'Appliquer',
            confirmClass: 'bg-brand-primary text-white',
            onConfirm: () => pushNotification('Format régional mis à jour.', 'success'),
          }
        );
      });
    }
  });

});
