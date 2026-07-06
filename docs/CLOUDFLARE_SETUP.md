# ☁️ Configuration Cloudflare + Digital Plate

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VOS UTILISATEURS                         │
│                   (Navigateurs web)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ DNS Lookup: votre-domaine.digital-plate
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE (Gratuit)                     │
│  ├─ Cache CDN global (Vitesse rapide)                      │
│  ├─ Protection DDoS gratuite                               │
│  ├─ HTTPS/SSL gratuit                                      │
│  ├─ DNS Management                                          │
│  └─ Minification CSS/JS                                    │
└────────────────────────┬────────────────────────────────────┘
                         │ CNAME: cname.vercel-dns.com
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  VERCEL (Gratuit)                           │
│  ├─ Hébergement du site Web IPTV                          │
│  ├─ Déploiement automatique depuis GitHub                 │
│  ├─ Certificate SSL (géré automatiquement)                │
│  └─ Edge Network global                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  GITHUB (Gratuit)                           │
│  ├─ Contrôle de version                                    │
│  ├─ Déploiement continu (CI/CD)                           │
│  └─ Stockage du code                                       │
└─────────────────────────────────────────────────────────────┘
```

## Étape 1: Digital Plate → Cloudflare

### 1.1 Créer un compte Cloudflare (gratuit)

1. Allez sur [cloudflare.com](https://www.cloudflare.com)
2. Cliquez sur **"Sign Up"**
3. Entrez votre email et mot de passe
4. Vérifiez votre email

### 1.2 Ajouter votre domaine à Cloudflare

1. Depuis le dashboard Cloudflare, cliquez **"Add a Site"**
2. Entrez votre domaine : `votre-domaine.digital-plate`
3. Choisissez le plan **"Free"** (gratuit)
4. Cloudflare affiche les **Nameservers** à noter :
   ```
   NS1: blake.ns.cloudflare.com
   NS2: clara.ns.cloudflare.com
   ```
   (Les valeurs réelles dépendent de votre zone)

### 1.3 Mettre à jour les Nameservers sur Digital Plate

1. Allez sur le site/panneau de **Digital Plate**
2. Accédez à la **gestion de votre domaine**
3. Trouvez les paramètres **"Nameservers"** ou **"DNS Servers"**
4. Remplacez par les serveurs Cloudflare :
   ```
   Nameserver 1: blake.ns.cloudflare.com
   Nameserver 2: clara.ns.cloudflare.com
   ```
5. **Sauvegardez** les changements
   - ⏳ Propagation DNS : 1-48 heures (généralement 1-2 heures)

### 1.4 Vérifier que les Nameservers sont pointés

Attendez 5 minutes, puis testez :
```bash
# Dans votre terminal (macOS/Linux) ou PowerShell (Windows)
nslookup votre-domaine.digital-plate

# Ou utilisez un outil en ligne :
# https://mxtoolbox.com/nslookup.aspx
```

Vous devriez voir :
```
Server: blake.ns.cloudflare.com
Address: ...
```

---

## Étape 2: Cloudflare → Vercel

### 2.1 Créer/connecter votre compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez **"Sign Up"** (ou "Sign In")
3. Connectez-vous avec GitHub
4. Autorisez l'accès à vos repos

### 2.2 Importer votre projet web-iptv

1. Depuis le dashboard Vercel, cliquez **"New Project"**
2. Sélectionnez votre repo `web-iptv`
3. Vercel détecte automatiquement :
   - **Framework Preset** : Vue
   - **Build Command** : `npm run build` (depuis `vercel.json`)
   - **Output Directory** : `dist/`

4. Cliquez **"Deploy"** et attendez la compilation (~2-3 minutes)

### 2.3 Déploiement réussi ?

Vous recevrez une URL temporaire comme :
```
https://web-iptv.vercel.app
```

✅ **Testez l'application** en ouvrant cette URL

---

## Étape 3: Ajouter votre domaine à Vercel

### 3.1 Configuration du domaine dans Vercel

1. Allez dans **Project Settings** (⚙️ icône)
2. Allez à **"Domains"** dans le menu gauche
3. Cliquez **"Add Domain"**
4. Entrez votre domaine : `votre-domaine.digital-plate`
5. Cliquez **"Add"**

Vercel va afficher une message du type :
```
⚠️ Invalid Configuration

To complete the setup, please update the DNS records at your DNS provider:

Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: Auto
```

### 3.2 Configurer le CNAME dans Cloudflare

1. Allez sur votre **Cloudflare Dashboard**
2. Sélectionnez votre zone : `votre-domaine.digital-plate`
3. Allez dans **DNS** (menu du haut)
4. Cliquez **"+ Add record"**
5. Créez un nouvel enregistrement :

| Champ | Valeur |
|-------|--------|
| **Type** | CNAME |
| **Name** | @ (pour le root) ou `www` |
| **Target/Content** | `cname.vercel-dns.com` |
| **TTL** | Auto (Cloudflare) |
| **Proxy status** | Proxied (orange cloud) ⚠️ Important |

6. Cliquez **"Save"**

### 3.3 Attendre la vérification DNS

- Retournez dans Vercel → Project Settings → Domains
- Vercel va **vérifier** la configuration du CNAME
- ✅ Quand c'est fait, vous verrez : **"Valid Configuration"**
- ⏳ Cela peut prendre 5-30 minutes (propagation DNS)

---

## Étape 4: HTTPS et SSL (Automatique)

Cloudflare et Vercel génèrent automatiquement un **certificat SSL gratuit** dans les 24 heures.

### Vérifier HTTPS

Allez sur : `https://votre-domaine.digital-plate`

Vous devriez voir :
- 🔒 Cadenas vert = HTTPS actif
- URL : `https://` (pas `http://`)

---

## 📋 Résumé des étapes

```
1️⃣  Digital Plate
   └─ Changer les Nameservers en Cloudflare
   └─ ⏳ Attendre 1-48h

2️⃣  Cloudflare
   └─ Ajouter le domaine
   └─ Récupérer les Nameservers (déjà faits en étape 1)

3️⃣  Vercel
   └─ Importer le repo web-iptv
   └─ Déployer (auto avec GitHub)

4️⃣  Vercel → Ajouter le domaine
   └─ Ajouter le domaine dans Project Settings

5️⃣  Cloudflare → Ajouter le CNAME
   └─ Type: CNAME
   └─ Name: @
   └─ Value: cname.vercel-dns.com
   └─ Proxy: Proxied

6️⃣  Vérifier
   └─ Attendre 5-30 min
   └─ Ouvrir https://votre-domaine.digital-plate
   └─ ✅ HTTPS + Rapide (cache Cloudflare)
```

---

## 🚀 Après la configuration

### Déploiement continu (Gratuit)

Désormais, chaque fois que vous faites un **`git push`** :

1. GitHub notifie Vercel
2. Vercel compile votre code (`npm run build`)
3. Cloudflare met à jour le cache
4. Votre site est en ligne en **~1-2 minutes**

### Monitorer les déploiements

```bash
# Depuis le terminal
git log --oneline  # Voir les commits

# Depuis Vercel Dashboard
# Onglet "Deployments" → Voir tous les déploiements
```

---

## ⚙️ Configuration avancée (Optionnel)

### Optimiser Cloudflare

**Dashboard Cloudflare** → Zone Settings :

```
✅ Activer Auto Minify (CSS, JavaScript, HTML)
✅ Activer Brotli compression
✅ HTTP/2 Push = Automatic
✅ Image optimization (si images statiques)
```

**Cache Rules** (optionnel) :

```
URL: votre-domaine.digital-plate/assets/*
└─ Cache Level: Cache Everything
└─ Browser TTL: 1 year
```

---

## 🐛 Troubleshooting

### Domaine ne se connecte pas

**Symptôme** : Page blanche, erreur 404

**Solution** :
1. Vérifier les Nameservers avec : `nslookup votre-domaine.digital-plate`
2. Vérifier le CNAME dans Cloudflare DNS
3. Vérifier que Vercel montre "Valid Configuration"
4. Attendre 24h complètes pour la propagation DNS

---

### HTTPS ne marche pas (pas de cadenas)

**Symptôme** : `http://` au lieu de `https://`

**Solution** :
1. Dans Vercel → Settings → Domains
2. Vérifier que le certificat SSL est émis
3. Dans Cloudflare → SSL/TLS → Mode = "Full" ou "Full (strict)"
4. Attendre 24h

---

### Vercel dit "Invalid Configuration"

**Symptôme** : DNS record non reconnu

**Solution** :
1. Vérifier dans Cloudflare que le CNAME est bien : `cname.vercel-dns.com`
2. Vérifier que le **Proxy Status** est **"Proxied"** (nuage orange)
3. Si ce n'est pas proxié, le CNAME sera "non proxié" (nuage gris), ce qui peut causer des problèmes
4. Attendre 10 minutes et rafraîchir

---

### DNS se met à jour lentement

**Symptôme** : Changements DNS prennent des heures

**Solution** :
- C'est normal ! La propagation DNS peut prendre jusqu'à 48h
- Utilisez : https://whatsmydns.net pour vérifier la propagation globale
- Vider le cache de votre navigateur : `Ctrl+Shift+Del`

---

## 📞 Support

| Problème | Contacter |
|----------|-----------|
| Domaine Digital Plate | Support Digital Plate |
| DNS Cloudflare | [docs.cloudflare.com](https://docs.cloudflare.com) |
| Déploiement Vercel | [vercel.com/support](https://vercel.com/support) |
| Code de l'app | GitHub Issues |

---

**Bravo ! Votre application IPTV est maintenant en ligne ! 🎉**

```
┌─────────────────────────────────────┐
│ https://votre-domaine.digital-plate │
│         🎬 Regardez vos chaînes      │
└─────────────────────────────────────┘
```
