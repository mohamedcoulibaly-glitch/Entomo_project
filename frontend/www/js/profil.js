document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    pushNotification('Vous devez être connecté pour voir cette page.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  const photoStorageKey = `entomo_profile_photo_${Auth.getUser()?.id || Auth.getUser()?.username || 'current'}`;
  const savedPhoto = localStorage.getItem(photoStorageKey);
  if (savedPhoto) document.getElementById('profile-photo')?.style.setProperty('background-image', `url("${savedPhoto}")`);

  // ── Chargement du profil depuis le backend ──────────────────────────────────
  async function loadProfile() {
    try {
      showLoader();
      const me = await apiAuth.me();
      hideLoader();

      if (!me) {
        pushNotification('Impossible de charger le profil.', 'error');
        return;
      }

      // Mettre à jour le localStorage avec les données fraîches du backend
      Auth.setUser(me);

      // Remplir le formulaire
      const fNom    = document.getElementById('profile-nom');
      const fEmail  = document.getElementById('profile-email');
      const fRegion = document.getElementById('profile-region');
      const fRole   = document.getElementById('display-role');
      if (fNom)    fNom.value    = me.full_name || me.username || '';
      if (fEmail)  fEmail.value  = me.email || '';
      if (fRegion) fRegion.value = me.region || '';
      if (fRole)   fRole.textContent = me.role?.name || me.role_name || `Rôle #${me.role_id || '—'}`;
      const mappings = {
        'profile-telephone': me.telephone,
        'profile-institution': me.etablissement,
        'profile-district': me.district,
      };
      Object.entries(mappings).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value || '';
      });

      // Avatar / initiales
      const avatarInitials = document.getElementById('avatar-initials');
      if (avatarInitials) {
        const initials = (me.full_name || me.username || '?')
          .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        avatarInitials.textContent = initials;
      }
      const avatarName  = document.getElementById('display-name');
      if (avatarName)  avatarName.textContent  = me.full_name || me.username || '';
      const institution = document.getElementById('display-institution');
      if (institution) institution.textContent = me.etablissement || '—';

    } catch (err) {
      hideLoader();
      pushNotification('Erreur lors du chargement du profil.', 'error');
      console.warn('[profil] loadProfile error:', err);
    }
  }

  // ── Sauvegarde du profil ────────────────────────────────────────────────────
  document.getElementById('btn-enregistrer-profil')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const nom    = document.getElementById('profile-nom')?.value.trim();
    const email  = document.getElementById('profile-email')?.value.trim();
    const region = document.getElementById('profile-region')?.value.trim();

    if (!nom || !email) {
      pushNotification('Nom et email sont obligatoires.', 'error');
      return;
    }

    buttonLoading(btn, true);
    try {
      const payload = {
        full_name: nom, email,
        telephone: document.getElementById('profile-telephone')?.value.trim() || null,
        etablissement: document.getElementById('profile-institution')?.value.trim() || null,
        district: document.getElementById('profile-district')?.value.trim() || null,
      };
      if (region) payload.region = region;

      const res = await apiProfil.update(payload);
      if (res !== null) {
        // Rafraîchir le localStorage avec les nouvelles données
        Auth.setUser({ ...Auth.getUser(), full_name: nom, email, region });
        pushNotification('Profil mis à jour avec succès.', 'success');

        // Rafraîchir l'affichage avatar
        const avatarName  = document.getElementById('display-name');
        if (avatarName)  avatarName.textContent  = nom;
        const institution = document.getElementById('display-institution');
        if (institution) institution.textContent = payload.etablissement || '—';
        const avatarInitials = document.getElementById('avatar-initials');
        if (avatarInitials) {
          avatarInitials.textContent = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        }
      }
    } catch (err) {
      pushNotification('Erreur lors de la mise à jour du profil.', 'error');
      console.warn('[profil] update error:', err);
    }
    buttonLoading(btn, false);
  });

  // ── Changement de mot de passe ─────────────────────────────────────────────
  document.getElementById('btn-enregistrer-password')?.addEventListener('click', async (e) => {
    const btn        = e.currentTarget;
    const oldPwd     = document.getElementById('pwd-actuel')?.value;
    const newPwd     = document.getElementById('pwd-nouveau')?.value;
    const confirmPwd = document.getElementById('pwd-confirmer')?.value;

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
        document.getElementById('pwd-actuel').value     = '';
        document.getElementById('pwd-nouveau').value     = '';
        document.getElementById('pwd-confirmer').value = '';
        pushNotification('Mot de passe changé avec succès.', 'success');
      }
    } catch (err) {
      pushNotification('Erreur lors du changement de mot de passe.', 'error');
      console.warn('[profil] changePassword error:', err);
    }
    buttonLoading(btn, false);
  });

  // ── Statistiques utilisateur ────────────────────────────────────────────────
  async function loadStats() {
    try {
      const data = await apiProfil.stats();
      if (data) {
        const el = document.getElementById('stats-container');
        if (el) {
          el.innerHTML = Object.entries(data).map(([key, val]) => `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p class="text-2xl font-bold text-brand-primary">${val}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">${key.replace(/_/g, ' ')}</p>
            </div>`).join('');
        }
      }
    } catch (err) {
      console.warn('[profil] loadStats error:', err);
    }
  }

  // ── Activité récente ────────────────────────────────────────────────────────
  async function loadActivity() {
    try {
      const data = await apiProfil.activity();
      const el = document.getElementById('activity-list');
      if (!el) return;
      if (!data || !data.length) {
        el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Aucune activité récente.</p>';
        return;
      }
      el.innerHTML = data.map(a => `
        <div class="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span class="material-symbols-outlined text-brand-primary text-base mt-0.5">${a.icon || 'history'}</span>
          <div class="flex-1">
            <p class="text-sm text-gray-800 dark:text-gray-200">${a.description || a.action || ''}</p>
            <p class="text-xs text-gray-400">${a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</p>
          </div>
        </div>`).join('');
    } catch (err) {
      console.warn('[profil] loadActivity error:', err);
    }
  }

  // ── Initialisation ──────────────────────────────────────────────────────────
  document.getElementById('btn-modifier-profil')?.addEventListener('click', () => {
    document.querySelectorAll('#profile-form input').forEach(input => { input.disabled = false; });
    document.getElementById('profile-nom')?.focus();
    pushNotification('Les champs du profil sont maintenant modifiables.', 'info');
  });
  document.getElementById('btn-changer-password')?.addEventListener('click', () => {
    document.getElementById('password-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('pwd-actuel')?.focus();
  });
  document.getElementById('btn-voir-tout-activite')?.addEventListener('click', () => {
    document.getElementById('activity-list')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-changer-photo')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1_500_000) { pushNotification('La photo doit faire moins de 1,5 Mo.', 'error'); return; }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const value = String(reader.result);
        localStorage.setItem(photoStorageKey, value);
        document.getElementById('profile-photo')?.style.setProperty('background-image', `url("${value}")`);
        pushNotification('Photo de profil enregistrée sur cet appareil.', 'success');
      });
      reader.readAsDataURL(file);
    });
    input.click();
  });
  await loadProfile();
  loadStats();
  loadActivity();
});
