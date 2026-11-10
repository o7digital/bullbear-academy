# Bull Academy Studio

Site de validation : https://bullbear-academy-dev.vercel.app. Studio éditorial en espagnol : https://bull-academy-studio-dev.up.railway.app. Son interface reprend la structure de Nathalie Studio avec l'identité orange, crème et anthracite de l'académie. Directus 12.6.1, PostgreSQL 18 et le Studio Node sont hébergés dans le projet Railway `bull-academy-studio`, environnement **dev**. Les identifiants non sensibles sont dans `deployment.json`.

## Connexion et édition

Le compte initial utilise `ADMIN_EMAIL` du service Railway `directus`. Son mot de passe aléatoire est conservé uniquement dans `ADMIN_PASSWORD` de ce service. Récupérer les valeurs dans Railway, puis changer le mot de passe du profil Directus. Aucun identifiant d'un autre client n'est réutilisé. Un rôle `Bull Academy editor` permet de créer un compte client distinct, avec lecture/écriture des contenus et médias et lecture des commandes, sans accès à la configuration des services. L'adresse réelle du client doit être utilisée lors de sa création.

Les rubriques suivent le site : Inicio, Nosotros, Trading Club, Videos, Webinars, Guerra de Traders, Eventos, Cursos y tienda, Mentores, Contacto, Preguntas frecuentes, Privacidad et Textos generales e idiomas. Les textes du design, les descriptions officielles et les médias apparaissent dans leurs rubriques. Le logo est dans les réglages et l'image principale dans Inicio. Les cours et événements supplémentaires peuvent être créés dans leurs rubriques ; les nouvelles fiches sont des brouillons. L'archivage retire une fiche du prochain build.

Modifier les champs en espagnol puis choisir **Guardar y traducir**. Le serveur calcule les sept traductions (anglais, russe, chinois simplifié, allemand, italien, français et portugais brésilien) avant d'enregistrer le contenu et ses traductions ensemble dans une seule fiche Directus. Une erreur de traduction laisse le formulaire intact. Les traductions sont consultables avec le bouton `文`. Les noms, nombres, liens et formats sont protégés et contrôlés. Le serveur utilise l'API Responses avec une sortie JSON stricte et `store: false`, conformément à la [documentation officielle OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs). Le fournisseur de traduction existant est configuré côté serveur ; aucune clé n'est envoyée au navigateur.

**Publicar en dev** vérifie les traductions des fiches publiées puis appelle un Deploy Hook Vercel fixé à `dev`. Le message confirme la demande de publication ; le site est actualisé après la réussite du build. Un échec de CMS, de traduction ou de téléchargement conserve le dernier déploiement réussi. L'édition technique directe dans Directus ne traduit pas automatiquement les textes : utiliser le Studio. Après l'ajout de nouveaux textes dans le code, relancer le bootstrap puis traduire les nouvelles fiches avant publication.

Photos JPG, PNG, WebP et AVIF ; vidéos MP4 et WebM jusqu'à 250 Mo ; les vidéos YouTube utilisent leur identifiant de 11 caractères. Les fichiers uploadés sont privés dans Directus puis copiés sur Vercel au build lorsqu'une fiche publiée les référence. Le build exige au moins un cours publié. Une vidéo volumineuse allonge le build et consomme du stockage/bande passante ; il n'y a pas de transcodage adaptatif.

## Stripe : préparation des paiements de test

La boutique affiche les prix MXN relevés dans les données structurées du site source. Le champ de référence ne décide pas du montant débité. Dans Railway, service **bull-academy-studio**, environnement **dev**, ajouter :

- `STRIPE_SECRET_KEY` : clé secrète de **test** du compte Bull & Bear Academy (`sk_test_…`).
- `STRIPE_WEBHOOK_SECRET` : secret du webhook Stripe (`whsec_…`).
- `STRIPE_CHECKOUT_ENABLED=true` après configuration des prix et du webhook.

Configurer un endpoint Stripe de test :

```text
https://bull-academy-studio-dev.up.railway.app/commerce/webhook
```

Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. Créer les produits/prix ponctuels dans le compte Stripe de l'académie, puis renseigner le `price_…` et la monnaie `MXN` dans chaque cours du Studio. Le backend valide le prix actif, le mode test, la monnaie MXN, le caractère ponctuel et la correspondance exacte entre le prix Stripe et le prix affiché. Le navigateur fournit seulement l'identifiant du cours et la langue. Une redirection vers Stripe n'est pas une confirmation de commande ; seul le webhook signé enregistre l'état du paiement. Les événements répétés mettent à jour la même commande. Une notification tardive ne rétrograde pas une commande payée.

Le Studio affiche le statut des clés et les commandes de test. Les paiements restent désactivés tant que les clés manquent. Le code refuse les clés et événements de production dans cet environnement de validation. Le passage aux paiements réels nécessite une livraison distincte après validation, avec gestion des inscriptions, reçus et politique commerciale. Aucun compte élève ni accès automatique à une formation n'est créé par cette intégration.

## Configuration et sécurité

Le Studio utilise `DIRECTUS_URL`, `STUDIO_ORIGIN`, `STUDIO_SESSION_SECRET`, `STUDIO_CONTENT_TOKEN`, `STUDIO_PREVIEW_URL`, `OPENAI_API_KEY`, `TRANSLATION_MODEL` et `VERCEL_PREVIEW_DEPLOY_HOOK`, uniquement côté serveur. Les sessions sont chiffrées dans un cookie HttpOnly, Secure, SameSite Strict et renouvelées via Directus. Les écritures exigent l'origine du Studio. Les fichiers nécessitent une session. L'identité technique de commerce peut lire les contenus et écrire les commandes, sans accès d'administration.

Vercel reçoit seulement `DIRECTUS_URL`, `DIRECTUS_READ_TOKEN`, `PUBLIC_STUDIO_URL` et `PUBLIC_COMMERCE_URL`, pour **Preview / branche dev**. Le jeton de build dispose uniquement de la lecture des contenus et fichiers. Le palier Directus utilisé applique des permissions par collection ; le loader serveur filtre les fiches publiées. Aucun jeton n'est exposé dans les fichiers publics du site. Les variables Production n'ont pas été raccordées au CMS.

PostgreSQL et `/directus/uploads` ont chacun un volume persistant. Directus utilise `RAILWAY_RUN_UID=0` pour pouvoir écrire dans le volume, conformément à la configuration Railway des images utilisant un utilisateur non-root. Les sauvegardes natives Railway **quotidiennes et hebdomadaires** sont activées pour les deux volumes. Les bases et secrets de Nathalie Studio sont indépendants. Seule la configuration du fournisseur de traduction partagé a été reprise.

## Développement et vérification

```sh
npm --prefix cms/studio ci
npm --prefix cms/studio run check
npm --prefix cms/studio test
npm test
npm run build
```

Sans `DIRECTUS_URL`, le frontend utilise ses données locales ; `.env.example` décrit la connexion au CMS. `cms/sync.mjs` génère un instantané privé de build et copie les médias référencés sous `public/_cms/`. Ces sorties sont ignorées par Git. Ne pas exécuter le build local sans ses variables CMS avant un déploiement précompilé destiné à utiliser le contenu du Studio.

Le bootstrap est réexécutable : il ajoute les fiches et permissions manquantes, sans écraser les éditions. Les scripts `bootstrap.mjs`, `reconcile-source.mjs` et `translate-import.mjs` refusent une autre URL CMS que celle de Bull Academy dev. Ils doivent être exécutés avec les secrets du bon service, sans les afficher. L'import en lecture seule du site original se trouve dans `scripts/import-source.py` et exige Beautiful Soup 4.

Le dépôt ne possédait ni `main` ni `dev` à la réception de cette tâche. `dev` a été créée depuis `setup/astro-preview` au commit `e88bfa9`. Aucune fusion de `main` n'a pu être effectuée car la branche n'existe pas sur le remote.

## Vidéo de l’accueil

Le bandeau vidéo d’origine (`zT8i84q4kDk`, chaîne officielle Bull & Bear) est intégré entre la définition du trading et le Trading Club dans les huit langues. Le Studio le présente dans **Inicio → Vídeo principal · Trading Club**. La fiche conserve son identifiant stable lors du remplacement par une autre vidéo YouTube ou un upload MP4/WebM. La lecture commence sans son à l’approche du bandeau ; les contrôles restent disponibles et la préférence système de réduction des animations désactive le démarrage automatique. Archiver cette fiche retire le bandeau du prochain build.
