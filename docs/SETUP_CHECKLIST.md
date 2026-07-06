# ✅ CHECKLIST DE CONFIGURATION COMPLÈTE

Suivez cette checklist dans l'ordre. Tout doit être ✅ pour que l'app fonctionne parfaitement.

---

## 🔐 ÉTAPE 1: SUPABASE - AUTHENTIFICATION & DB

- [ ] Aller sur https://supabase.com
- [ ] Créer un compte gratuit
- [ ] Créer un nouveau projet:
  - [ ] Nom: `web-iptv`
  - [ ] Région: Europe (ou votre région)
  - [ ] Générer et sauvegarder le mot de passe
- [ ] Attendre 2-3 minutes le déploiement
- [ ] Aller à **Settings → API**
- [ ] Copier **Project URL** → `VITE_SUPABASE_URL`
- [ ] Copier **anon public key** → `VITE_SUPABASE_ANON_KEY`
- [ ] Créer la table `profiles` (voir API_KEYS_GUIDE.md)
- [ ] **Tester**: Vous pouvez créer un compte dans l'app ? ✅

---

## 🤖 ÉTAPE 2: TELEGRAM BOT - NOTIFICATIONS & TRACKING

### 2.1 - Créer le Bot
- [ ] Ouvrir Telegram
- [ ] Chercher **@BotFather**
- [ ] Envoyer `/newbot`
- [ ] Répondre aux questions:
  - [ ] Nom du bot: `Web IPTV Notifications` (ou votre nom)
  - [ ] Username: `web_iptv_notif_bot` (doit finir par `_bot`)
- [ ] Copier le **TOKEN** fourni par BotFather
  - [ ] `VITE_TELEGRAM_BOT_TOKEN=123456...`

### 2.2 - Créer le groupe Telegram
- [ ] Ouvrir Telegram
- [ ] Créer un **Nouveau groupe** → `Web IPTV Logs`
- [ ] Ajouter le bot au groupe (invite comme membre)
- [ ] Envoyer un message quelconque dans le groupe

### 2.3 - Récupérer le Chat ID
- [ ] Copier votre **TOKEN** du bot BotFather
- [ ] Ouvrir ce lien dans le navigateur:
  ```
  https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates
  ```
- [ ] Remplacer `{YOUR_TOKEN}` par votre token réel
- [ ] Vous verrez un JSON avec:
  ```json
  "chat": {
    "id": -987654321,  ← C'EST VOTRE CHAT ID
  }
  ```
- [ ] Copier le **chat.id** (le négatif)
  - [ ] `VITE_TELEGRAM_CHAT_ID=-987654321`

### 2.4 - Tester le Bot
- [ ] Ouvrir ce lien (remplacer les valeurs):
  ```
  https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text=Test
  ```
- [ ] Vous recevez "Test" dans le groupe ? ✅

---

## 💰 ÉTAPE 3: MONETAG - PUBLICITÉS & REVENU

- [ ] Aller sur https://monetag.com
- [ ] Créer un compte gratuit
- [ ] Vérifier l'email
- [ ] Aller à **Dashboard → My Sites**
- [ ] Cliquer **"Add Website"**
- [ ] Remplir:
  - [ ] URL: `https://votre-domaine.digital-plate`
  - [ ] Nom: `Web IPTV Player`
  - [ ] Catégorie: `Entertainment`
- [ ] Cliquer **"Add"**
- [ ] Attendre l'approbation (24-48h)
- [ ] Aller à **Dashboard → My Sites → Votre site**
- [ ] Copier le **Site ID**
  - [ ] `VITE_MONETAG_SITE_ID=a1b2c3d4...`

---

## 🔒 ÉTAPE 4: AJOUTER TOUTES LES VARIABLES D'ENVIRONNEMENT

### Option A: En développement local (`.env.local`)

Créer un fichier `.env.local` à la racine du projet:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
VITE_TELEGRAM_CHAT_ID=-987654321

# Monetag
VITE_MONETAG_SITE_ID=a1b2c3d4e5f6g7h8i9j0k
VITE_MONETAG_ENABLED=true

# IP Lookup & Anti-Bot
VITE_IP_API_ENABLED=true
VITE_ANTI_BOT_ENABLED=true
VITE_BLOCK_VPN=true
VITE_BLOCK_DATACENTER=true

# Tracking
VITE_TRACKING_ENABLED=true
```

- [ ] Créer le fichier `.env.local`
- [ ] Ajouter toutes les variables
- [ ] Sauvegarder

### Option B: Sur Vercel (pour production)

- [ ] Aller sur https://vercel.com
- [ ] Aller à **Settings → Environment Variables**
- [ ] Ajouter chaque variable:
  - [ ] `VITE_SUPABASE_URL` = votre URL Supabase
  - [ ] `VITE_SUPABASE_ANON_KEY` = votre clé anon
  - [ ] `VITE_TELEGRAM_BOT_TOKEN` = votre token bot
  - [ ] `VITE_TELEGRAM_CHAT_ID` = votre chat ID
  - [ ] `VITE_MONETAG_SITE_ID` = votre Site ID Monetag
  - [ ] `VITE_MONETAG_ENABLED` = `true`
  - [ ] `VITE_IP_API_ENABLED` = `true`
  - [ ] `VITE_ANTI_BOT_ENABLED` = `true`
  - [ ] `VITE_BLOCK_VPN` = `true`
  - [ ] `VITE_BLOCK_DATACENTER` = `true`
  - [ ] `VITE_TRACKING_ENABLED` = `true`

---

## 🧪 ÉTAPE 5: TESTER EN LOCAL

- [ ] Ouvrir un terminal à la racine du projet
- [ ] Lancer le serveur dev:
  ```bash
  npm run dev
  ```
- [ ] Ouvrir http://localhost:5173
- [ ] Vous verrez:
  - [ ] Page de login/register chargée
  - [ ] Console (F12) affiche `[Tracking] IP Info: ...`
  - [ ] Console affiche `[Telegram] Message envoyé`
  - [ ] Console affiche `[Monetag] Initialized`
- [ ] Créer un compte de test
- [ ] Vous recevez une notification Telegram avec votre IP ? ✅

---

## 🧪 ÉTAPE 6: TESTER LE BLOCAGE (optionnel)

Si vous voulez tester le blocage VPN:

- [ ] Installer un VPN (gratuit: ProtonVPN)
- [ ] Activer le VPN
- [ ] Ouvrir http://localhost:5173 dans une fenêtre privée
- [ ] Vous verrez:
  - [ ] Écran rouge "Accès refusé" 🚫
  - [ ] Votre IP, FAI, pays affichés
  - [ ] Notification Telegram avec "🚫 BLOCAGE ANTI-BOT"
- [ ] Désactiver VPN → Retour à la normale ✅

---

## 🚀 ÉTAPE 7: DÉPLOYER SUR GITHUB

- [ ] Créer un compte GitHub (si pas encore)
- [ ] Créer un nouveau repo:
  - [ ] Nom: `web-iptv`
  - [ ] Privé (recommandé)
  - [ ] Cliquer **"Create"**
- [ ] Sur votre ordinateur, ouvrir terminal à la racine du projet:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/web-iptv.git
  git branch -M main
  git add .
  git commit -m "Intégration Monetag + Telegram Bot + Anti-bot"
  git push -u origin main
  ```
- [ ] Vérifier sur GitHub que tous les fichiers sont là

---

## 🌍 ÉTAPE 8: DÉPLOYER SUR VERCEL

- [ ] Aller sur https://vercel.com
- [ ] Cliquer **"New Project"**
- [ ] **Connecter GitHub**:
  - [ ] Autoriser Vercel à accéder à GitHub
  - [ ] Sélectionner le repo `web-iptv`
- [ ] **Configurer le projet**:
  - [ ] Framework: Vite (devrait être auto-détecté)
  - [ ] Build command: `npm run build` (déjà prérempli)
  - [ ] Output directory: `dist` (déjà prérempli)
- [ ] **Ajouter les variables d'environnement** (même si déjà faites):
  - [ ] Pour chaque variable:
    - [ ] Name: la variable (ex: `VITE_SUPABASE_URL`)
    - [ ] Value: la valeur
    - [ ] Production: cocher la case
    - [ ] Cliquer **"Add"**
- [ ] Cliquer **"Deploy"**
- [ ] ⏳ Attendre le déploiement (~2 minutes)

---

## 🔗 ÉTAPE 9: CONNECTER LE DOMAINE

Vous avez un domaine Digital Plate et Cloudflare ? Voir **CLOUDFLARE_SETUP.md**

- [ ] Sur Vercel, aller à **Settings → Domains**
- [ ] Ajouter votre domaine: `votre-domaine.digital-plate`
- [ ] Copier les **Nameservers Vercel**
- [ ] Sur Digital Plate, remplacer les Nameservers
- [ ] Attendre 5-30 min la propagation DNS
- [ ] Vérifier: https://votre-domaine.digital-plate ✅

---

## ✅ ÉTAPE 10: VÉRIFICATIONS FINALES

### Sur Production (https://votre-domaine.digital-plate)

- [ ] Page de login chargée ? ✅
- [ ] Créer un compte de test
- [ ] Vous recevez une notification Telegram ? ✅
- [ ] Page d'accueil chargée après login ? ✅
- [ ] Vidéo se lit ? ✅
- [ ] Annonces Monetag s'affichent en haut/bas ? ✅
- [ ] Les paramètres changent le pays ? ✅
- [ ] Chercher une chaîne fonctionne ? ✅

### Telegram

- [ ] Vous recevez les notifications de visite ? ✅
- [ ] Les IPs, pays, FAI sont affichés ? ✅
- [ ] Si vous activez un VPN, vous êtes bloqué ? ✅
- [ ] L'alerte "BLOCAGE ANTI-BOT" arrive ? ✅

### Monetag

- [ ] Les publicités s'affichent ? (peut prendre 24-48h après approbation)
- [ ] Les annonces varient à chaque rafraîchissement ?
- [ ] Pas de messages d'erreur dans la console ?

---

## 🎉 C'EST FAIT !

Vous avez maintenant:

✅ Authentification Supabase complète  
✅ Telegram Bot pour les notifications  
✅ IP Tracking avec détection VPN/Proxy  
✅ Blocage automatique des bots  
✅ Monétisation Monetag activée  
✅ Site en ligne sur votre domaine  
✅ Déploiement continu avec GitHub + Vercel  

---

## 📞 AIDE SUPPLÉMENTAIRE

Si quelque chose ne fonctionne pas:

1. **Lire API_KEYS_GUIDE.md** (troubleshooting)
2. **Ouvrir la console** (F12 → Console)
3. **Chercher les logs** `[v0] ...`, `[Tracking]`, `[Telegram]`, `[Monetag]`
4. **Vérifier les variables** dans Vercel Settings
5. **Redéployer**: `git push` sur GitHub

---

**Merci d'avoir utilisé ce guide ! 🚀**
