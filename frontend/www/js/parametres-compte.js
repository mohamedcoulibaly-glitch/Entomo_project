document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  const user = Auth.getUser();

  // ── Charger les préférences sauvegardées ────────────────────────────────────
  let savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem('entomo_preferences') || '{}'); } catch { return {}; }
  })();

  function loadSettings() {
    const theme       = savedPrefs.theme || localStorage.getItem('theme') || 'light';
    const lang        = document.getElementById('param-langue');
    const notifEmail  = document.getElementById('notif-email');
    const notifBrowser = document.getElementById('notif-inapp');
    const notifSms    = document.getElementById('notif-critique');

    document.querySelector(`input[name="theme"][value="${theme}"]`)?.click();
    if (lang && savedPrefs.lang) lang.value = savedPrefs.lang;
    if (notifEmail)   notifEmail.checked  = savedPrefs.notif_email !== false;
    if (notifBrowser) notifBrowser.checked = savedPrefs.notif_inapp !== false;
    if (notifSms)     notifSms.checked    = savedPrefs.notif_critique === true;
  }

  // ── Sauvegarder les paramètres d'affichage/notifications ───────────────────
  document.getElementById('btn-sauvegarder-params')?.addEventListener('click', async (e) => {
    const btn         = e.currentTarget;
    const theme       = document.querySelector('input[name="theme"]:checked')?.value || 'light';
    const lang        = document.getElementById('param-langue')?.value || 'Français';
    const notifEmail  = document.getElementById('notif-email')?.checked !== false;
    const notifBrowser = document.getElementById('notif-inapp')?.checked !== false;
    const notifSms    = document.getElementById('notif-critique')?.checked === true;

    // Appliquer le thème immédiatement
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Sauvegarder les préférences en local
    const prefs = { theme, lang, notif_email: notifEmail, notif_inapp: notifBrowser, notif_critique: notifSms };
    localStorage.setItem('entomo_preferences', JSON.stringify(prefs));

    // Tenter de persister les préférences sur le backend
    buttonLoading(btn, true);
    try {
      const email = document.getElementById('param-email')?.value.trim();
      if (email && email !== user?.email) await apiProfil.update({ email });
      await apiProfil.updatePreferences(prefs);
    } catch (err) {
      console.warn('[parametres-compte] Impossible de sauvegarder les préférences sur le backend:', err);
    }
    buttonLoading(btn, false);
    pushNotification('Paramètres sauvegardés avec succès.', 'success');
  });

  // ── Changement de mot de passe (si section présente dans la page) ────────────
  document.getElementById('btn-change-password')?.addEventListener('click', async (e) => {
    const btn        = e.currentTarget;
    const oldPwd     = document.getElementById('f-old-password')?.value;
    const newPwd     = document.getElementById('f-new-password')?.value;
    const confirmPwd = document.getElementById('f-confirm-password')?.value;

    if (!oldPwd || !newPwd || !confirmPwd) {
      pushNotification('Tous les champs mot de passe sont obligatoires.', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      pushNotification('Les nouveaux mots de passe ne correspondent pas.', 'error');
      return;
    }
    if (newPwd.length < 6) {
      pushNotification('Le mot de passe doit contenir au moins 6 caractères.', 'error');
      return;
    }

    buttonLoading(btn, true);
    try {
      const res = await apiProfil.changePassword(oldPwd, newPwd);
      if (res !== null) {
        if (document.getElementById('f-old-password'))     document.getElementById('f-old-password').value     = '';
        if (document.getElementById('f-new-password'))     document.getElementById('f-new-password').value     = '';
        if (document.getElementById('f-confirm-password')) document.getElementById('f-confirm-password').value = '';
        pushNotification('Mot de passe changé avec succès.', 'success');
      }
    } catch (err) {
      pushNotification('Erreur lors du changement de mot de passe.', 'error');
      console.warn('[parametres-compte] changePassword error:', err);
    }
    buttonLoading(btn, false);
  });

  // ── Suppression du compte ───────────────────────────────────────────────────
  document.getElementById('btn-supprimer-compte')?.addEventListener('click', () => {
    confirmDelete('votre compte', async () => {
      try {
        showLoader();
        const res = await apiUsers.delete(user?.id);
        if (res !== null) {
          Auth.removeToken();
          pushNotification('Compte supprimé.', 'info');
          setTimeout(() => { window.location.href = '../login.html'; }, 1500);
        }
        hideLoader();
      } catch (err) {
        hideLoader();
        pushNotification('Erreur lors de la suppression du compte.', 'error');
        console.warn('[parametres-compte] deleteAccount error:', err);
      }
    });
  });

  // ── Déconnexion de toutes les sessions (si bouton présent) ─────────────────
  async function revokeAllSessions(btn) {
    buttonLoading(btn, true);
    try {
      await apiProfil.logoutAll();
      Auth.removeToken();
      pushNotification('Déconnecté de toutes les sessions.', 'info');
      setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    } catch (err) {
      pushNotification('Erreur lors de la déconnexion globale.', 'error');
    }
    buttonLoading(btn, false);
  }

  document.querySelectorAll('#section-sessions button').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal('Révoquer les sessions', '<p class="text-sm">Pour des raisons de sécurité, cette action révoquera toutes les sessions, y compris la session actuelle.</p>', {
        confirmLabel: 'Tout révoquer',
        confirmClass: 'bg-red-600 text-white',
        onConfirm: () => revokeAllSessions(btn),
      });
    });
  });

  // ── Initialisation ──────────────────────────────────────────────────────────
  const remotePrefs = await apiProfil.preferences();
  if (remotePrefs) {
    savedPrefs = { ...savedPrefs, ...remotePrefs };
    localStorage.setItem('entomo_preferences', JSON.stringify(savedPrefs));
  }
  if (user) {
    const email = document.getElementById('param-email');
    const username = document.getElementById('param-username');
    if (email) email.value = user.email || '';
    if (username) { username.value = user.username || ''; username.disabled = true; }
  }
  loadSettings();
});
