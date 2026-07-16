document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-retour-accueil') || document.querySelector('a[href*="index"]') || document.querySelector('button');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      window.location.href = depth > 1 ? '../'.repeat(depth - 1) + 'index.html' : './index.html';
    });
  }
});
