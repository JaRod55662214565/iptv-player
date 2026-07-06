# Web TV — IPTV Player

Application Web TV IPTV avec détection IP, blocage VPN/proxy, notifications Telegram, intégration Stripe (paywall premium), panneau d'administration et architecture backend modulaire.

## Stack

- **Frontend** : Vue 3 + Vite 4 + Pinia + Video.js
- **Backend** : Node.js HTTP natif (zéro framework), modularisé en `server/`
- **Paiement** : Stripe Checkout (4,99 € accès à vie)
- **Notifications** : Bot Telegram avec boutons inline (unban, premium, push ad)
- **Anti-abus** : Captcha mathématique, blocage VPN/datacenter (65k+ plages CIDR), rate-limiting
- **Stockage** : Fichiers JSON dans `data/` (visites, bans, whitelist, premiums)

## Architecture

```
webtv/
├── server/               # Backend modulaire
│   ├── index.js          # Point d'entrée, routage des handlers
│   ├── config.js         # Variables d'environnement, chemins
│   ├── state.js          # État mémoire partagé (bans, premiums, visites...)
│   ├── storage.js        # Lecture/écriture JSON avec lock
│   ├── validation.js     # Validation des ENV au démarrage
│   ├── lib/utils.js      # Utilitaires (parseUA, getClientIP, escapeHTML...)
│   ├── services/
│   │   ├── telegram.js   # Notifications, webhook, callbacks inline
│   │   └── geo.js        # GeoIP (ip-api.com), téléchargement blocklist
│   └── routes/
│       ├── admin.js      # Authentification, CRUD bans/premiums/visites
│       ├── tracking.js   # Enregistrement visites, canal, captcha
│       ├── stripe.js     # Session checkout + webhook Stripe
│       ├── premium.js    # Vérification statut premium côté serveur
│       └── ads.js        # Statistiques pubs, push ad
├── src/                  # Frontend Vue 3
├── data/                 # Données runtime (gitignoré sauf .gitkeep)
├── deploy/               # Déploiement (Nginx, VPS)
└── docs/                 # Documentation
```

## Démarrage rapide

```bash
cp .env.example .env        # Remplir les tokens
npm install
npm run build               # Build frontend
npm start                   # Lance le serveur (port 3001)
```

Servir `dist/` avec Nginx (voir `deploy/nginx.conf`).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Oui | Token du bot Telegram (créer via @BotFather) |
| `TELEGRAM_CHAT_ID` | Oui | Chat ID pour les notifications |
| `ADMIN_PASSWORD` | Oui | Mot de passe du panneau admin `/panel` |
| `STRIPE_SECRET_KEY` | Oui | Clé secrète Stripe (`sk_test_*` ou `sk_live_*`) |
| `STRIPE_WEBHOOK_SECRET` | Non (recommandé) | Secret du webhook Stripe (`whsec_*`) |
| `SITE_URL` | Oui | URL publique du site |
| `WEBHOOK_URL` | Non | URL pour le webhook Telegram (par défaut = `SITE_URL`) |
| `TELEGRAM_WEBHOOK_SECRET` | Non | Sécurisation du webhook Telegram (32+ caractères) |
| Voir `.env.example` pour les variables optionnelles (Monetag, popunder...)

## Routes API

### Admin (authentification par token avec expiration 24h)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/admin/auth` | Connexion → retourne un token |
| POST | `/api/admin/logout` | Invalidation du token |
| GET | `/api/admin/visits` | Liste des dernières visites |
| GET | `/api/admin/bans` | Liste des IPs bannies |
| POST | `/api/admin/ban` | Bannir une IP |
| POST | `/api/admin/unban` | Débannir une IP (ajoute à la whitelist) |
| GET | `/api/admin/premiums` | Liste des IPs premium |
| POST | `/api/admin/make-premium` | Ajouter une IP premium |
| POST | `/api/admin/remove-premium` | Retirer une IP premium |
| GET | `/api/admin/ads-stats` | Statistiques des publicités |

### Publiques

| Méthode | Route | Description |
|---|---|---|
| POST | `/` ou `/api/telegram` | Enregistre une visite, retourne le statut IP |
| GET | `/api/check-premium` | Vérifie si l'IP du client est premium |
| POST | `/api/stripe/checkout-session` | Crée une session Stripe à 4,99 € |
| POST | `/api/stripe/webhook` | Webhook Stripe (confirmation paiement) |
| POST | `/api/telegram-webhook` | Webhook Telegram (messages, callbacks) |
| POST | `/api/ads/shown` | Enregistre une impression publicitaire |
| GET | `/api/ads/push-status` | Statut du push ad en cours |
| POST | `/api/ads/trigger-push` | Déclencher un push ad manuellement |
| POST | `/api/captcha/failed` | Notifier un échec captcha |
| POST | `/api/telegram/channel` | Notifier un changement de chaîne |

## Bot Telegram

Commandes disponibles via le bot :

| Commande | Description |
|---|---|
| `/ip [adresse]` | Infos IP (pays, ville, FAI) avec lien Google Maps |
| `/list` | Liste les IPs connectées (admin only — IP whitelistée requise) |
| `/stats` | Statistiques : visites, appareils, navigateurs, OS, pays, chaînes, bans, premiums, pubs |
| `/admin` | Menu inline : Stats, List IPs, Push Ad, Panel Web, Refresh |

Les notifications de visite sont envoyées automatiquement au chat configuré avec le pays, la ville et un lien Google Maps.

## Sécurité

- **Token admin** : généré aléatoirement (20 bytes hex), stocké en mémoire avec expiration 24h + endpoint logout
- **CORS** : restreint au `SITE_URL` configuré
- **Rate-limiting** : 5 tentatives de connexion admin par minute par IP
- **Premium** : vérifié côté serveur par IP — aucun contournement client possible
- **Env vars** : validées au démarrage, arrêt immédiat si une variable critique manque
- **Webhook Telegram** : sécurisé par secret token optionnel
- **Webhook Stripe** : vérification de la signature
- **Anti-bot** : blocage VPN/proxy/datacenter par blocklist CIDR + ip-api.com

## Licence

MIT
