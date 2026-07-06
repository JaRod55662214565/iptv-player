# 🚀 DÉPLOIEMENT VERCEL - GUIDE COMPLET

Guide complet de déploiement de votre lecteur IPTV sur Vercel avec optimisation totale et configuration parfaite.

---

## 1️⃣ PRÉ-REQUIS

Avant de déployer sur Vercel, assurez-vous d'avoir:

✅ Compte Vercel (vercel.com) - gratuit
✅ Repo GitHub avec le code poussé
✅ Domaine Digital Plate (ou domaine personnalisé)
✅ Cloudflare configuré (DNS, SSL gratuit)
✅ 14 variables d'environnement prêtes

---

## 2️⃣ ÉTAPE 1 - PRÉPARATION GITHUB

### Pousser le code sur GitHub

```bash
cd /vercel/share/v0-project
git remote -v                    # Vérifier le repo
git push origin main             # Pousser sur GitHub
git log --oneline -5             # Vérifier commits
```

### Points importants:

- [ ] Tous les commits sont poussés
- [ ] Aucune modification locale non commitée
- [ ] .gitignore inclut node_modules et .env
- [ ] README.md existe

---

## 3️⃣ ÉTAPE 2 - CRÉER PROJET VERCEL

### Via interface Vercel.com

1. Aller sur https://vercel.com/dashboard
2. Cliquer **"New Project"**
3. Sélectionner **"Import Git Repository"**
4. Chercher votre repo "web-iptv"
5. Cliquer **"Import"**

### Configuration automatique:

- Framework: **Vue** (auto-détecté)
- Build Command: **npm run build**
- Output Directory: **dist** (auto-détecté)

---

## 4️⃣ ÉTAPE 3 - AJOUTER VARIABLES D'ENVIRONNEMENT

Cela est CRITIQUE. Sans ces variables, le site ne fonctionnera pas.

### Via Vercel Settings

1. Aller à **Settings** → **Environment Variables**
2. Ajouter les 14 variables:

#### Groupe 1: Supabase (Obligatoire)
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...
```

#### Groupe 2: Telegram (Obligatoire)
```
TELEGRAM_BOT_TOKEN = 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
TELEGRAM_CHAT_ID = -987654321
```

#### Groupe 3: Monetag
```
VITE_MONETAG_SITE_ID = votre_site_id
VITE_MONETAG_ENABLED = true
```

#### Groupe 4: Larafly
```
VITE_LARAFLY_DOMAIN = 3nbf4.com
VITE_LARAFLY_ZONE_ID = 11244621
VITE_LARAFLY_ENABLED = true
```

#### Groupe 5: Sécurité/Analytics
```
VITE_IP_API_ENABLED = true
VITE_ANTI_BOT_ENABLED = true
VITE_BLOCK_VPN = true
VITE_BLOCK_DATACENTER = true
VITE_TRACKING_ENABLED = true
```

### Points critiques:

- [ ] 14 variables toutes ajoutées
- [ ] Pas d'espaces supplémentaires
- [ ] Valeurs correctes (vérifier copy/paste)
- [ ] Production environment sélectionné

---

## 5️⃣ ÉTAPE 4 - DÉPLOYER

### Option 1: Auto-déploiement (Recommandé)

```bash
git push origin main
```

→ Vercel détecte le push et redéploie automatiquement (1-2 min)

### Option 2: Déployer manuellement depuis Vercel

1. Dashboard Vercel
2. Cliquer **"Deploy"** button
3. Attendre ~2-3 minutes

### Monitoring du déploiement

```
Vercel Dashboard → Project → Deployments → Voir logs en temps réel
```

Logs importants à vérifier:

```
✓ Installing dependencies...
✓ Building project...
✓ Uploading files...
✓ Deployment complete!
```

---

## 6️⃣ ÉTAPE 5 - CONNECTER DOMAINE

### Option A: Domaine Digital Plate (avec Cloudflare)

1. Aller à **Vercel Settings** → **Domains**
2. Ajouter domaine: `votre-domaine.digital-plate`
3. Choisir: **Using external nameserver** (Cloudflare)
4. Copier le **CNAME**: `cname.vercel-dns.com`
5. Aller à **Cloudflare DNS**:
   - Type: CNAME
   - Name: @ (ou votre-domaine.digital-plate)
   - Value: cname.vercel-dns.com
6. Attendre propagation DNS (5-30 min)

### Option B: Domaine personnalisé

1. Vercel Settings → Domains
2. Ajouter votre domaine (ex: iptv.example.com)
3. Suivre les instructions Vercel pour DNS

---

## 7️⃣ ÉTAPE 6 - VÉRIFIER CONFIGURATION

### Build & Deploy

Après déploiement, vérifier:

```
Vercel Dashboard → Project
├─ Deployment Status: ✓ Ready (pas de ✗ Failed)
├─ Build Logs: ✓ Pas d'erreurs
├─ Environment: ✓ 14 variables affichées
└─ Domains: ✓ Votre domaine connecté
```

### HTTPS & SSL

```
✓ Certificat SSL auto-généré par Vercel (gratuit)
✓ Certificat renouvelé auto par Cloudflare
✓ HTTPS actif sur votre domaine
✓ Service Worker compatible (HTTPS requis)
```

### Tester l'accès

```
Ouvrir: https://votre-domaine.digital-plate

Vérifier:
✓ Page charge sans erreur
✓ Pas de logs d'erreur (F12 → Console)
✓ Service Worker enregistré (F12 → Application)
✓ Larafly/Monetag logs visibles
```

---

## 8️⃣ ÉTAPE 7 - MONITORING EN PRODUCTION

### Logs Vercel (temps réel)

```
Dashboard → Project → Deployments → [latest] → Logs
```

Chercher errors ou warnings.

### Analytics Vercel

```
Dashboard → Project → Analytics
├─ Real-time traffic
├─ Edge requests
├─ Error rates
└─ Performance metrics
```

### Cloudflare Analytics

```
Dashboard → Your Domain → Analytics
├─ Requests
├─ Cache status
├─ Threats blocked
└─ Performance
```

### Console Browser (F12)

Ouvrir votre site et faire:

```javascript
F12 → Console

Chercher:
✓ [Larafly] Service Worker registered
✓ [Larafly] Larafly initialized
✓ [Monetag] Script loaded
✓ [Tracking] IP lookup complete
✓ Pas de fetch errors en rouge
```

---

## 9️⃣ CHECKLIST COMPLET

- [ ] Code poussé sur GitHub
- [ ] Repo créé sur Vercel
- [ ] 14 variables d'env ajoutées sur Vercel
- [ ] Build réussi (Vercel logs verts)
- [ ] Site accessible via domaine
- [ ] HTTPS fonctionne
- [ ] Service Worker enregistré
- [ ] Larafly logs visibles en console
- [ ] Monetag logs visibles en console
- [ ] Pas d'erreurs critiques (F12)
- [ ] Redirection DNS correcte (whatsmydns.net)
- [ ] Approbation Larafly (24-48h)
- [ ] Annonces visibles après approbation
- [ ] Telegram notifications reçues

---

## 🔟 TROUBLESHOOTING VERCEL

### ❌ Build échoue: "Command failed"

**Cause**: Erreur de syntaxe ou variable d'env manquante

**Solution**:
```bash
npm run build --legacy-peer-deps  # Local test
npm install                        # Dépendance manquante?
git push origin main              # Redéployer
```

### ❌ Site donne erreur 404

**Cause**: Fichier index.html manquant ou mauvaise config

**Vérifier**:
- [ ] vercel.json a `"outputDirectory": "dist"`
- [ ] Fichier index.html existe
- [ ] Build génère le dossier dist/

### ❌ Variables d'env ne sont pas lues

**Cause**: Variables mal ajoutées ou environnement wrong

**Vérifier**:
- [ ] Variables dans "Production" environment (pas Preview)
- [ ] Noms exacts: VITE_SUPABASE_URL (pas vite_supabase_url)
- [ ] Pas d'espaces: "value" (pas " value ")
- [ ] Redéployer après ajout (F5 Vercel)

### ❌ Service Worker ne s'enregistre pas

**Cause**: HTTPS pas activé ou headers incorrects

**Vérifier**:
- [ ] HTTPS fonctionnant (cadenas 🔒 dans navigateur)
- [ ] Headers correct dans vercel.json
- [ ] public/sw.js existe

### ❌ Annonces Larafly/Monetag ne s'affichent pas

**Cause**: Site pas approuvé, site ID incorrect

**Vérifier**:
- [ ] Site approuvé par Larafly/Monetag (24-48h)
- [ ] Variables VITE_MONETAG_SITE_ID correctes
- [ ] VITE_LARAFLY_ZONE_ID = 11244621

### ❌ DNS ne se propage pas

**Cause**: DNS change non propagé ou erreur

**Vérifier**:
```bash
# Sur Mac/Linux
nslookup votre-domaine.digital-plate
dig votre-domaine.digital-plate

# Ou utiliser whatsmydns.net
```

---

## 📊 PERFORMANCE VERCEL

La configuration est optimisée pour:

✅ **Build rapide**: Chunk splitting (Vue, Supabase, VideoJS)
✅ **Cache agressif**: Assets = 1 an
✅ **Compression**: Terser minification
✅ **CDN global**: 270+ edge locations
✅ **Serverless**: Pas de serveur à gérer

### Attendre:

- Build time: 30-60 secondes
- Deploy time: 1-2 minutes
- Time to First Byte (TTFB): <200ms
- Lighthouse score: 85+

---

## 🔄 DÉPLOIEMENT CONTINU

Après configuration initiale, le workflow est simple:

```
1. git add .
2. git commit -m "Description"
3. git push origin main
       ↓
4. Vercel redéploie auto
   (1-2 minutes)
       ↓
5. Voir logs: Vercel Dashboard → Deployments
```

Aucune action manuelle supplémentaire!

---

## 📝 LOGS IMPORTANTS À SURVEILLER

### Build Logs (Vercel)

```
✓ Installed dependencies (npm) in 45s
✓ Building project: npm run build
✓ 200 modules transformed
✓ Deployed to [production]
```

### Runtime Logs (Browser Console)

```
[Larafly] Service Worker registration requested
[Larafly] Service Worker registered successfully
[Larafly] Larafly script loaded
[Monetag] Script injected
[Tracking] IP lookup: 1.2.3.4 (ISP: Vodafone)
```

---

## ⚠️ POINTS CRITIQUES À RETENIR

1. **HTTPS obligatoire** → Service Worker + Larafly
2. **14 variables d'env** → Sinon site non-fonctionnel
3. **Approbation Larafly** → 24-48h avant les annonces
4. **Redéployer après ajout variables** → Important!
5. **Cloudflare SSL gratuit** → Vérifier cadenas
6. **DNS propagation** → Attendre 5-30 min

---

## 🎯 RÉSUMÉ RAPIDE

```
1. git push origin main (code sur GitHub)
2. Vercel: Import Git Repository
3. Vercel Settings → Environment Variables → 14 clés
4. Deploy
5. Vercel Settings → Domains → Ajouter votre domaine
6. Cloudflare DNS → CNAME vers Vercel
7. Attendre propagation (5-30 min)
8. Tester: https://votre-domaine.digital-plate
9. Vérifier console: [Larafly], [Monetag], [Tracking]
10. En production! 🚀
```

---

## 📞 SUPPORT

- Vercel Support: https://vercel.com/help
- Vercel Docs: https://vercel.com/docs
- Cloudflare DNS Help: https://dash.cloudflare.com
- Consulter les autres guides: API_KEYS_GUIDE.md, LARAFLY_INTEGRATION.md

---

## ✅ STATUS FINAL

- Build: ✓ Optimisé
- Config: ✓ Complète
- Variables: ✓ 14 prêtes
- Domaine: ✓ Guide fourni
- Production: ✓ Prêt!

**Prochaine étape**: `git push origin main` → Lancer le déploiement!

---

*Last updated: 2024-01-15*
*Version: 1.0.0*
