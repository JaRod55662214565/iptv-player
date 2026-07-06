# Web TV — IPTV Player

Application Web TV IPTV avec détection IP, protection VPN, notifications Telegram, intégration Stripe Checkout (Paywall) et panneau d'administration.

## Fonctionnalités

- **Lecture IPTV/Radio :** Support des flux HLS (M3U8), MP4, WebM, TS, DASH avec Video.js.
- **Paywall Premium (Stripe Checkout) :**
  - Accès Premium à vie pour **4.99 €** unique.
  - Option d'accès gratuit alternatif avec publicité (`Continuer gratuitement avec publicités`) discrètement placée.
- **Sécurisation Anti-Hack :** Validation stricte de l'IP côté serveur sur chaque connexion. Suppression automatique de toute modification frauduleuse de clé locale dans le navigateur.
- **Gestion Manuelle Premium :**
  - Directement depuis le **Panel Admin** (nouvel onglet Premiums, ou bouton rapide dans Visites).
  - En un clic via **Telegram** grâce à des boutons interactifs en ligne sur les messages de notifications.
- **Limitation du Spam & Anti-Flood :**
  - Cache en mémoire des notifications Telegram (max 1 alerte toutes les 30 minutes par IP).
  - Pas de notification Telegram pour les utilisateurs déjà Premium.
- **Publicités maîtrisées :** Injection du tag de pub popunder (`quge5.com`) uniquement après validation physique du captcha, limité à **une fois toutes les 24 heures** par visiteur.
- **Détection géographique & VPN :**
  - Recherche géographique via ip-api.com côté serveur.
  - Blocage automatique des serveurs de datacenters / bots / proxys (blocklist de 65k+ plages CIDR) avec redirection automatique vers Wikipédia (les utilisateurs Premium sont exclus de ce blocage).
- **Accès Sécurisé Admin :** Captcha mathématique obligatoire sur l'écran d'authentification admin `/panel` avant de saisir le mot de passe.

## Déploiement

1. Copier `.env.example` vers `.env` et remplir les tokens (Stripe API, Telegram Bot, Admin Password)
2. `npm install`
3. `npm run build`
4. Lancer `server.js` (port 3001)
5. Servir `dist/` avec Nginx (voir `deploy/nginx.conf`)

## Routes d'API Administration

- `POST /api/admin/auth` — `{"password":"..."}` → Connexion & Token JWT
- `GET /api/admin/visits` — Liste des dernières visites
- `GET /api/admin/bans` — Liste des IPs bannies
- `POST /api/admin/ban` — `{"ip":"...", "reason":"..."}` → Bannir une IP
- `POST /api/admin/unban` — `{"ip":"..."}` → Débannir une IP
- `GET /api/admin/premiums` — Liste des IPs Premium actives
- `POST /api/admin/make-premium` — `{"ip":"..."}` → Accorder l'accès Premium
- `POST /api/admin/remove-premium` — `{"ip":"..."}` → Retirer l'accès Premium

## Routes d'API Publiques

- `POST /api/telegram` — Enregistre la visite et notifie Telegram si nécessaire
- `POST /api/telegram-webhook` — Gère les callbacks boutons interactifs (`unban_[IP]`, `premium_[IP]`)
- `POST /api/stripe/checkout-session` — Initialise la session de paiement à 4.99 €
