(function() {
  const PUBLIC_PAGES = ['login.html', '404.html', 'aide.html'];
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function redirectToLogin() {
    const currentPath = window.location.pathname.replace(/^\/+/, '');
    if (currentPath && currentPath !== 'login.html' && currentPath !== '') {
      sessionStorage.setItem('redirect_after_login', '/' + currentPath);
    }
    // Calculer le bon chemin vers login.html à la racine du dossier www
    window.location.href = '/login.html';
  }

  if (PUBLIC_PAGES.includes(currentPage) || currentPage === '') {
    return;
  }

  document.addEventListener('DOMContentLoaded', async function guardCheck() {
    if (!Auth.isLoggedIn()) {
      redirectToLogin();
      return;
    }
    try {
      const user = await apiRequest('GET', '/auth/me', null, false, { silent: true });
      if (!user || !user.id) {
        Auth.logout();
        redirectToLogin();
        return;
      }
    } catch (err) {
      Auth.logout();
      redirectToLogin();
    }
  });
})();
