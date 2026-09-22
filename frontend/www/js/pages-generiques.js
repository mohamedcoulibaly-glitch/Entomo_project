/**
 * pages-generiques.js — Comportements communs légitimes (navigation, tableaux).
 * Les actions métier sont gérées par les modules dédiés de chaque page.
 */
document.addEventListener('DOMContentLoaded', () => {
  const openCreationModalIfAvailable = (key, fallbackHref) => {
    const modalHandlers = {
      'nouvelle-campagne': typeof window.openCampagneModal === 'function' ? () => window.openCampagneModal() : null,
      'nouvelle-intervention': typeof window.openInterventionModal === 'function' ? () => window.openInterventionModal() : null,
      'nouvelle-capture': typeof window.openCreateCaptureModal === 'function' ? () => window.openCreateCaptureModal() : null,
      'nouveau-site': typeof window.openSiteModal === 'function' ? () => window.openSiteModal() : null,
      'nouveau-dataset': typeof window.openDatasetModal === 'function' ? () => window.openDatasetModal() : null,
      'nouvel-utilisateur': typeof window.openUserModal === 'function' ? () => window.openUserModal() : null,
    };

    const handler = modalHandlers[key];
    if (handler) {
      return handler;
    }

    // Plus de page autonome de repli (supprimées au profit des modales) :
    // si le module de la page n'a pas encore exposé sa modale, on informe
    // plutôt que de naviguer vers une page qui n'existe plus.
    return () => {
      pushNotification("Ce formulaire n'est disponible que depuis sa page de gestion dédiée.", 'warning');
    };
  };

  const creationRoutes = [
    ['#btn-nouvelle-capture', 'nouvelle-capture.html', 'nouvelle-capture'],
    ['#btn-nouveau-site', 'nouveau-site.html', 'nouveau-site'],
    ['#btn-nouvelle-campagne', 'nouvelle-campagne.html', 'nouvelle-campagne'],
    ['#btn-nouveau-dataset', 'nouveau-dataset.html', 'nouveau-dataset'],
    ['#btn-nouveau-jeu-de-donnees', 'nouveau-dataset.html', 'nouveau-dataset'],
    ['#btn-nouvel-utilisateur', 'nouvel-utilisateur.html', 'nouvel-utilisateur'],
  ];
  creationRoutes.forEach(([selector, href, key]) => {
    document.querySelector(selector)?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openCreationModalIfAvailable(key, href)();
    });
  });

  document.querySelectorAll('button').forEach(button => {
    const text = button.textContent.trim().toLowerCase();
    const href = text.includes('ajouter un utilisateur') ? 'nouvel-utilisateur.html'
      : text.includes('nouveau jeu de données') ? 'nouveau-dataset.html'
      : text.includes('nouvelle capture') ? 'nouvelle-capture.html'
      : text.includes('nouveau site') ? 'nouveau-site.html'
      : text.includes('nouvelle campagne') ? 'nouvelle-campagne.html'
      : null;
    if (!href) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const key = href.replace(/\.html$/, '').replace(/^[^a-z]/, '');
      if (key === 'nouvelle-campagne' && typeof window.openCampagneModal === 'function') {
        window.openCampagneModal();
        return;
      }
      if (key === 'nouvelle-capture' && typeof window.openCreateCaptureModal === 'function') {
        window.openCreateCaptureModal();
        return;
      }
      if (key === 'nouveau-site' && typeof window.openSiteModal === 'function') {
        window.openSiteModal();
        return;
      }
      if (key === 'nouveau-dataset' && typeof window.openDatasetModal === 'function') {
        window.openDatasetModal();
        return;
      }
      if (key === 'nouvel-utilisateur' && typeof window.openUserModal === 'function') {
        window.openUserModal();
        return;
      }
      // Les anciennes pages autonomes (nouvelle-capture.html, etc.) ont été
      // supprimées au profit des modales — plus de repli par navigation.
      pushNotification("Ce formulaire n'est disponible que depuis sa page de gestion dédiée.", 'warning');
    });
  });

  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();
    if (text.includes('Rafraîchir') || text.includes('Actualiser') ||
        btn.querySelector('.material-symbols-outlined')?.textContent === 'refresh') {
      btn.addEventListener('click', () => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.add('animate-spin');
          setTimeout(() => icon.classList.remove('animate-spin'), 1000);
        }
        location.reload();
      });
    }
    if (text.includes('Imprimer') || btn.querySelector('.material-symbols-outlined')?.textContent === 'print') {
      btn.addEventListener('click', () => {
        pushNotification('Impression en cours...', 'info');
        setTimeout(() => window.print(), 500);
      });
    }
    if (text.includes('Partager') || btn.querySelector('.material-symbols-outlined')?.textContent === 'share') {
      btn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href });
        } else {
          navigator.clipboard?.writeText(window.location.href);
          pushNotification('Lien copié dans le presse-papier.', 'success');
        }
      });
    }
  });

  document.querySelectorAll('form.generic-submit-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(input => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('ring-2', 'ring-red-500', 'border-red-500');
        } else {
          input.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
          input.parentElement.querySelector('.form-err')?.remove();
        }
      });
      if (!valid) {
        pushNotification('Veuillez remplir tous les champs obligatoires.', 'warning');
      }
    });
  });

  if (typeof initTableSort === 'function') initTableSort('table');

  const searchInput = document.querySelector('input[placeholder*="Rechercher"], input[type="search"]');
  if (searchInput && typeof initTableSearch === 'function') {
    initTableSearch('input[placeholder*="Rechercher"], input[type="search"]', 'tbody');
  }

  const selectAllCb = document.querySelector('thead input[type="checkbox"]');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', () => {
      document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => {
        cb.checked = selectAllCb.checked;
        cb.closest('tr')?.classList.toggle('bg-brand-primary/5', selectAllCb.checked);
      });
    });
    document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const all = document.querySelectorAll('tbody input[type="checkbox"]');
        const checked = document.querySelectorAll('tbody input[type="checkbox"]:checked');
        selectAllCb.indeterminate = checked.length > 0 && checked.length < all.length;
        selectAllCb.checked = checked.length === all.length;
        cb.closest('tr')?.classList.toggle('bg-brand-primary/5', cb.checked);
      });
    });
  }
});
