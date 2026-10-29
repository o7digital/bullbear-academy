# Bull & Bear Academy

Maquette Astro du site de Bull & Bear Academy, destinée à une présentation sur Vercel.

## Développement

Utiliser Node.js 22 (`nvm use`), puis :

```sh
npm ci
npm run dev
```

## Compilation

```sh
npm run build
npm run preview
```

Astro génère les 176 pages statiques dans `dist/`. Vercel utilise la configuration de `vercel.json`.

## Périmètre

La maquette conserve volontairement `noindex,nofollow` et les mentions de proposition. Le formulaire général de la page prépare un message WhatsApp. Le formulaire du chat enregistre les coordonnées et la demande dans le Channel Manager. Aucun paiement ni compte élève n'est connecté.

Consulter [les consignes de livraison](INSTRUCTIONS-CODEX.md) et [les sources](SOURCES.md). Le domaine officiel et ses DNS ne doivent pas être modifiés pour cette présentation.

## Langues

La version espagnole reste à la racine ; les versions anglaise, russe, chinoise (chinois simplifié), allemande, italienne, française et portugaise (Brésil) se trouvent sous `/en/`, `/ru/`, `/zh/`, `/de/`, `/it/`, `/fr/` et `/pt/`. Le sélecteur Español / English / Русский / 中文 / Deutsch / Italiano / Français / Português mène à la page équivalente dans les huit langues, y compris pour les douze cours.

Les huit langues partagent les composants et les mises en page. Les traductions sont dans `src/i18n/en.json`, `ru.json`, `zh.json`, `de.json`, `it.json`, `fr.json` et `pt.json` ; les correspondances des routes et des fiches de cours sont dans `src/i18n/index.ts` ; les langues et les voix sont centralisées dans `src/i18n/locales.ts`. Les pages traduites utilisent `src/pages/[locale]/[...path].astro`. Le formulaire WhatsApp et le compteur des filtres utilisent les mêmes dictionnaires, avec les pluriels adaptés à chaque langue. Les URLs officielles externes conservent leur destination d’origine.

## Charly IA

Au chargement, les anciennes présentations de l’assistant enregistrées dans la session du navigateur sont mises à jour vers Charly. Le reste de la conversation, les messages du visiteur et les réponses humaines sont conservés. Les tests de cette migration se lancent avec `npm test`.

Le widget est présenté sous le nom Charly IA. Il reprend le panneau arrondi, les couleurs crème et anthracite, les ombres et le mouvement flottant de `o7digital/suitesmine-bot/components/O7Widget.jsx`. Il est disponible sur les 176 pages. Le chat suit automatiquement la langue du site, sans sélecteur supplémentaire, et conserve le même échange en espagnol, anglais, russe, chinois simplifié, allemand, italien, français ou portugais. La dictée utilise la langue choisie lorsque le navigateur la prend en charge.

Les messages ne sont envoyés qu'après consentement. Le service partagé `https://olivia-ai.o7digital.com` fournit une identité signée liée au domaine `bullbear-academy-preview.vercel.app` et au profil isolé `bullbear`, puis conserve les échanges dans la boîte de réception Olivia. Aucun secret n'est présent dans ce site statique. Le navigateur conserve l'historique, le consentement et l'état du chat dans `sessionStorage`, y compris lors du changement de langue ; « Nouvelle conversation » efface cet historique local, sans supprimer les données du service.

Le composant est dans `src/components/Olivia.astro`, les textes dans `src/data/olivia.ts`, le comportement dans `src/scripts/olivia.ts` et le style dans `src/styles/olivia.css`. Le profil partagé Node/Python contient les douze cours et les coordonnées publiées, répond aux questions de formation et renvoie vers l'académie pour les prix, dates et inscriptions. Il ne fournit pas de conseil financier personnalisé et ne confirme aucune inscription ni aucun paiement. Tout changement de domaine nécessite de mettre à jour l'enregistrement du profil Olivia.

Charly clarifie d’abord le cours ou le service demandé, répond aux questions précises dans le contexte de la conversation, puis propose le formulaire de contact. Le moteur fournit une réponse structurée qui pilote cette étape. Le formulaire conserve son brouillon lors des changements de page/langue et confirme l’enregistrement uniquement après réponse du serveur. Les coordonnées et la demande sont rattachées à la conversation BullBear dans le Channel Manager ; aucun e-mail ni rappel immédiat n’est promis.
