# Bull & Bear Academy — Instructions pour Codex / Vercel

## Objectif
Déployer cette maquette Astro sur Vercel en conservant le design livré. Il s'agit de **Bull & Bear Academy**, domaine d'origine https://www.bullandbear-academy.com/, et non des autres sociétés Bull & Bear.

## Contraintes validées par Olivier
- Conserver le logo officiel inclus dans `public/assets/logo-official.png` et la palette orange **#E25814**, noir et blanc. L'orange est celui observé dans l'en-tête officiel.
- Conserver la présentation premium : compositions éditoriales, grandes typographies, sculpture du toro et de l'ours, espaces et comportements responsive.
- Reprendre l'arborescence actuelle : Inicio, Nosotros, Trading Club, Videos (Webinars / Guerra de Traders), Eventos, Cursos, Contacto, FAQ.
- Conserver l'ordre de l'accueil : présentation, formation, nomination 2024, définition du trading, Trading Club, B&B News, demande de séance, six mentors, projet avec le Tec de Monterrey.
- Garder les douze cours et les chemins de leurs fiches. Le fichier `src/data/courses.json` contient aussi l'URL officielle de chacun.
- Les sessions de janvier 2026 et novembre 2025 sont des **archives**, pas des événements à venir. Ne pas inventer de futures dates, de tarifs ou de résultats de trading.

## Démarrage et déploiement
1. Ouvrir le dossier `Bull-Bear-Academy` de ce ZIP.
2. Utiliser Node.js 22 LTS et exécuter `npm ci`, puis `npm run build`.
3. Le résultat se trouve dans `dist/` (22 pages HTML). Pour la prévisualisation locale, `npx astro dev --host 0.0.0.0`.
4. Pousser le projet dans le dépôt GitHub souhaité et importer le dépôt dans Vercel.
5. Vercel : framework **Astro**, commande **npm run build**, dossier de sortie **dist**, installation **npm ci**. Le fichier `vercel.json` est fourni.
6. Livrer d'abord l'URL de prévisualisation Vercel. Ne pas déplacer le domaine officiel ni modifier les DNS pour la simple présentation du mockup.
7. Vérifier sur l'URL Vercel l'accueil, le menu mobile, les filtres du catalogue, une fiche de cours, la FAQ et le formulaire.

Ce ZIP est autonome et n'embarque ni identifiant du Site privé ChatGPT, ni secrets, ni dossier node_modules.

## Contenu du projet
- `src/layouts/Layout.astro` : en-tête, navigation, footer, SEO de base et dialogues.
- `src/pages/` : accueil et toutes les pages de navigation.
- `src/pages/tienda/producto/[slug].astro` : génération des douze fiches.
- `src/components/` : équipe, FAQ et demande de séance.
- `src/data/courses.json` : catalogue et liens d'origine.
- `src/styles/global.css` : design et adaptations mobile.
- `public/app.js` : navigation mobile, dialogue de contact, filtres.
- `public/assets/` : logo, six portraits, sculpture et polices locales.
- `dist/` : version statique compilée, fournie pour consultation / hébergement.

## Fonctionnement et limites du mockup
- La navigation est multipage et les douze fiches sont locales. Chaque fiche permet de consulter le programme sur la boutique officielle.
- Le formulaire prépare un message WhatsApp localement. Aucune donnée n'est enregistrée, aucune demande n'est envoyée automatiquement. Le visiteur choisit d'ouvrir WhatsApp puis d'envoyer son message.
- Aucun paiement, compte élève, CRM, réservation, CMS ou collecte d'e-mail n'est connecté. Il faut définir ces intégrations avant un lancement commercial complet.
- Les pages de vidéos renvoient aux canaux existants ; elles n'inventent pas de catalogue ni de nouvelles vidéos.
- B&B News conserve la rubrique, avec des accès éditoriaux aux cours, au club et au projet. Aucun faux article d'actualité n'est publié.
- Les mentions « proposition / vue privée » et `noindex,nofollow` sont volontaires pendant la présentation. Après validation du lancement officiel, mettre à jour ces mentions, définir le domaine canonique, produire le sitemap et activer l'indexation uniquement sur le domaine final.
- Reconfirmer avec l'académie les programmes, prix, modalités, liens externes, prochaines dates et la formulation de la nomination 2024 avant publication commerciale.

## Vérification effectuée sur la livraison
- `npm run build` réussi : 22 pages.
- Syntaxe de `public/app.js` vérifiée.
- Toutes les cibles locales des liens et images du HTML généré existent.
- Accueil inspecté sur ordinateur, puis dans des cadres de 390 px et 320 px.
- Menu mobile et catalogue à 390 px : aucun débordement horizontal constaté.
- Filtre Forex : quatre cours affichés.
- Ouverture du dialogue de contact testée. Aucune prise de contact réelle effectuée.

## Sources
Les contenus et chemins ont été relevés sur le site public de l'académie. Voir `SOURCES.md` pour la provenance des éléments et les choix éditoriaux.
