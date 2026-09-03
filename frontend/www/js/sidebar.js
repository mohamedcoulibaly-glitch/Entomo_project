/**
 * Charge la sidebar unique de l'application dans les pages qui l'utilisent.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const host = document.getElementById('shared-sidebar');
  if (!host) return;

  const isPagesRoute = window.location.pathname.includes('/pages/');
  const fragmentUrl = isPagesRoute ? '../sidebar.html?v=2' : 'sidebar.html?v=2';
  const response = await fetch(fragmentUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Impossible de charger la sidebar (${response.status})`);
  }

  host.outerHTML = await response.text();
  if (!isPagesRoute) {
    document.querySelectorAll('aside nav a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href === '../index.html') {
        link.setAttribute('href', 'index.html');
      } else if (!href.startsWith('../') && !href.startsWith('/')) {
        link.setAttribute('href', `pages/${href}`);
      }
    });
  }

  const sidebar = document.querySelector('aside');
  const savedScroll = Number(sessionStorage.getItem('entomo-sidebar-scroll'));
  const restoreScroll = () => {
    if (!sidebar || !Number.isFinite(savedScroll)) return;
    const maxScroll = Math.max(0, sidebar.scrollHeight - sidebar.clientHeight);
    sidebar.scrollTop = Math.min(savedScroll, maxScroll);
  };
  if (sidebar && Number.isFinite(savedScroll)) {
    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });
    setTimeout(restoreScroll, 100);
    setTimeout(restoreScroll, 350);
  }
  sidebar?.addEventListener('scroll', () => {
    sessionStorage.setItem('entomo-sidebar-scroll', String(sidebar.scrollTop));
  }, { passive: true });
  sidebar?.querySelectorAll('nav a[href]').forEach(link => {
    link.addEventListener('click', () => {
      sessionStorage.setItem('entomo-sidebar-scroll', String(sidebar.scrollTop));
    });
  });

  document.dispatchEvent(new CustomEvent('entomo-sidebar-ready'));
});
