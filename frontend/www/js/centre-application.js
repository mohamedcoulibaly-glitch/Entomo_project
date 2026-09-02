document.addEventListener('DOMContentLoaded', () => {
  const screens = [
    ['Pilotage','Surveillance entomologique','dashboard-entomo.html','dashboard','Indicateurs et activité nationale',['dashboard:voir']],
    ['Pilotage','Région médicale','dashboard-entomo-region5.html','location_on','Pilotage territorial',['dashboard:voir']],
    ['Pilotage','Activité utilisateurs','dashboard-utilisateurs.html','group','Suivi des équipes',['users:voir','admin']],
    ['Pilotage','Rapports OMS','dashboard-rapports-oms.html','description','Conformité et transmissions',['rapports:voir']],
    ['Pilotage','Synchronisation DHIS2','dashboard-sync-dhis2.html','sync_alt','État des échanges',['dhis2:gestion','sync:gestion']],
    ['Terrain','Captures','gestion-captures.html','pest_control','Collectes et validation laboratoire',['captures:voir']],
    ['Terrain','Nouvelle capture','nouvelle-capture.html','add_circle','Enregistrer une collecte',['captures:creer']],
    ['Terrain','Sites sentinelles','gestion-sites.html','place','Implantations et activités',['sites:voir']],
    ['Terrain','Nouveau site','nouveau-site.html','add_location_alt','Créer une implantation',['sites:creer']],
    ['Terrain','Interventions','interventions.html','health_and_safety','Actions de lutte vectorielle',['interventions:gestion']],
    ['Terrain','Nouvelle intervention','nouvelle-intervention.html','medical_services','Programmer une action',['interventions:gestion']],
    ['Terrain','Campagnes','campagnes.html','campaign','Planification opérationnelle',['campagnes:gestion']],
    ['Terrain','Nouvelle campagne','nouvelle-campagne.html','event_available','Créer une campagne',['campagnes:gestion']],
    ['Données','Datasets et annotations','gestion-datasets.html','dataset','Jeux de données ML',['datasets:gestion']],
    ['Données','Nouveau dataset','nouveau-dataset.html','create_new_folder','Préparer un jeu de données',['datasets:gestion']],
    ['Données','Import de données','import-donnees.html','upload_file','Importer CSV, Excel ou JSON',['datasets:gestion']],
    ['Données','Analyse des données','analyse-donnees.html','analytics','Explorer et exporter',['captures:voir','rapports:voir']],
    ['Données','Données hors ligne','gestion-hors-ligne.html','offline_bolt','File de synchronisation',['sync:gestion']],
    ['Modèles IA','Catalogue des modèles','catalogue-modeles.html','memory','Modèles déployés',['modeles:gestion']],
    ['Modèles IA','Modèles visuels','gestion-modeles-visuels.html','image','Classification d’images',['modeles:gestion']],
    ['Modèles IA','Surveillance audio','surveillance-audio.html','mic','Reconnaissance acoustique',['modeles:gestion','captures:voir']],
    ['Modèles IA','Pipelines ML','dashboard-pipelines-1.html','account_tree','Entraînements et traitements',['modeles:gestion']],
    ['Modèles IA','Pipelines avancés','dashboard-pipelines-4.html','hub','Orchestration avancée',['modeles:gestion']],
    ['Modèles IA','Modèles de risque','config-modeles-risque.html','crisis_alert','Prévision épidémiologique',['modeles:gestion']],
    ['Cartographie','Carte opérationnelle','cartographie.html','map','Sites, captures et risques',['sites:voir','captures:voir']],
    ['Rapports','Générateur de rapports','generateur-rapports.html','summarize','Composer et programmer',['rapports:creer','rapports:voir']],
    ['Rapports','Alertes','alertes.html','notifications_active','Alertes et seuils',['notifications:gestion']],
    ['Administration','Utilisateurs','gestion-utilisateurs.html','manage_accounts','Comptes et accès',['users:voir']],
    ['Administration','Nouvel utilisateur','nouvel-utilisateur.html','person_add','Créer un compte',['users:creer']],
    ['Administration','Rôles et permissions','gestion-roles.html','admin_panel_settings','Contrôle des accès',['roles:voir','admin']],
    ['Administration','Journal d’audit','audit-logs.html','history','Traçabilité des opérations',['audit:voir','admin']],
    ['Configuration','Intégration DHIS2','config-dhis2.html','lan','Connexion et mappings',['dhis2:gestion']],
    ['Configuration','Validation DHIS2','validation-dhis2.html','fact_check','Contrôle avant envoi',['captures:valider','dhis2:gestion']],
    ['Configuration','Indicateurs','config-indicateurs.html','monitoring','Définition des KPI',['indicateurs:gestion']],
    ['Configuration','Synchronisation','param-sync.html','sync','Règles de synchronisation',['sync:gestion']],
    ['Configuration','Statut global','statut-sync.html','cloud_sync','Services et files',['sync:gestion']],
    ['Configuration','Langues','param-langues.html','language','Localisation',['langues:gestion']],
    ['Compte','Mon profil','profil.html','account_circle','Informations personnelles',null],
    ['Compte','Paramètres du compte','parametres-compte.html','settings','Sécurité et préférences',null],
    ['Assistance','Assistant IA','assistant.html','smart_toy','Aide contextuelle basée sur vos données',['dashboard:voir']],
    ['Assistance','Aide','aide.html','help','Guides et support',null],
  ];

  const visibleScreens = window.PermissionGuard
    ? PermissionGuard.filterScreens(screens)
    : screens;

  const creates = visibleScreens.filter(x => /nouve|créer|enregistrer|programmer|préparer/i.test(`${x[1]} ${x[4]}`)).slice(0, 6);
  const categories = [...new Set(visibleScreens.map(x => x[0]))];
  const root = document.getElementById('screen-groups');
  const search = document.getElementById('screen-search');
  const filter = document.getElementById('category-filter');
  document.getElementById('screen-count').textContent = visibleScreens.length;
  document.getElementById('category-count').textContent = categories.length;
  filter.insertAdjacentHTML('beforeend', categories.map(x => `<option>${x}</option>`).join(''));
  document.getElementById('quick-create').innerHTML = creates.map(card => `<a href="${card[2]}" class="group flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><span class="material-symbols-outlined rounded-xl bg-brand-primary/10 p-3 text-2xl text-brand-primary">${card[3]}</span><span><strong class="block">${card[1]}</strong><small class="text-slate-500">${card[4]}</small></span><span class="material-symbols-outlined ml-auto text-slate-300 group-hover:text-brand-primary">arrow_forward</span></a>`).join('');

  function render() {
    const q = search.value.trim().toLowerCase();
    const category = filter.value;
    const filtered = visibleScreens.filter(x => (!category || x[0] === category) && (!q || x.join(' ').toLowerCase().includes(q)));
    document.getElementById('result-count').textContent = `${filtered.length} écran${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''}`;
    document.getElementById('screen-empty').classList.toggle('hidden', filtered.length > 0);
    root.innerHTML = categories.map(cat => {
      const items = filtered.filter(x => x[0] === cat); if (!items.length) return '';
      return `<section><h3 class="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">${cat}</h3><div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${items.map(x => `<a href="${x[2]}" class="group rounded-2xl border bg-white p-5 transition hover:border-brand-primary hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div class="flex items-start justify-between"><span class="material-symbols-outlined rounded-xl bg-slate-100 p-3 text-brand-primary dark:bg-slate-800">${x[3]}</span><span class="material-symbols-outlined text-slate-300 group-hover:text-brand-primary">north_east</span></div><h4 class="mt-4 font-bold">${x[1]}</h4><p class="mt-1 text-sm text-slate-500">${x[4]}</p></a>`).join('')}</div></section>`;
    }).join('');
  }
  search.addEventListener('input', render); filter.addEventListener('change', render); render();
});
