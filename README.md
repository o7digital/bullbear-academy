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

Astro génère les 44 pages statiques dans `dist/`. Vercel utilise la configuration de `vercel.json`.

## Périmètre

La maquette conserve volontairement `noindex,nofollow` et les mentions de proposition. Le formulaire prépare un message WhatsApp que le visiteur peut vérifier avant de l'envoyer. Aucun paiement, CRM ou compte élève n'est connecté.

Consulter [les consignes de livraison](INSTRUCTIONS-CODEX.md) et [les sources](SOURCES.md). Le domaine officiel et ses DNS ne doivent pas être modifiés pour cette présentation.

## Langues

La version espagnole reste à la racine et la version anglaise se trouve sous `/en/`. Le sélecteur ES / EN mène à la page équivalente, y compris pour les douze cours.

Les deux langues partagent les composants et les mises en page. Les traductions sont dans `src/i18n/en.json` ; les correspondances des routes et des fiches de cours sont dans `src/i18n/index.ts`. Les URLs officielles externes conservent leur destination d’origine.
