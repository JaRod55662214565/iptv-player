# 📡 Instructions de Déploiement - Web IPTV + Cloudflare + Vercel

Bienvenue ! Ce document vous guide pour déployer votre lecteur IPTV en ligne **GRATUITEMENT** avec :
- ✅ Votre domaine Digital Plate
- ✅ Cloudflare (CDN + SSL gratuit)
- ✅ Vercel (Hébergement gratuit)

---

## 📚 Documentation complète

### Pour les impatients : ⚡ **[QUICK_START.md](./QUICK_START.md)** (5 min)
### Pour les détails : 📖 **[CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)** (complet avec diagrammes)
### Pour les devs : 🛠️ **[DEPLOYMENT.md](./DEPLOYMENT.md)** (technique)

---

## 🎯 Résumé ultra-court

```
┌─ Digital Plate (votre domaine)
└─ Cloudflare (DNS + cache)
   └─ Vercel (hébergement)
      └─ GitHub (code)
         └─ [Votre app IPTV] 📺
```

**Coût total : 0€**

---

## 🚀 Étapes rapides

### 1. Créer un compte Cloudflare (gratuit)
https://www.cloudflare.com/free/ → Sign Up

### 2. Ajouter votre domaine à Cloudflare
Dans Cloudflare : "Add Site" → votre-domaine.digital-plate

### 3. Mettre à jour Digital Plate
Remplacer les Nameservers par ceux de Cloudflare

### 4. Créer un compte Vercel (gratuit)
https://vercel.com → Sign Up with GitHub

### 5. Importer le projet web-iptv sur Vercel
Vercel : "New Project" → Sélectionnez votre repo

### 6. Ajouter le domaine à Vercel
Vercel Settings → Domains → Add your domain

### 7. Ajouter le CNAME à Cloudflare
Cloudflare DNS → Add CNAME Record → cname.vercel-dns.com

### 8. Attendre & vérifier
Attendez 5-30 minutes, puis ouvrez votre domaine 🎉

---

## 🔍 Vérification

```bash
# Test rapide
curl -I https://votre-domaine.digital-plate

# Ou ouvrez dans le navigateur
https://votre-domaine.digital-plate
```

Vous devriez voir :
- ✅ Votre lecteur IPTV
- ✅ 🔒 Cadenas HTTPS
- ✅ URL en `https://`

---

## 🛠️ Commandes utiles

```bash
# Démarrer en local
npm install --legacy-peer-deps
npm run dev          # → http://localhost:5173

# Build pour production
npm run build        # → dossier dist/

# Prévisualiser le build
npm run preview      # → http://localhost:4173
```

---

## 📝 Structure du projet

```
web-iptv/
├── src/
│   ├── components/     # Composants Vue
│   ├── views/          # Pages (Login, Register, etc)
│   ├── services/       # Supabase Auth, API
│   ├── i18n/          # Traductions (FR/EN)
│   ├── assets/        # Images, logos
│   ├── App.vue        # Composant principal
│   └── main.js        # Point d'entrée
├── index.html         # HTML root
├── vite.config.js     # Config Vite
├── vercel.json        # Config Vercel
├── package.json       # Dépendances
└── dist/              # Build production (après npm run build)
```

---

## 🔐 Fonctionnalités

✅ **Lecteur vidéo** : Video.js + HLS streaming
✅ **Authentification** : Supabase Auth (email + pseudo)
✅ **Playlists IPTV** : iptv-org (10 000+ chaînes)
✅ **Multiples pays** : FR, BE, CH, CA, US, etc.
✅ **Multilingue** : Français & Anglais
✅ **Responsif** : Mobile, Tablet, Desktop
✅ **Dark theme** : Interface sobre et moderne

---

## 🌐 Après le déploiement

### Déploiement continu (Gratuit)

```bash
# Chaque fois que vous modifiez le code :
git add .
git commit -m "Mon changement"
git push origin main

# Vercel redéploie automatiquement en 1-2 minutes
# Cloudflare met le cache à jour
```

### Monitorer

**Vercel Dashboard** :
```
Project → Deployments
└─ Voir tous les déploiements
└─ Voir les logs de compilation
└─ Voir les erreurs (le cas échéant)
```

**Cloudflare Analytics** :
```
Analytics → Traffic
└─ Voir le trafic de votre site
└─ Voir les IPs des visiteurs
└─ Cache hit ratio
```

---

## 🐛 Troubleshooting

### "DNS Propagation Error"
- **Cause** : Les nameservers mettent du temps à se propager
- **Solution** : Attendre 1-48h (généralement 5-30 min)

### "SSL Certificate Error"
- **Cause** : Vercel/Cloudflare n'a pas généré le certificat SSL
- **Solution** : Attendre 24h (rare)

### "Page Blanche"
- **Cause** : Erreur de compilation
- **Solution** : Vérifier les logs Vercel → Deployments

### "Video ne joue pas"
- **Cause** : Playlist M3U inaccessible
- **Solution** : Vérifier que la chaîne IPTV est encore en ligne

---

## 📞 Support

| Problème | Contact |
|----------|---------|
| Domaine Digital Plate | Digital Plate Support |
| Cloudflare DNS | support@cloudflare.com |
| Vercel Hosting | vercel.com/support |
| Code IPTV | GitHub Issues |

---

## 🎓 Ressources utiles

- **Cloudflare Docs** : https://developers.cloudflare.com
- **Vercel Docs** : https://vercel.com/docs
- **Vue 3 Docs** : https://vuejs.org
- **Vite Docs** : https://vitejs.dev
- **IPTV Sources** : https://github.com/iptv-org/iptv

---

## 🎉 Bravo !

Vous avez déployé votre propre lecteur IPTV sur votre domaine personnel !

```
┌──────────────────────────────────────┐
│  https://votre-domaine.digital-plate │
│  📺 Lecteur IPTV en ligne          │
│  ☁️  Hébergement Vercel             │
│  🌐 CDN Cloudflare                  │
│  💰 0€ !                             │
└──────────────────────────────────────┘
```

**Prochaines étapes optionnelles** :
- Customiser le logo / couleurs
- Ajouter vos propres playlists M3U
- Intégrer Supabase pour l'auth personnalisée
- Optimiser les performances

Enjoy ! 🚀
