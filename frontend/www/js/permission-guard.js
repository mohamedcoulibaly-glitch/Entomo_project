/**
 * Garde de permissions granulaires — module × action (aligné sur le backend).
 */
if (!window.PermissionGuard) {
const PermissionGuard = (() => {
  /** Page → permissions requises (au moins une). null = tout utilisateur connecté. */
  const PAGE_PERMISSIONS = {
    'dashboard-entomo.html': ['dashboard:voir'],
    'dashboard-entomo-region5.html': ['dashboard:voir'],
    'dashboard-utilisateurs.html': ['users:voir', 'admin'],
    'dashboard-rapports-oms.html': ['rapports:voir'],
    'dashboard-sync-dhis2.html': ['dhis2:gestion', 'sync:gestion'],
    'gestion-captures.html': ['captures:voir'],
    'nouvelle-capture.html': ['captures:creer'],
    'gestion-sites.html': ['sites:voir'],
    'nouveau-site.html': ['sites:creer'],
    'interventions.html': ['interventions:gestion'],
    'nouvelle-intervention.html': ['interventions:gestion'],
    'campagnes.html': ['campagnes:gestion'],
    'nouvelle-campagne.html': ['campagnes:gestion'],
    'gestion-datasets.html': ['datasets:gestion'],
    'nouveau-dataset.html': ['datasets:gestion'],
    'import-donnees.html': ['datasets:gestion'],
    'analyse-donnees.html': ['captures:voir', 'rapports:voir'],
    'gestion-hors-ligne.html': ['sync:gestion'],
    'catalogue-modeles.html': ['modeles:gestion'],
    'gestion-modeles-visuels.html': ['modeles:gestion'],
    'surveillance-audio.html': ['modeles:gestion', 'captures:voir'],
    'dashboard-pipelines-1.html': ['modeles:gestion'],
    'dashboard-pipelines-4.html': ['modeles:gestion'],
    'config-modeles-risque.html': ['modeles:gestion'],
    'cartographie.html': ['sites:voir', 'captures:voir'],
    'generateur-rapports.html': ['rapports:creer', 'rapports:voir'],
    'alertes.html': ['notifications:gestion'],
    'gestion-utilisateurs.html': ['users:voir'],
    'nouvel-utilisateur.html': ['users:creer'],
    'gestion-roles.html': ['roles:voir', 'admin'],
    'audit-logs.html': ['audit:voir', 'admin'],
    'config-dhis2.html': ['dhis2:gestion'],
    'validation-dhis2.html': ['captures:valider', 'dhis2:gestion'],
    'config-indicateurs.html': ['indicateurs:gestion'],
    'param-sync.html': ['sync:gestion'],
    'statut-sync.html': ['sync:gestion'],
    'param-langues.html': ['langues:gestion'],
    'assistant.html': ['dashboard:voir'],
  };

  function codes() {
    const user = Auth.getUser();
    if (!user) return [];
    if (user.is_superuser) return ['admin'];
    return user.permissions || [];
  }

  function can(permission) {
    const set = new Set(codes());
    if (set.has('admin')) return true;
    if (Array.isArray(permission)) {
      return permission.some(p => set.has(p));
    }
    return set.has(permission);
  }

  function canAccessPage(pageName) {
    const required = PAGE_PERMISSIONS[pageName];
    if (!required) return true;
    return can(required);
  }

  function enforcePageAccess(pageName) {
    if (canAccessPage(pageName)) return true;
    pushNotification('Accès refusé : permissions insuffisantes pour cette page.', 'warning');
    const hub = window.location.pathname.includes('/pages/') ? 'centre-application.html' : 'pages/centre-application.html';
    setTimeout(() => { window.location.href = hub; }, 1200);
    return false;
  }

  function filterScreens(screens) {
    return screens.filter(row => {
      const perm = row[5] || PAGE_PERMISSIONS[row[2]] || null;
      if (!perm) return true;
      return can(perm);
    });
  }

  return { PAGE_PERMISSIONS, can, canAccessPage, enforcePageAccess, filterScreens, codes };
})();

window.PermissionGuard = PermissionGuard;
}
