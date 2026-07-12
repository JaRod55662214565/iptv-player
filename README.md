# Web TV — IPTV Player

Application Web TV IPTV avec détection IP, blocage VPN/proxy, notifications Telegram, intégration Stripe (paywall premium), panneau d'administration complet, et architecture backend modulaire.

## Stack

- **Frontend** : Vue 3 + Vite 4 + Pinia + Video.js
- **Backend** : Node.js HTTP natif (zéro framework), modularisé en `server/`
- **Paiement** : Stripe Checkout (4,99 € accès à vie)
- **Notifications** : Bot Telegram avec boutons inline (unban, premium, push ad)
- **Anti-abus** : Captcha mathématique, blocage VPN/datacenter (65k+ plages CIDR), rate-limiting
- **Stockage** : Fichiers JSON dans `data/` (visites, bans, whitelist, premiums)

## Fonctionnalités

- **17 chaînes épinglées** : Generations TV, MTV Classics, One Piece, M6, Trace LATINA/CARIBBEAN/AFRICA FR/URBAN FR/VANILLA/TERANGA/SPORT STARS/NAIJA/MZIKI/BRAZUCA/TOCA/GOSPEL/NGOMA
- **FIFA+ French** : auto-promu en haut de liste si présent dans la playlist (Coupe du Monde 2026)
- **Auto-refresh M3U** : cache disque toutes les 6h (`data/playlist-cache.json`)
- **Proxy stream** : `/api/proxy/stream/{id}` avec SSRF protection, rate-limiting, taille max configurable
- **Admin panel** (`/panel`) : 7 onglets — Visites, Bannis, Premiums, ASN, Fonctions, Telegram, Pays
- **Chat ID masqué** : les identifiants Telegram sont masqués dans l'admin (`7413****21`)
- **Notifications Telegram** : envoi automatique de l'IP de connexion au bot
- **Favoris** : persistance par IP avec protection CSRF
- **Anti-abus** : rate-limiting par endpoint, validation JSON globale (safeParse), CORS strict

## Architecture

```
webtv/
├── server/               # Backend modulaire
│   ├── index.js          # Point d'entrée, routage des handlers
│   ├── config.js         # Variables d'environnement, chemins
│   ├── state.js          # État mémoire partagé (bans, premiums, visites...)
│   ├── storage.js        # Lecture/écriture JSON avec lock
│   ├── validation.js     # Validation des ENV au démarrage
│   ├── lib/utils.js      # Utilitaires (safeParse, badJson, checkRateLimit, isPrivateIP...)
│   ├── services/
│   │   ├── telegram.js   # Notifications, webhook, callbacks inline
│   │   └── geo.js        # GeoIP (ip-api.com), téléchargement blocklist
│   └── routes/
│       ├── admin.js      # Authentification, CRUD bans/premiums/visites/functions/countries
│       ├── tracking.js   # Enregistrement visites, canal, captcha, notify-iptv
│       ├── stripe.js     # Session checkout + webhook Stripe
│       ├── premium.js    # Vérification statut premium côté serveur
│       ├── ads.js        # Statistiques pubs, push ad
│       ├── favorites.js  # Favoris par IP (GET/POST avec CSRF)
│       ├── proxy.js      # Proxy stream avec SSRF protection + rate-limiting
│       └── playlist.js   # Proxy M3U, auto-refresh, cache disque
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
pm2 start server/index.js --name webtv
```

Servir `dist/` avec Nginx (voir `deploy/nginx.conf`).

## Variables d'environnement

### Serveur (requis)

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
| `PLAYLIST_USER` | Non | Basic Auth pour la playlist M3U |
| `PLAYLIST_PASSWORD` | Non | Basic Auth pour la playlist M3U |

### Rate-limiting (optionnel)

| Variable | Défaut | Description |
|---|---|---|
| `PROXY_RATE_LIMIT` | 100 | Max requêtes proxy par minute/IP |
| `PROXY_BODY_SIZE_LIMIT_MB` | 50 | Taille max du body proxy en MB |
| `PROXY_ALLOWED_PORTS` | 80,443 | Ports autorisés pour le proxy |
| `TRACKING_RATE_LIMIT` | 60 | Max requêtes tracking par minute/IP |
| `CAPTCHA_RATE_LIMIT` | 10 | Max tentatives captcha par minute/IP |
| `STRIPE_RATE_LIMIT` | 5 | Max requêtes Stripe checkout par minute/IP |

### Client (Vite)

| Variable | Défaut | Description |
|---|---|---|
| `VITE_MONETAG_SITE_ID` | | ID site Monetag pour monétisation |
| `VITE_MONETAG_ENABLED` | false | Activer Monetag |
| `VITE_POPUNDER_SRC` | `https://quge5.com/88/tag.min.js` | Script popunder |
| `VITE_POPUNDER_ZONE` | 256724 | Zone publicitaire popunder |
| `VITE_IP_API_TIMEOUT` | 5000 | Timeout IP API en ms |

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
| GET | `/api/admin/functions` | Lire les fonctions activées/désactivées |
| POST | `/api/admin/functions` | Modifier les fonctions (allowVpn, allowProxy, allowTor) |
| GET | `/api/admin/countries` | Lire la liste des pays autorisés/bloqués |
| POST | `/api/admin/countries` | Modifier la liste des pays |
| GET | `/api/admin/asn` | Lire les ASN bloqués |
| POST | `/api/admin/asn/add` | Ajouter un ASN au blocage |
| POST | `/api/admin/asn/remove` | Retirer un ASN du blocage |
| GET | `/api/admin/telegram-status` | Statut du webhook Telegram (chat IDs masqués) |
| POST | `/api/admin/push-ad` | Déclencher un push ad |

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
| POST | `/api/notify-iptv` | Notifier la connexion IPTV (rate-limité 5/60s) |
| POST | `/api/playlist.m3u` | Proxy M3U avec Basic Auth optionnel |
| GET | `/api/proxy/stream/{id}` | Proxy de flux vidéo (SSRF protection) |
| GET | `/api/favorites` | Récupérer les favoris de l'IP |
| POST | `/api/favorites` | Sauvegarder les favoris (CSRF requis) |

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
- **Rate-limiting** : 5 tentatives de connexion admin par minute par IP + rate-limiting par endpoint
- **Premium** : vérifié côté serveur par IP — aucun contournement client possible
- **Env vars** : validées au démarrage, arrêt immédiat si une variable critique manque
- **Webhook Telegram** : sécurisé par secret token optionnel
- **Webhook Stripe** : vérification de la signature
- **Anti-bot** : blocage VPN/proxy/datacenter par blocklist CIDR + ip-api.com
- **JSON parsing** : validation globale via `safeParse()` avec gestion des erreurs (crash-proof)
- **CSRF** : protection des routes POST sensibles via header `X-Requested-With`
- **SSRF** : protection contre les requêtes vers les IP privées dans le proxy

## Licence

MIT
