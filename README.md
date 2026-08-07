# Oyhana Budget

Application de suivi de finances personnelles et communes — Next.js + Supabase.

## 1. Configurer le backend (Supabase) — gratuit

### 1.1 Créer le compte et le projet

1. Va sur **https://supabase.com** → bouton **Start your project** (en haut à droite).
2. Connecte-toi avec GitHub, Google, ou un email (crée un compte si besoin, c'est gratuit).
3. Une fois dans le tableau de bord, clique sur **New Project** (bouton vert).
4. Si c'est ton tout premier projet, Supabase te demande d'abord de créer une **Organization** :
   - Name : ce que tu veux (ex : "Perso")
   - Type : "Personal"
   - Plan : **Free**
   - Clique **Create organization**
5. Tu arrives ensuite sur le formulaire de création du projet :
   - **Name** : `oyhana-budget`
   - **Database Password** : clique sur "Generate a password" ou choisis-en un — **copie-le et garde-le de côté** (tu n'en auras normalement plus besoin après, mais mieux vaut l'avoir sous la main)
   - **Region** : choisis `Europe (Frankfurt)` ou `Europe (Paris)` si disponible — c'est la région du serveur, pas obligatoire mais plus rapide pour vous
   - **Pricing Plan** : laisse **Free**
   - Clique **Create new project**
6. Supabase met environ **1 à 2 minutes** à provisionner le projet (barre de progression "Setting up project..."). Attends que ça affiche le tableau de bord du projet avant de continuer.

### 1.2 Exécuter le script SQL (crée les tables et les données de départ)

C'est l'étape où tu es bloqué — voici le détail complet :

1. Dans le menu de gauche de ton projet Supabase, cherche l'icône **SQL Editor** (icône qui ressemble à `</>` ou à une console). Clique dessus.
2. Tu arrives sur une page avec un bouton **"+ New query"** en haut — clique dessus. Ça ouvre un éditeur de texte vide avec un bandeau noir.
3. Ouvre le fichier `supabase/schema.sql` qui est dans le dossier du projet que je t'ai donné (avec VS Code, le Bloc-notes, ou n'importe quel éditeur de texte).
4. **Sélectionne tout le contenu du fichier** (Ctrl+A puis Ctrl+C) et **colle-le** (Ctrl+V) dans l'éditeur SQL de Supabase, en remplaçant tout ce qu'il y avait dedans si besoin.
5. En bas à droite de l'éditeur, clique sur le bouton **"Run"** (ou `Ctrl+Enter` / `Cmd+Enter`).
6. Si tout se passe bien, tu verras en bas un message vert du type **"Success. No rows returned"**. C'est normal — le script crée des tables, il ne "retourne" pas de résultat à afficher.

**Ce que fait exactement ce script**, dans l'ordre :
- Il crée l'extension `pgcrypto` (nécessaire pour générer des identifiants uniques)
- Il crée 4 tables : `profiles`, `categories`, `transactions`, `fixed_charges`
- Il insère automatiquement dedans : les 3 profils (Profil 1, Profil 2, Commun), les 16 catégories, et les charges fixes que tu m'avais données (loyer, prêts, assurances, etc.)
- Il active la sécurité (Row Level Security) pour que seules les personnes connectées puissent lire/écrire les données

**Pour vérifier que ça a bien fonctionné :** dans le menu de gauche, clique sur **Table Editor**. Tu dois voir apparaître les 4 tables (`profiles`, `categories`, `transactions`, `fixed_charges`) dans la liste à gauche. Clique sur `profiles` : tu dois voir 3 lignes (`profil1`, `profil2`, `commun`). Clique sur `fixed_charges` : tu dois voir 12 lignes.

### 1.3 Créer vos deux comptes utilisateurs

1. Dans le menu de gauche, va dans **Authentication** → onglet **Users**.
2. Clique sur **Add user** (en haut à droite) → **Create new user**.
3. Renseigne un email et un mot de passe pour la première personne.
4. **Coche bien la case "Auto Confirm User"** avant de valider — sinon Supabase attend une validation par email que vous n'avez pas configurée, et la connexion échouera.
5. Clique **Create user**.
6. Répète l'opération pour la deuxième personne.

### 1.2bis Si tu avais déjà exécuté une ancienne version de `schema.sql`

Si ton appli a déjà des transactions, catégories, etc. depuis une version précédente (avant les transferts internes P1/P2/Commun et les groupes 50/30/20), exécute en plus le fichier **`supabase/migration_v2.sql`** :

1. **SQL Editor → New query**
2. Colle le contenu de `supabase/migration_v2.sql`
3. **Run**

Ce script est rejouable sans risque et n'affecte pas tes données existantes — il ajoute uniquement les nouvelles colonnes (`contrepartie_profile_id`, `groupe`, `budget_max`, etc.).

Si tu avais déjà exécuté `migration_v2.sql` (les charges fixes n'avaient pas encore de catégorie), exécute aussi **`supabase/migration_v3.sql`** de la même façon. Sans ça, tes charges fixes (loyer, assurances, abonnements...) n'apparaîtront pas dans l'analyse par catégorie ni dans le 50/30/20 de l'onglet Budgets — pense ensuite à leur assigner une catégorie depuis l'onglet **Charges fixes**.

Exécute aussi **`supabase/migration_v4.sql`** de la même façon. Elle ajoute la possibilité de marquer une charge fixe comme "contribution interne" (ex : "Participation loyer commun" de P1 vers Commun), pour éviter qu'elle soit comptée deux fois dans le 50/30/20 (une fois côté P1, une fois côté Commun qui reçoit). Pense à cocher ça sur les 2 "Participation loyer commun" (P1 et P2) depuis l'onglet Charges fixes après la migration.

### 1.4 Récupérer les clés d'API

1. Dans le menu de gauche, clique sur l'icône d'engrenage **Project Settings**, puis sur **API** (dans la sous-catégorie "Configuration" ou "Data API" selon la version de l'interface).
2. Note deux valeurs :
   - **Project URL** — ressemble à `https://abcdefghijk.supabase.co`
   - **anon public** (sous "Project API keys") — une longue chaîne qui commence par `eyJ...`

Ce sont les deux valeurs à mettre dans le frontend (étape suivante). Ne prends jamais la clé `service_role` pour le frontend — elle donne un accès total et ne doit jamais être exposée dans une app.

### 1.5 En cas d'erreur au moment du "Run" du script SQL

- **`extension "pgcrypto" does not exist` ou erreur de permission** : c'est rare sur Supabase (l'extension est en général déjà disponible), mais si ça arrive, va dans **Database → Extensions** dans le menu de gauche, cherche `pgcrypto` et active-le manuellement, puis relance le script.
- **`relation "profiles" already exists"` ou erreurs "already exists"** : ça veut dire que tu as déjà exécuté le script une première fois (même partiellement). Ce n'est pas grave, le script est conçu pour être rejouable (`on conflict do nothing`, `if not exists`) — tu peux l'exécuter à nouveau sans risque, les données existantes ne seront pas dupliquées.
- **Rien ne se passe / le bouton "Run" est grisé** : vérifie que tu as bien collé du texte dans l'éditeur, et que tu es toujours dans le bon projet (le nom du projet est affiché en haut à gauche).
- **Le script tourne mais tu ne vois aucune table dans "Table Editor"** : rafraîchis la page du navigateur (F5), l'interface met parfois quelques secondes à se synchroniser.

Si tu as un message d'erreur précis qui reste bloquant, copie-le moi tel quel et je te dis exactement quoi faire.

## 2. Configurer le frontend en local (VS Code)

1. Ouvre ce dossier `oyhana-budget` dans VS Code.
2. Copie `.env.local.example` vers un nouveau fichier `.env.local`, et remplis-le avec tes valeurs Supabase :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. Installe les dépendances puis lance le serveur de dev :
   ```
   npm install
   npm run dev
   ```
4. Ouvre **http://localhost:3000** — tu devrais voir la page de connexion. Connecte-toi avec l'un des comptes créés à l'étape 1.4.

## 3. Déployer gratuitement (Vercel)

Cette étape rend ton appli accessible en permanence sur internet (même PC éteint, même VS Code fermé), sur une adresse type `oyhana-budget.vercel.app`.

### 3.1 Installer Git (si ce n'est pas déjà fait)

1. Vérifie si tu l'as déjà : ouvre un terminal et tape `git --version`. Si un numéro de version s'affiche, passe directement à 3.2.
2. Sinon, télécharge-le sur **https://git-scm.com/downloads**, lance l'installeur, laisse toutes les options par défaut ("Suivant" partout).
3. Redémarre ton terminal (ou VS Code) après l'installation, puis revérifie avec `git --version`.
4. Si c'est la première fois que tu utilises Git sur ce PC, configure ton identité (une seule fois, sert juste à signer tes commits) :
   ```
   git config --global user.name "Ton Nom"
   git config --global user.email "ton.email@exemple.com"
   ```

### 3.2 Créer un compte GitHub et un dépôt (repo) vide

1. Va sur **https://github.com** et crée un compte si tu n'en as pas (gratuit).
2. Une fois connecté, clique sur le **+** en haut à droite → **New repository**.
3. Renseigne :
   - **Repository name** : `oyhana-budget`
   - **Visibility** : choisis **Private** (recommandé — tes données Supabase restent protégées par tes clés de toute façon, mais autant garder le code privé aussi)
   - **Ne coche AUCUNE case** parmi "Add a README", "Add .gitignore", "Choose a license" — le dépôt doit rester complètement vide, on a déjà tout ça dans le projet.
4. Clique **Create repository**. GitHub affiche une page avec des commandes — garde cette page ouverte, tu vas avoir besoin de l'URL du dépôt (en haut, du type `https://github.com/ton-pseudo/oyhana-budget.git`).

### 3.3 Envoyer le code sur GitHub (`git init`, `add`, `commit`, `push`)

Dans VS Code, ouvre un terminal (**Terminal → New Terminal**) à la racine du dossier `oyhana-budget`, et lance ces commandes **une par une** :

```
git init
git add .
git commit -m "Premier envoi de Oyhana Budget"
git branch -M main
git remote add origin https://github.com/ton-pseudo/oyhana-budget.git
git push -u origin main
```

**Remplace bien `ton-pseudo` par ton propre nom d'utilisateur GitHub** (visible dans l'URL copiée à l'étape 3.2.4).

Détail de ce que fait chaque commande :
- `git init` : transforme le dossier en dépôt Git (une seule fois, jamais à refaire)
- `git add .` : prépare tous les fichiers du dossier à être envoyés (le `.gitignore` du projet exclut automatiquement `node_modules`, `.next` et surtout `.env.local` — tes clés Supabase ne partent jamais sur GitHub, c'est voulu)
- `git commit -m "..."` : crée un instantané du code avec un message descriptif
- `git branch -M main` : nomme la branche principale `main` (standard actuel)
- `git remote add origin ...` : relie ton dossier local au dépôt GitHub vide créé à l'étape 3.2
- `git push -u origin main` : envoie réellement le code sur GitHub

Au moment du `push`, une fenêtre peut s'ouvrir te demandant de te connecter à GitHub (navigateur ou popup "Sign in with your browser") — accepte, ça authentifie ton terminal une bonne fois pour toutes.

**Pour vérifier que ça a marché :** rafraîchis la page de ton dépôt sur github.com — tu dois voir tous les fichiers du projet (`app/`, `components/`, `package.json`, etc.) au lieu de la page vide.

### 3.4 Connecter le dépôt à Vercel

1. Va sur **https://vercel.com** → **Sign Up** (ou **Log In** si tu as déjà un compte).
2. Choisis **Continue with GitHub** — c'est le plus simple, ça lie directement les deux comptes.
3. Autorise Vercel à accéder à GitHub si demandé (tu peux limiter l'accès à certains dépôts seulement si tu préfères, en choisissant "Only select repositories" et en cochant `oyhana-budget`).
4. Une fois sur le tableau de bord Vercel, clique **Add New...** (en haut à droite) → **Project**.
5. Dans la liste des dépôts GitHub qui s'affiche, trouve `oyhana-budget` et clique **Import** à côté.

### 3.5 Configurer les variables d'environnement

C'est l'étape la plus importante — sans elle, le site se déploiera mais affichera une erreur car il ne pourra pas se connecter à Supabase.

1. Sur la page de configuration du projet (juste après l'import), déroule la section **Environment Variables**.
2. Ajoute une première variable :
   - **Name** : `NEXT_PUBLIC_SUPABASE_URL`
   - **Value** : colle l'URL de ton projet Supabase (ex : `https://xxxxx.supabase.co`), la même que dans ton `.env.local`
   - Clique **Add**
3. Ajoute la deuxième variable de la même façon :
   - **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value** : colle ta clé `anon public`, la même que dans ton `.env.local`
   - Clique **Add**
4. Vérifie qu'il n'y a pas d'espace avant/après les valeurs collées (erreur fréquente en copiant-collant).

Astuce : ouvre ton fichier `.env.local` dans VS Code à côté pour copier-coller les valeurs exactes plutôt que de les retaper.

### 3.6 Déployer

1. Clique le bouton **Deploy**.
2. Vercel installe les dépendances et lance le build — ça prend en général 1 à 3 minutes. Tu vois les logs défiler en direct.
3. Si tout se passe bien, un écran de confirmation avec confettis 🎉 s'affiche, avec un aperçu de ton site et un bouton **Continue to Dashboard** (ou **Visit**).
4. Clique dessus, ou récupère l'URL affichée en haut (du type `oyhana-budget-xxxx.vercel.app`) — c'est l'adresse permanente de ton appli, valable depuis n'importe quel appareil connecté à internet.

### 3.7 Mettre à jour le site après une modification

Une fois déployé, tu n'as plus besoin de repasser par l'interface Vercel pour chaque changement. Dans VS Code, après avoir modifié des fichiers :

```
git add .
git commit -m "Description du changement"
git push
```

Vercel détecte automatiquement le nouveau `push` sur GitHub et redéploie tout seul en 1-2 minutes.

### 3.8 En cas d'erreur

- **Le build Vercel échoue avec une erreur liée à Supabase / "supabaseUrl is required"** : les variables d'environnement de l'étape 3.5 sont manquantes ou mal orthographiées. Va dans **Project Settings → Environment Variables** sur Vercel, vérifie les noms exacts (`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sensibles à la casse), puis relance un déploiement depuis l'onglet **Deployments → ⋯ → Redeploy**.
- **`git push` demande un mot de passe et le refuse** : GitHub n'accepte plus les mots de passe classiques pour `git push` depuis un terminal. Laisse la fenêtre d'authentification par navigateur s'ouvrir (méthode recommandée), ou installe **GitHub Desktop** (https://desktop.github.com) qui gère l'authentification automatiquement si le terminal pose problème.
- **`git remote add origin` renvoie "remote origin already exists"** : tu as déjà lié un remote précédemment. Remplace-le avec `git remote set-origin origin https://github.com/ton-pseudo/oyhana-budget.git` (ou `git remote rm origin` puis relance la commande `add`).
- **Le site s'affiche mais reste bloqué sur "Chargement..."** : ouvre la console du navigateur (F12 → onglet Console) sur le site déployé pour voir l'erreur exacte, et vérifie que les valeurs des variables d'environnement collées sur Vercel sont identiques à celles de Supabase (Project Settings → API).
- **Erreur 404 sur la page de login uniquement** : rare, généralement lié à un ancien cache — fais un rafraîchissement forcé (Ctrl+F5) ou redéploie.

Si un message d'erreur précis persiste, copie-le moi tel quel.

Coût total : **0 €/mois** pour un usage à deux (Supabase et Vercel ont des paliers gratuits largement suffisants).

## Structure du projet

```
app/
  page.js              → Tableau de bord (vue mensuelle/annuelle, graphiques)
  login/page.js         → Connexion Supabase Auth
  transactions/page.js  → CRUD revenus & dépenses
  charges/page.js       → CRUD charges fixes par profil
  budgets/page.js       → Définition et suivi des budgets mensuels
  categories/page.js    → CRUD catégories
  historique/page.js    → Filtres + export CSV / Excel
components/              → Sidebar, navigation mobile, UI partagée, auth, thème
lib/
  supabaseClient.js      → Client Supabase
  helpers.js             → Formatage, calculs, export CSV
supabase/schema.sql       → Script SQL complet à exécuter dans Supabase
```

## Fonctionnalités clés (v2)

**Transferts internes** — Quand tu ajoutes une dépense chez P1 avec destination "Commun", une écriture miroir (revenu de même montant/catégorie/date) est créée automatiquement chez Commun, et inversement. Modifier ou supprimer l'une des deux met à jour/supprime l'autre.

**Règle 50/30/20** (onglet Budgets) — Basée sur les revenus catégorie "Salaire" de P1 + P2 du mois. Trois colonnes (Besoins essentiels / Envies / Épargne) affichent l'objectif en euros, et tu peux classer chaque catégorie dans un groupe + lui donner un budget max estimé (commun au foyer). Une analyse compare ensuite les dépenses réelles de chaque catégorie à son budget max.

**Transactions internes vs externes** (onglet Budgets) — Statistiques du mois séparant dépenses/revenus "Externe" des transferts entre profils.

**Paramètres** — Prénoms de P1/P2 modifiables (le libellé "P1 - Prénom" suit automatiquement), et deux réinitialisations séparées : mouvements (par profil + mois) et charges fixes (par profil) / budgets par catégorie (global).

**Exports** — Dashboard et Historique exportables en image (PNG). Historique exportable en CSV, Excel (vrai .xlsx) et PDF (tableau).

## Prochaines évolutions possibles

- Comptes bancaires / import CSV bancaire
- Objectifs d'épargne
- Notifications de dépassement de budget
- Analyse par IA des tendances de dépenses

Ces évolutions sont facilitées par le choix de Supabase (PostgreSQL), plus évolutif que Firebase pour ce type de besoins.
