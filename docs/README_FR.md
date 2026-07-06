# 🎬 WEB IPTV - LECTEUR IPTV AVEC MONETAG + TELEGRAM BOT

Lecteur IPTV Web moderne en **Vue 3** avec **authentification Supabase**, **monétisation Monetag**, **tracking Telegram** et **blocage anti-bot VPN/Proxy**.

---

## 🌟 CARACTÉRISTIQUES

### ✅ Core Features
- 📺 Lecteur vidéo moderne (Video.js)
- 🔐 Authentification complète (inscription/connexion)
- 🌍 10,000+ chaînes IPTV (iptv-org.github.io)
- 🎙️ Support Radio (détection auto)
- 📱 Responsive design (mobile/tablet/desktop)
- 🌐 Multilingue (FR/EN)
- 🎨 Dark mode par défaut

### 💰 Monétisation
- 💵 Intégration **Monetag** complète
- 📊 Annonces top + bottom + sidebar
- 🎯 Gestion intelligente des emplacements
- 📈 Analytics en temps réel

### 🤖 Sécurité & Tracking
- 🚫 **Anti-bot automatique** (détecte VPN/Proxy/Datacenter)
- 📍 **IP Lookup complet** (ISP, pays, ville, coordonnées)
- 🔔 **Notifications Telegram** en temps réel
- 📊 **Tracking analytics** (optionnel, conforme RGPD)
- ⚡ **Blocage transparent** des bots

### 🔌 Intégrations
- 🔐 **Supabase**: Auth + base de données
- 📱 **Telegram Bot**: Notifications + alertes
- 💰 **Monetag**: Publicités + monétisation
- 🌐 **IP-API**: Détection VPN/Proxy (gratuit)

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Installation locale
```bash
git clone https://github.com/YOUR_USERNAME/web-iptv.git
cd web-iptv
npm install --legacy-peer-deps
```

### 2. Configuration
Copier `.env.example` → `.env.local` et remplir les clés:
```bash
cp .env.example .env.local
```

### 3. Lancer en dev
```bash
npm run dev
# http://localhost:5173
```

### 4. Tester
- Créer un compte
- Vous recevez notification Telegram ? ✅
- Les annonces Monetag s'affichent ? ✅

---

## 📋 CONFIGURATION - 11 CLÉS API

### 🔐 Obligatoires (4):
1. **VITE_SUPABASE_URL** - Supabase
2. **VITE_SUPABASE_ANON_KEY** - Supabase
3. **TELEGRAM_BOT_TOKEN** - Telegram @BotFather
4. **TELEGRAM_CHAT_ID** - ID du groupe Telegram

### 💰 Recommandées (2):
5. **VITE_MONETAG_SITE_ID** - Site ID Monetag
6. **VITE_MONETAG_ENABLED** - `true/false`

### ⚙️ Optionnelles (5):
7. **VITE_IP_API_ENABLED** - Activer IP lookup (`true/false`)
8. **VITE_ANTI_BOT_ENABLED** - Activer anti-bot (`true/false`)
9. **VITE_BLOCK_VPN** - Bloquer VPN (`true/false`)
10. **VITE_BLOCK_DATACENTER** - Bloquer datacenter (`true/false`)
11. **VITE_TRACKING_ENABLED** - Tracking analytics (`true/false`)

**→ Lire `API_KEYS_GUIDE.md` pour les détails complets**

---

## 📖 DOCUMENTATION

| Document | Pour qui | À lire |
|----------|----------|--------|
| **API_KEYS_GUIDE.md** | Tous | Guide détaillé des 11 clés API |
| **SETUP_CHECKLIST.md** | Débutants | Checklist étape par étape |
| **COMPLETE_INTEGRATION_SUMMARY.md** | Devs | Explication technique complète |
| **.env.example** | Config | Template des variables |

---

## 🏗️ ARCHITECTURE

```
Web IPTV (Vue 3 + Vite)
├── Auth (Supabase)
│   ├── Register/Login
│   ├── Profiles table
│   └── Session management
├── Tracking & Analytics
│   ├── IP Lookup (ip-api.com)
│   ├── VPN/Proxy Detection
│   ├── Anti-Bot Blocking
│   └── Telegram Notifications
├── Monetization
│   ├── Monetag Ads
│   ├── Top/Bottom placements
│   └── Analytics dashboard
└── Player
    ├── Video.js (lecteur)
    ├── IPTV playlists
    ├── Radio support
    └── Search/Filters
```

---

## 🔄 FLUX UTILISATEUR

### Scenario normal (sans VPN):
```
Visite → IP lookup → Pas bloqué → Notification Telegram ✅
       → Contenu normal → Annonces Monetag → Peut regarder
```

### Scenario VPN/Proxy:
```
Visite → IP lookup → VPN détecté → Blocage 🚫 → Alerte Telegram
       → Écran rouge "Accès refusé" → Contenu masqué
```

---

## 📊 DONNÉES COLLECTÉES

### Tracking (si VITE_TRACKING_ENABLED=true):
- ✅ IP address
- ✅ ISP (Vodafone, Orange, AWS, etc.)
- ✅ Pays + Région + Ville
- ✅ Coordonnées GPS (lat/lon)
- ✅ Détection Proxy/VPN
- ✅ Détection Datacenter
- ✅ Mobile/Desktop
- ✅ User Agent

### Authentification:
- Email (haché par Supabase)
- Pseudo (optionnel)
- Session tokens

### Annonces:
- Impressions Monetag
- Clics d'annonces
- User behavior (via Monetag)

### Stockage:
- **Supabase**: Email + Pseudo
- **SessionStorage**: IP info (session courante)
- **Telegram**: Logs de visite
- **Monetag**: Analytics des annonces

---

## 🔒 SÉCURITÉ

### Anti-Bot:
- ✅ Détection VPN/Proxy
- ✅ Détection Datacenter
- ✅ Blocage automatique
- ✅ Alerte Telegram

### Données:
- ✅ Pas de cookies tiers
- ✅ SessionStorage (pas persistent)
- ✅ HTTPS partout
- ✅ Supabase RLS (Row Level Security)

### RGPD:
- ✅ Consentement implicite
- ✅ Droit à l'oubli (suppr automatique à chaque session)
- ✅ Peut être désactivé (VITE_TRACKING_ENABLED=false)
- ✅ Vous contrôlez tout

---

## 🚀 DÉPLOIEMENT

### Sur Vercel (recommandé):
```bash
git push origin main
# Vercel redéploie auto en ~2 min
```

### Ou manuellement:
```bash
npm run build
# Produire: dossier dist/

vercel --prod
# Ou déployer dist/ sur n'importe quel hosting
```

---

## 🆘 SUPPORT

### Problèmes courants:

**Je ne reçois pas les notifications Telegram**
→ Lire troubleshooting dans `API_KEYS_GUIDE.md`

**Les annonces Monetag ne s'affichent pas**
→ Attendre approbation du site (24-48h)
→ Vérifier console (F12) pour erreurs

**Je suis bloqué par erreur**
→ Désactiver VPN ou modifier variables

### Documentation:
- `API_KEYS_GUIDE.md` - Clés API détaillées
- `SETUP_CHECKLIST.md` - Configuration pas à pas
- `COMPLETE_INTEGRATION_SUMMARY.md` - Architecture technique

---

## 📦 STACK TECHNOLOGIQUE

- **Frontend**: Vue 3, Vite, Video.js
- **Backend**: Supabase (Firebase alternative)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **Ads**: Monetag SDK
- **Notifications**: Telegram Bot API
- **Hosting**: Vercel (statique + serverless)
- **DNS**: Cloudflare

---

## 📜 LICENCE

MIT License - Libre d'utilisation

---

## 🎯 ROADMAP

- [ ] Support VLC.js (plus de formats vidéo)
- [ ] Favorite channels (sauvegarde)
- [ ] Playlist personnalisées
- [ ] EPG (Electronic Program Guide)
- [ ] Chromecast support
- [ ] Dark/Light mode toggle
- [ ] More payment providers

---

## 📞 CONTACT

Questions? Besoin d'aide?
1. Lire la documentation (API_KEYS_GUIDE.md)
2. Vérifier logs console (F12)
3. Vérifier variables d'env
4. Redéployer

---

## 🎉 PRÊT À LANCER ?

1. Lire **API_KEYS_GUIDE.md** (configuration)
2. Suivre **SETUP_CHECKLIST.md** (étapes)
3. Déployer sur GitHub + Vercel
4. Ajouter votre domaine
5. Profiter ! 🚀

---

**Créé avec ❤️ pour les amateurs de streaming**

Version: 1.0.0  
Dernière mise à jour: 2024-01-15  
Support: Documentation complète fournie
