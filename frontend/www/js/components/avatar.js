/**
 * Composant Avatar — initiales locales, zéro dépendance externe.
 */
const EntomoAvatar = (() => {
  function initials(name) {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function colorFromName(name) {
    const palette = ['#005689', '#0E7490', '#7C3AED', '#B45309', '#BE123C', '#15803D'];
    let hash = 0;
    const value = name || 'user';
    for (let i = 0; i < value.length; i += 1) hash = value.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  function apply(element, user) {
    if (!element) return;
    const label = user?.full_name || user?.username || 'Utilisateur';
    element.style.backgroundImage = 'none';
    element.classList.add('entomo-avatar');
    element.setAttribute('data-alt', `Avatar de ${label}`);
    element.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'entomo-avatar-initials';
    span.textContent = initials(label);
    span.style.backgroundColor = colorFromName(label);
    element.appendChild(span);
  }

  function applyAll(root = document) {
    root.querySelectorAll('[data-entomo-avatar], #header-avatar, header .rounded-full.size-10').forEach(el => {
      if (el.closest('.entomo-avatar-skip')) return;
      try {
        const user = JSON.parse(localStorage.getItem('entomo_user') || 'null');
        apply(el, user);
      } catch {
        apply(el, null);
      }
    });
    root.querySelectorAll('[style*="googleusercontent"]').forEach(el => {
      el.style.backgroundImage = 'none';
      el.classList.add('entomo-avatar-host');
    });
  }

  return { apply, applyAll, initials, colorFromName };
})();

window.EntomoAvatar = EntomoAvatar;
