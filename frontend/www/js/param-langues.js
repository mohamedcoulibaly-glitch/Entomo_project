document.addEventListener('DOMContentLoaded', async () => {
  let languages = [];
  const tableBody = document.getElementById('languages-table-body');

  function render(items = languages) {
    if (!tableBody) return;
    if (!items.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">Aucune langue trouvée.</td></tr>';
      return;
    }
    tableBody.innerHTML = items.map(lang => {
      const progress = lang.fichier_traduction ? 100 : lang.active ? 60 : 20;
      const color = progress === 100 ? 'bg-brand-primary' : progress >= 50 ? 'bg-yellow-400' : 'bg-red-500';
      return `<tr class="border-b dark:border-gray-700" data-id="${lang.id}">
        <th class="px-6 py-4 font-medium text-gray-900 dark:text-white">${lang.nom}</th>
        <td class="px-6 py-4">${lang.code}</td>
        <td class="px-6 py-4"><span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${lang.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}">${lang.active ? 'Actif' : 'Inactif'}</span></td>
        <td class="px-6 py-4"><div class="flex items-center gap-2"><div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div class="${color} h-2.5 rounded-full transition-all" style="width:${progress}%"></div></div><span>${progress}%</span></div></td>
        <td class="px-6 py-4 text-right space-x-2">
          <button type="button" class="lang-view p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Voir"><span class="material-symbols-outlined">visibility</span></button>
          <button type="button" class="lang-edit p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Modifier"><span class="material-symbols-outlined">edit</span></button>
          <button type="button" class="lang-toggle p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="${lang.active ? 'Langue active' : 'Activer'}"><span class="material-symbols-outlined">${lang.active ? 'toggle_on' : 'toggle_off'}</span></button>
          ${lang.active ? '' : '<button type="button" class="lang-delete p-2 rounded-lg hover:bg-red-100/50 text-red-500" title="Supprimer"><span class="material-symbols-outlined">delete</span></button>'}
        </td>
      </tr>`;
    }).join('');
    bindActions();
  }

  function languageFor(button) {
    return languages.find(item => item.id === Number(button.closest('tr')?.dataset.id));
  }

  function bindActions() {
    tableBody?.querySelectorAll('.lang-view').forEach(button => button.addEventListener('click', () => {
      const lang = languageFor(button);
      openModal(`Langue — ${lang.nom}`, `<dl class="grid grid-cols-2 gap-3 text-sm"><dt class="text-gray-500">Code ISO</dt><dd class="font-semibold">${lang.code}</dd><dt class="text-gray-500">Format de date</dt><dd>${lang.date_format}</dd><dt class="text-gray-500">Fuseau horaire</dt><dd>${lang.timezone}</dd><dt class="text-gray-500">Traductions</dt><dd>${lang.fichier_traduction || 'Fichier non fourni'}</dd></dl>`, {confirmLabel: 'Fermer', cancelLabel: ''});
    }));
    tableBody?.querySelectorAll('.lang-edit').forEach(button => button.addEventListener('click', () => openLanguageModal(languageFor(button))));
    tableBody?.querySelectorAll('.lang-toggle').forEach(button => button.addEventListener('click', async () => {
      const lang = languageFor(button);
      if (lang.active) { pushNotification('Cette langue est déjà active.', 'info'); return; }
      await apiRequest('PUT', `/langues/${lang.id}`, { active: true });
      await loadLanguages();
      localStorage.setItem('app_language', lang.code);
      pushNotification(`${lang.nom} est maintenant la langue active.`, 'success');
    }));
    tableBody?.querySelectorAll('.lang-delete').forEach(button => button.addEventListener('click', () => {
      const lang = languageFor(button);
      confirmDelete(lang.nom, async () => {
        await apiRequest('DELETE', `/langues/${lang.id}`);
        await loadLanguages();
        pushNotification('Langue supprimée.', 'success');
      });
    }));
  }

  function openLanguageModal(lang = null) {
    openModal(lang ? 'Modifier la langue' : 'Ajouter une langue', `<div class="space-y-4">
      <label class="block text-sm font-medium">Code ISO *<input id="lang-code" value="${lang?.code || ''}" maxlength="5" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"></label>
      <label class="block text-sm font-medium">Nom *<input id="lang-name" value="${lang?.nom || ''}" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"></label>
      <label class="block text-sm font-medium">Format de date<select id="lang-date-format" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option></select></label>
      <label class="block text-sm font-medium">Fuseau horaire<select id="lang-timezone" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"><option>Africa/Dakar</option><option>Africa/Abidjan</option><option>Africa/Lagos</option><option>Africa/Nairobi</option></select></label>
      ${lang ? '' : '<label class="block text-sm font-medium">Fichier de traduction JSON<input id="lang-file" type="file" accept=".json" class="mt-1 w-full"></label>'}
    </div>`, {
      confirmLabel: lang ? 'Enregistrer' : 'Ajouter',
      onConfirm: async () => {
        const code = document.getElementById('lang-code')?.value.trim();
        const nom = document.getElementById('lang-name')?.value.trim();
        if (!code || !nom) { pushNotification('Le code et le nom sont obligatoires.', 'warning'); return false; }
        if (lang) {
          await apiRequest('PUT', `/langues/${lang.id}`, {
            code, nom,
            date_format: document.getElementById('lang-date-format')?.value,
            timezone: document.getElementById('lang-timezone')?.value,
          });
        } else {
          const form = new FormData();
          form.append('code', code); form.append('nom', nom);
          const file = document.getElementById('lang-file')?.files?.[0];
          if (file) form.append('fichier', file);
          await apiRequest('POST', '/langues/ajouter', form, true);
        }
        await loadLanguages();
        pushNotification(lang ? 'Langue modifiée.' : 'Langue ajoutée.', 'success');
      },
    });
    if (lang) {
      document.getElementById('lang-date-format').value = lang.date_format || 'DD/MM/YYYY';
      document.getElementById('lang-timezone').value = lang.timezone || 'Africa/Dakar';
    }
  }

  async function loadLanguages() {
    languages = await apiRequest('GET', '/langues/') || [];
    render();
  }

  document.getElementById('btn-add-language')?.addEventListener('click', () => openLanguageModal());
  document.getElementById('lang-search')?.addEventListener('input', event => {
    const query = event.target.value.toLowerCase().trim();
    render(languages.filter(lang => !query || `${lang.nom} ${lang.code}`.toLowerCase().includes(query)));
  });

  try { await loadLanguages(); } catch (error) { pushNotification('Impossible de charger les langues.', 'error'); }
});
