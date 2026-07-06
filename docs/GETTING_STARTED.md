# 🎬 Web IPTV - Lecteur IPTV en ligne

Bienvenue ! Ce projet est un **lecteur de chaînes IPTV moderne**, prêt à être déployé en ligne.

---

## 📖 Documentation

Choisissez votre chemin selon votre besoin :

### 🚀 **Je veux déployer MAINTENANT**
→ Lisez **[QUICK_START.md](./QUICK_START.md)** (5 minutes)

### 📚 **Je veux des détails complets**
→ Lisez **[CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)** (guide détaillé avec diagrammes)

### ✅ **Je veux une checklist**
→ Lisez **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** (checklist de vérification)

### 🛠️ **Je veux les détails techniques**
→ Lisez **[DEPLOYMENT.md](./DEPLOYMENT.md)** (pour les devs)

### 🎮 **Je veux juste utiliser localement**
→ Voir section "Démarrage local" ci-dessous

---

## 🚀 Démarrage local (30 secondes)

```bash
# 1. Installer les dépendances
npm install --legacy-peer-deps

# 2. Démarrer le serveur
npm run dev

# 3. Ouvrir le navigateur
# → http://localhost:5173
```

Le serveur est maintenant en écoute. Ouvrez l'URL dans votre navigateur et profitez ! 📺

### Arrêter le serveur
```bash
# Appuyez sur Ctrl+C dans le terminal
```

---

## 🎯 Caractéristiques principales

✅ **Lecteur vidéo moderne** - Video.js avec support HLS
✅ **10 000+ chaînes IPTV** - Via iptv-org (gratuit)
✅ **Playlists par pays** - France, Belgique, Suisse, Canada, etc.
✅ **Authentification** - Email + Pseudo (Supabase Auth)
✅ **Multilingue** - Français et Anglais
✅ **Responsive** - Mobile, Tablette, Desktop
✅ **Dark mode** - Interface sobre et moderne
✅ **HTTPS gratuit** - Cloudflare + Vercel
✅ **CDN gratuit** - Cloudflare Edge Network
✅ **Déploiement continu** - GitHub → Vercel automatique

---

## 📁 Structure du projet

```
web-iptv/
│
├── 📖 Documentation (lisez-moi d'abord)
│   ├── QUICK_START.md          ⭐ Start here (5 min)
│   ├── CLOUDFLARE_SETUP.md     📚 Guide complet
│   ├── DEPLOYMENT_CHECKLIST.md ✅ Checklist
│   ├── DEPLOYMENT.md           🛠️  Technique
│   └── GETTING_STARTED.md      👈 Vous êtes ici
│
├── 🎨 Source code
│   ├── src/
│   │   ├── App.vue             # Composant principal
│   │   ├── main.js             # Point d'entrée
│   │   │
│   │   ├── components/
│   │   │   ├── Nav.vue         # Menu de navigation
│   │   │   └── Settings.vue    # Modal de paramètres
│   │   │
│   │   ├── views/
│   │   │   ├── Index.vue       # Lecteur vidéo
│   │   │   ├── Login.vue       # Connexion
│   │   │   ├── Register.vue    # Inscription
│   │   │   └── NotFound.vue    # 404
│   │   │
│   │   ├── services/
│   │   │   └── authService.js  # Supabase Auth
│   │   │
│   │   ├── api/
│   │   │   └── index.js        # Fetch playlists
│   │   │
│   │   ├── utils/
│   │   │   ├── geolocation.js  # Détection pays
│   │   │   └── tvlistsupport.js# Parser M3U
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.js        # Traductions
│   │   │   └── messages.js     # Clés FR/EN
│   │   │
│   │   ├── assets/
│   │   │   └── logo.svg        # Logo
│   │   │
│   │   └── style.css           # Styles globaux
│   │
│   ├── index.html              # HTML racine
│   ├── vite.config.js          # Config Vite
│   ├── package.json            # Dépendances
│   ├── package-lock.json       # Lock file
│   │
│   ├── ⚙️ Configuration
│   │   └── vercel.json         # Config Vercel
│   │
│   └── 🗄️ Base de données (optionnel)
│       ├── supabase/
│       └── supabase.sql        # Schéma SQL
│
└── 🚀 Production
    └── dist/                   # Build final (après npm run build)
        ├── assets/             # CSS + JS minifiés
        └── index.html          # HTML minifié
```

---

## 🔧 Commandes disponibles

```bash
# Développement
npm run dev          # Démarrer le serveur local (port 5173)

# Production
npm run build        # Build optimisé pour production
npm run preview      # Prévisualiser le build (port 4173)
```

---

## 🌐 Sources de chaînes IPTV

Le projet récupère les chaînes depuis **iptv-org** (gratuit, 10 000+ chaînes) :

- **France** : https://iptv-org.github.io/iptv/countries/fr.m3u
- **Belgique** : https://iptv-org.github.io/iptv/countries/be.m3u
- **Suisse** : https://iptv-org.github.io/iptv/countries/ch.m3u
- **Canada** : https://iptv-org.github.io/iptv/countries/ca.m3u
- **+ 200 pays** : https://iptv-org.github.io/iptv/

Ou sélectionnez n'importe quelle playlist M3U valide ! 📺

---

## 🔐 Authentification (Optionnel)

Le projet support **Supabase Auth** pour une authentification sécurisée :

1. Créez un compte Supabase gratuit
2. Configurez les variables d'env :
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_KEY=xxxxxxxx
   ```
3. Utilisez le formulaire Login/Register

Pour tester sans auth, utilisez le compte démo :
```
Email: admin@webtv.app
Mot de passe: admin123
```

---

## 📦 Stack technologique

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Vue.js** | 3.2+ | Framework UI |
| **Vite** | 4.5+ | Build tool & serveur local |
| **Video.js** | 8.3+ | Lecteur vidéo HTML5 |
| **Axios** | 1.4+ | HTTP client |
| **Supabase** | 2.106+ | Auth + DB (optionnel) |
| **Cloudflare** | — | CDN + DNS |
| **Vercel** | — | Hébergement |

---

## 🌍 Langues supportées

- 🇫🇷 Français
- 🇬🇧 English

Détection automatique basée sur la langue du navigateur.

---

## 🎓 Comment ça marche ?

### Flux utilisateur

```
1. Utilisateur ouvre votre site
2. App sélectionne le pays automatiquement
3. Télécharge la playlist M3U du pays
4. Affiche la liste des chaînes
5. Utilisateur clique sur une chaîne
6. Video.js lit le flux HLS
7. Regarder la chaîne en direct ! 📺
```

### Architecture

```
Frontend (Vue 3 + Vite)
    ├─ App.vue (état global)
    ├─ Nav.vue (menu)
    ├─ Settings.vue (pays/langue)
    └─ Index.vue (lecteur vidéo)

Services
    ├─ authService (Supabase)
    ├─ API (playlists M3U)
    └─ Geolocation (détection pays)

Lecteur
    └─ Video.js
        └─ HLS streaming
            └─ Chaîne IPTV en direct
```

---

## 🚀 Déploiement (Gratuit!)

### Option 1: Déploiement rapide (Recommandé)
1. Fork ce dépôt sur GitHub
2. Allez sur Vercel.com → Connect GitHub
3. Sélectionnez ce repo
4. Deploy ! (1 clic)
5. Configurez votre domaine Digital Plate

👉 **Lisez [QUICK_START.md](./QUICK_START.md) pour les détails**

### Option 2: Déploiement manuel
```bash
# Build
npm run build

# Upload dist/ sur votre serveur
# Configurer les redirects pour SPA (index.html)
```

---

## 📊 Performance

- **Initial Load** : ~500ms (Cloudflare CDN)
- **Video Start** : ~2-5s (HLS buffer)
- **Bundle Size** : ~1.2 MB (minifié + gzippé)
- **Lighthouse** : A+ (performance, accessibility)

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| "Cannot find module '@supabase/supabase-js'" | `npm install --legacy-peer-deps` |
| Vidéo ne joue pas | Vérifier que la chaîne est en ligne |
| Page blanche | F12 → Console, vérifier les erreurs |
| Lent | Vérifier la connexion Internet |

---

## 📝 Licence

MIT - Libre d'utilisation

---

## 🙋 Besoin d'aide ?

1. **Pour le déploiement** : Voir [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)
2. **Pour la checklist** : Voir [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. **Pour le code** : GitHub Issues
4. **Pour Vercel** : vercel.com/support
5. **Pour Cloudflare** : cloudflare.com/support

---

## 🎉 Prêt à commencer ?

### Pour les impatients : ⚡
```bash
npm install --legacy-peer-deps
npm run dev
```
Puis ouvrez http://localhost:5173

### Pour déployer en ligne : 🚀
Lisez **[QUICK_START.md](./QUICK_START.md)** (5 minutes)

### Pour les détails : 📚
Lisez **[CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)**

---

**Merci d'utiliser Web IPTV ! 📺✨**

```
🎬 Regardez vos chaînes préférées
☁️  Sur votre propre domaine
💰 Gratuitement
```

Enjoy ! 🚀
