document.addEventListener('DOMContentLoaded', () => {
  const faqData = [
    { q: 'Comment ajouter une capture ?', r: 'Allez dans "Gestion des captures" et cliquez sur le bouton d\'ajout. Vous pouvez télécharger une photo ou saisir les informations manuellement.' },
    { q: 'Comment valider une capture ?', r: 'Depuis la liste des captures, cliquez sur un spécimen pour ouvrir la modale de validation. Vous pouvez valider, corriger l\'espèce ou rejeter.' },
    { q: 'Comment créer un site sentinelle ?', r: 'Rendez-vous dans "Sites sentinelles" et cliquez sur "Ajouter un site". Remplissez les informations requises (code, nom, région).' },
    { q: 'Comment exporter les données ?', r: 'Utilisez la fonction d\'export disponible dans les pages de liste. Les formats CSV et Excel sont supportés.' },
    { q: 'Comment configurer DHIS2 ?', r: 'Allez dans "Configuration DHIS2" pour paramétrer la connexion, les mappings et lancer la synchronisation.' },
    { q: 'Comment gérer les utilisateurs ?', r: 'La page "Gestion des utilisateurs" permet d\'ajouter, modifier, activer/désactiver ou supprimer des comptes.' },
    { q: 'Comment interpréter la confiance IA ?', r: 'Le score de confiance (0-100%) indique la probabilité que l\'identification de l\'espèce par l\'IA soit correcte. Un score bas suggère une vérification manuelle.' },
    { q: 'Puis-je importer des données en masse ?', r: 'Oui, la page "Import de données" accepte les fichiers CSV, XLSX et JSON. Utilisez le modèle fourni pour formater vos données.' },
    { q: 'Comment sont générés les rapports ?', r: 'La page "Génération de rapports" permet de créer des rapports personnalisés. Sélectionnez un modèle, une période et les filtres souhaités.' },
    { q: 'Comment activer le mode hors-ligne ?', r: 'Le mode hors-ligne s\'active automatiquement lorsque le serveur est inaccessible. Les données sont stockées localement et synchronisées à la reconnexion.' },
  ];

  let currentResults = [...faqData];

  function renderFAQ(items) {
    const container = document.getElementById('faq-list');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<div class="text-center py-10 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">search_off</span>Aucun résultat trouvé</div>';
      return;
    }
    container.innerHTML = items.map((item, i) => `
      <div class="faq-item border-b border-gray-200 dark:border-gray-700">
        <button class="faq-question w-full flex items-center justify-between py-4 px-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" data-index="${i}">
          <span class="text-sm font-medium text-gray-900 dark:text-white">${item.q}</span>
          <span class="material-symbols-outlined text-gray-400 transition-transform duration-200">expand_more</span>
        </button>
        <div class="faq-answer hidden px-2 pb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">${item.r}</p>
        </div>
      </div>`).join('');

    container.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const answer = btn.nextElementSibling;
        const icon = btn.querySelector('.material-symbols-outlined');
        const isOpen = !answer.classList.contains('hidden');
        answer.classList.toggle('hidden');
        icon.textContent = isOpen ? 'expand_more' : 'expand_less';
      });
    });
  }

  const searchInput = document.getElementById('search-aide');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const details = document.querySelectorAll('details');
      let visible = 0;
      details.forEach(detail => {
        const match = !q || detail.textContent.toLowerCase().includes(q);
        detail.classList.toggle('hidden', !match);
        if (match) visible += 1;
      });
      document.getElementById('aide-empty-state')?.remove();
      if (q && details.length && visible === 0) {
        const empty = document.createElement('p');
        empty.id = 'aide-empty-state';
        empty.className = 'py-6 text-center text-sm text-gray-500 dark:text-gray-400';
        empty.textContent = 'Aucun sujet ne correspond à votre recherche.';
        details[0].parentElement.appendChild(empty);
      }
    });
  }

  document.querySelectorAll('[data-faq-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.faqTopic;
      if (topic) {
        currentResults = faqData.filter(item => item.q.toLowerCase().includes(topic));
        renderFAQ(currentResults);
        document.getElementById('search-faq')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  if (document.getElementById('faq-list')) renderFAQ(faqData);

  async function loadTickets() {
    const target = document.getElementById('support-ticket-list');
    if (!target || !Auth.isLoggedIn()) return;
    try {
      const tickets = await apiSupport.listTickets();
      target.innerHTML = tickets?.length ? tickets.slice(0, 5).map(ticket => `
        <button type="button" class="support-ticket block w-full rounded-lg bg-gray-50 p-2 text-left dark:bg-gray-700/50" data-id="${ticket.id}">
          <span class="block font-medium text-gray-800 dark:text-gray-200">#${ticket.id} — ${ticket.sujet}</span>
          <span class="text-xs">${ticket.statut.replace('_', ' ')} · ${ticket.priorite}</span>
        </button>`).join('') : '<p>Aucune demande d’assistance.</p>';
      target.querySelectorAll('.support-ticket').forEach(button => button.addEventListener('click', () => {
        const ticket = tickets.find(item => item.id === Number(button.dataset.id));
        openModal(`Demande #${ticket.id}`, `<div class="space-y-3 text-sm"><p><strong>${ticket.sujet}</strong></p><p class="text-gray-600 dark:text-gray-300">${ticket.message}</p><p><span class="font-medium">Statut :</span> ${ticket.statut.replace('_', ' ')}</p>${ticket.reponse ? `<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20"><strong>Réponse du support</strong><p>${ticket.reponse}</p></div>` : ''}</div>`, {confirmLabel: 'Fermer', cancelLabel: ''});
      }));
    } catch (error) {
      target.textContent = 'Historique indisponible.';
    }
  }

  document.getElementById('btn-contacter-support')?.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      pushNotification('Connectez-vous pour envoyer une demande.', 'warning');
      return;
    }
    openModal('Contacter le support', `<form id="support-form" class="space-y-4">
      <label class="block text-sm font-medium">Sujet *<input id="support-subject" required minlength="3" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700" placeholder="Décrivez brièvement le problème"></label>
      <label class="block text-sm font-medium">Catégorie<select id="support-category" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"><option value="assistance">Assistance générale</option><option value="administration">Administration</option><option value="configuration">Configuration</option><option value="compte">Compte</option><option value="incident">Incident technique</option></select></label>
      <label class="block text-sm font-medium">Priorité<select id="support-priority" class="mt-1 w-full rounded-lg border-gray-300 dark:bg-gray-700"><option value="basse">Basse</option><option value="normale" selected>Normale</option><option value="haute">Haute</option><option value="critique">Critique</option></select></label>
      <label class="block text-sm font-medium">Message *<textarea id="support-message" required minlength="10" class="mt-1 h-32 w-full rounded-lg border-gray-300 dark:bg-gray-700" placeholder="Expliquez le contexte, les étapes et le résultat observé"></textarea></label>
    </form>`, {
      confirmLabel: 'Envoyer la demande',
      onConfirm: async () => {
        const sujet = document.getElementById('support-subject')?.value.trim();
        const message = document.getElementById('support-message')?.value.trim();
        if (!sujet || sujet.length < 3 || !message || message.length < 10) {
          pushNotification('Renseignez un sujet et un message détaillé.', 'warning');
          return false;
        }
        const ticket = await apiSupport.createTicket({
          sujet,
          message,
          categorie: document.getElementById('support-category')?.value || 'assistance',
          priorite: document.getElementById('support-priority')?.value || 'normale',
        });
        pushNotification(`Demande #${ticket.id} enregistrée et transmise au support.`, 'success');
        await loadTickets();
      },
    });
  });

  document.getElementById('btn-guide-pdf')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = '../assets/guide-utilisateur-ento-app.pdf';
    link.download = 'Guide-utilisateur-Ento-App-Afrique.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  loadTickets();
});
