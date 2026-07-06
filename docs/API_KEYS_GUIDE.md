# 🔑 GUIDE COMPLET DES CLÉS API

Toutes les clés API nécessaires pour votre lecteur IPTV avec **Monetag** + **Larafly** + **Telegram Bot** + **Anti-bot**.

---

## 📋 RÉSUMÉ - 14 CLÉS API À CONFIGURER

| # | Variable | Service | Priorité | Obligatoire |
|---|----------|---------|----------|------------|
| 1 | `VITE_SUPABASE_URL` | Supabase | ⭐⭐⭐ | ✅ OUI |
| 2 | `VITE_SUPABASE_ANON_KEY` | Supabase | ⭐⭐⭐ | ✅ OUI |
| 3 | `TELEGRAM_BOT_TOKEN` | Telegram | ⭐⭐⭐ | ✅ OUI |
| 4 | `TELEGRAM_CHAT_ID` | Telegram | ⭐⭐⭐ | ✅ OUI |
| 5 | `VITE_MONETAG_SITE_ID` | Monetag | ⭐⭐ | ⚠️ Optionnel |
| 6 | `VITE_MONETAG_ENABLED` | Monetag | ⭐⭐ | ⚠️ Optionnel |
| 7 | `VITE_LARAFLY_DOMAIN` | Larafly | ⭐⭐ | ⚠️ Optionnel |
| 8 | `VITE_LARAFLY_ZONE_ID` | Larafly | ⭐⭐ | ⚠️ Optionnel |
| 9 | `VITE_LARAFLY_ENABLED` | Larafly | ⭐⭐ | ⚠️ Optionnel |
| 10 | `VITE_IP_API_ENABLED` | IP Lookup | ⭐⭐ | ⚠️ Optionnel |
| 11 | `VITE_ANTI_BOT_ENABLED` | Sécurité | ⭐⭐ | ⚠️ Optionnel |
| 12 | `VITE_BLOCK_VPN` | Sécurité | ⭐⭐ | ⚠️ Optionnel |
| 13 | `VITE_BLOCK_DATACENTER` | Sécurité | ⭐⭐ | ⚠️ Optionnel |
| 14 | `VITE_TRACKING_ENABLED` | Analytics | ⭐ | ⚠️ Optionnel |

---

## 1️⃣ SUPABASE - Authentification & Base de Données

### Pourquoi ?
- Gérer les comptes utilisateur (inscription/connexion)
- Stocker les profils utilisateur (pseudo, email)
- Base de données backend pour votre app

### Comment obtenir ?

#### Étape 1: Créer un compte Supabase
1. Aller sur https://supabase.com
2. Cliquer **"Start your project"**
3. S'inscrire avec Google/GitHub (gratuit)

#### Étape 2: Créer un nouveau projet
1. Cliquer **"New Project"**
2. Remplir les informations:
   - **Project Name**: `web-iptv`
   - **Database Password**: Génère aléatoire (à sauvegarder!)
   - **Region**: Europe (si possible) ou votre région
3. Cliquer **"Create New Project"** → ⏳ Attendre 2-3 minutes

#### Étape 3: Récupérer les clés API
1. Aller à **Settings → API**
2. Copier:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon key** → `VITE_SUPABASE_ANON_KEY`

#### Étape 4: Créer la table `profiles` (optionnel, pour les pseudos)
1. Aller à **SQL Editor**
2. Cliquer **"New Query"**
3. Copier ce code:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  pseudo TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (true);
```
4. Cliquer **"Run"** (bouton en haut à droite)

### Exemple de variables:
```
VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3BxcnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ1MzI5OTksImV4cCI6MTk5OTk5OTk5OX0.abcdefg...
```

---

## 2️⃣ TELEGRAM BOT - Notifications & Tracking IP

### Pourquoi ?
- Recevoir des notifications quand quelqu'un visite votre site
- Tracker les IPs, ISP, Pays
- **Alerte automatique si VPN/Proxy/Datacenter détecté**
- Tous les messages envoyés dans un groupe privé Telegram

### Comment obtenir ?

#### Étape 1: Créer un bot Telegram
1. Ouvrir Telegram → Rechercher **@BotFather**
2. Cliquer sur le profil → **Send Message**
3. Envoyer: `/newbot`
4. @BotFather répond:
   - **Choose a name for your bot**: `Web IPTV Notifications`
   - **Choose a username for your bot**: `web_iptv_notif_bot` (doit finir par `_bot`)
5. @BotFather vous donne le **TOKEN**:
   ```
   Done! Congratulations on your new bot. You will find it at t.me/web_iptv_notif_bot. 
   You can now add a description, about section and commands for your bot. 
   
   Use this token to access the HTTP API:
   123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
   ```
6. Copier le TOKEN → `TELEGRAM_BOT_TOKEN`

#### Étape 2: Créer un groupe Telegram privé
1. Ouvrir Telegram
2. Créer un **Nouveau groupe** → `Web IPTV Logs`
3. Ajouter le bot au groupe:
   - Taper `/` dans le groupe
   - Ajouter le bot comme membre du groupe

#### Étape 3: Récupérer le CHAT ID
1. Envoyer un message quelconque dans le groupe
2. Ouvrir ce lien dans le navigateur:
   ```
   https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates
   ```
   Remplacer `{YOUR_TOKEN}` par votre TOKEN
3. Vous verrez un JSON comme:
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "chat": {
             "id": -987654321,  ← COPIER CE CHIFFRE (commence par -)
             "title": "Web IPTV Logs",
             "type": "group"
           }
         }
       }
     ]
   }
   ```
4. Copier le `chat.id` (négatif) → `TELEGRAM_CHAT_ID`

### Exemple de variables:
```
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
TELEGRAM_CHAT_ID=-987654321
```

### Notifications que vous recevrez:
- ✅ **Nouvelle visite**: IP, FAI, Pays, Mobile/Desktop
- 🚫 **Blocage**: VPN/Proxy ou Datacenter détecté
- ⚠️ **Erreurs**: Si quelque chose ne fonctionne pas

---

## 3️⃣ MONETAG - Publicités & Monétisation

### Pourquoi ?
- Afficher des **publicités** sur votre site
- **Générer des revenus** publicitaires
- API gratuite, pas de limite d'impressions

### Comment obtenir ?

#### Étape 1: Créer un compte Monetag
1. Aller sur https://monetag.com
2. Cliquer **"Sign Up"** → Créer un compte
3. Vérifier l'email

#### Étape 2: Ajouter votre site
1. Aller à **Dashboard → My Sites**
2. Cliquer **"Add Website"**
3. Remplir:
   - **Website URL**: `https://votre-domaine.digital-plate`
   - **Site Name**: `Web IPTV Player`
   - **Category**: `Entertainment` ou `Streaming`
4. Cliquer **"Add"**

#### Étape 3: Récupérer le Site ID
1. Aller à **Dashboard → My Sites**
2. Cliquer sur votre site
3. Copier le **Site ID** → `VITE_MONETAG_SITE_ID`

### Exemple de variables:
```
VITE_MONETAG_SITE_ID=a1b2c3d4e5f6g7h8i9j0k
VITE_MONETAG_ENABLED=true
```

### Où apparaissent les annonces ?
- En haut du lecteur vidéo
- En bas du lecteur vidéo
- Dans la barre latérale (sur desktop)

---

## 4️⃣ LARAFLY - Réseau Publicitaire Alternatif

### Pourquoi ?
- **Réseau publicitaire alternatif** à Monetag
- **Génère des revenus** via service worker
- **Monétisation dual** (Monetag + Larafly ensemble)
- Injection automatique d'annonces par domaine

### Comment obtenir ?

#### Étape 1: Accéder à Larafly
1. Aller sur https://3nbf4.com (ou votre domaine Larafly)
2. Créer un compte gratuit
3. Vérifier l'email

#### Étape 2: Ajouter votre site
1. Aller à **Dashboard → Add Site**
2. Remplir:
   - **Website URL**: `https://votre-domaine.digital-plate`
   - **Site Name**: `Web IPTV Player`
3. Cliquer **"Add"**

#### Étape 3: Récupérer Domain et Zone ID
1. Aller à **Dashboard → My Sites**
2. Cliquer sur votre site
3. Copier:
   - **Domain**: `3nbf4.com` → `VITE_LARAFLY_DOMAIN`
   - **Zone ID**: ex. `11244621` → `VITE_LARAFLY_ZONE_ID`

### Exemple de variables:
```
VITE_LARAFLY_DOMAIN=3nbf4.com
VITE_LARAFLY_ZONE_ID=11244621
VITE_LARAFLY_ENABLED=true
```

### Comment ça fonctionne ?
1. **Service Worker** enregistré au démarrage
2. **Script Larafly** chargé dynamiquement
3. **Annonces injectées** automatiquement par le domaine
4. **Monitoring** via console logs en développement

### Différence avec Monetag ?
| Aspect | Monetag | Larafly |
|--------|---------|---------|
| Méthode | Direct (script) | Service Worker |
| Placement | Top/Bottom | Injection domaine |
| Monétisation | Via impressions | Via domain |
| Compatible | Oui (dual) | Oui (dual) |

---

## 6️⃣ IP API - Détection VPN/Proxy/ISP

### Pourquoi ?
- Récupérer automatiquement l'**IP, ISP, Pays** du visiteur
- Détecter les **VPN, Proxies, Datacenters**
- Bloquer automatiquement les **bots**
- Envoyer une **alerte Telegram** si bloqué

### Service utilisé:
- **IP-API.com** (gratuit, 45 req/min)
- Pas de clé API requise pour la version gratuite
- Données: IP, ISP, Org, Pays, Ville, Proxy, Hosting, Mobile

### Variables:
```
VITE_IP_API_ENABLED=true                    # Activer/désactiver
VITE_IP_API_TIMEOUT=5000                    # 5 secondes
VITE_ANTI_BOT_ENABLED=true                  # Activation blocage
VITE_BLOCK_VPN=true                         # Bloquer les VPN
VITE_BLOCK_DATACENTER=true                  # Bloquer les datacenters
```

### Logique de blocage:
```
Si (VPN détecté ET VITE_BLOCK_VPN=true) → BLOQUÉ 🚫
Si (Datacenter détecté ET VITE_BLOCK_DATACENTER=true) → BLOQUÉ 🚫
Sinon → Accès autorisé ✅
```

### Exemple d'alerte Telegram bloquée:
```
🚫 BLOCAGE ANTI-BOT

IP: 203.0.113.42
FAI: Amazon Web Services
Pays: United States
Ville: Virginia

Détection:
Proxy/VPN: ✅ OUI
Datacenter/Hosting: ✅ OUI
Mobile: ❌ NON

Page: https://votre-domaine.digital-plate/#/
Temps: 2024-01-15 14:30:45
```

---

## 7️⃣ TRACKING - Analytics

### Variables:
```
VITE_TRACKING_ENABLED=true                  # Envoyer notifications Telegram
```

### Quand déactiver ?
- Si vous respectez le RGPD strict
- Si vous ne voulez pas de notifications Telegram
- Garder les autres fonctionnalités (Monetag, anti-bot)

---

## 📝 FICHIER .env - OÙ AJOUTER LES CLÉS ?

### Option 1: En développement local (`.env.local`)
Créer un fichier `.env.local` à la racine du projet:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
VITE_MONETAG_SITE_ID=...
VITE_MONETAG_ENABLED=true
VITE_LARAFLY_DOMAIN=3nbf4.com
VITE_LARAFLY_ZONE_ID=11244621
VITE_LARAFLY_ENABLED=true
VITE_IP_API_ENABLED=true
VITE_ANTI_BOT_ENABLED=true
VITE_BLOCK_VPN=true
VITE_BLOCK_DATACENTER=true
VITE_TRACKING_ENABLED=true
```

### Option 2: Sur Vercel (recommandé pour production)
1. Aller sur https://vercel.com → **Settings**
2. Cliquer **"Environment Variables"**
3. Ajouter chaque variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: votre URL Supabase
4. Répéter pour toutes les variables
5. Cliquer **"Save"** après chaque ajout

---

## ✅ CHECKLIST - ÉTAPES À SUIVRE

- [ ] **Supabase**: Créer projet + récupérer URL + anon key
- [ ] **Telegram**: Créer bot via @BotFather + groupe privé + récupérer token + chat ID
- [ ] **Monetag**: Créer compte + ajouter site + récupérer site ID
- [ ] **Ajouter toutes les variables** dans `.env.local` ou Vercel Settings
- [ ] **Tester en local**: `npm run dev` → vérifier console pour les logs `[v0] ...`
- [ ] **Déployer**: `git push` → Vercel redéploie automatiquement
- [ ] **Vérifier Telegram**: Vous recevez les notifications ?
- [ ] **Vérifier Monetag**: Les annonces s'affichent ?

---

## 🔒 SÉCURITÉ - IMPORTANT !

⚠️ **NE JAMAIS** commiter le `.env` réel sur GitHub!

```bash
# Ajouter à .gitignore (déjà fait)
.env
.env.local
.env.*.local
```

✅ **Ce qui est OK de partager**:
- `.env.example` (avec placeholders)
- Code source (sans secrets)
- Configuration publique

❌ **Ce qui ne doit JAMAIS être partagé**:
- `VITE_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- Mots de passe
- Tokens privés

---

## 🚀 DÉPLOIEMENT FINAL

### Sur Vercel:
```bash
git add .
git commit -m "Intégration Monetag + Telegram Bot"
git push origin main
```

→ Vercel redéploie automatiquement en ~2 minutes

### Vérifier sur production:
1. Ouvrir https://votre-domaine.digital-plate
2. Vous recevez une notification Telegram ? ✅
3. Les annonces Monetag s'affichent ? ✅
4. Si VPN, vous êtes bloqué ? ✅

---

## 🆘 TROUBLESHOOTING

### Je ne reçois pas de notifications Telegram
- ✅ Vérifier que `TELEGRAM_BOT_TOKEN` est correct
- ✅ Vérifier que `TELEGRAM_CHAT_ID` est correct (négatif !)
- ✅ Vérifier que le bot est membre du groupe
- ✅ Vérifier que `VITE_TRACKING_ENABLED=true`
- ✅ Ouvrir console navigateur (F12) → chercher `[Tracking]` logs

### Les annonces Monetag ne s'affichent pas
- ✅ Vérifier que `VITE_MONETAG_ENABLED=true`
- ✅ Vérifier que `VITE_MONETAG_SITE_ID` est correct
- ✅ Attendre que le site soit approuvé par Monetag (24-48h)
- ✅ Ouvrir console → chercher `[Monetag]` logs

### Je suis bloqué par erreur (VPN légitime)
- Désactiver `VITE_BLOCK_VPN=false` ou `VITE_BLOCK_DATACENTER=false`
- Redéployer: `git push`
- Nettoyer sessionStorage du navigateur (F12 → Application → Clear storage)

### Erreur "Supabase not configured"
- ✅ Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- ✅ Redémarrer le serveur: `npm run dev`

---

## 📚 RESSOURCES

- **Supabase Docs**: https://supabase.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Monetag Dashboard**: https://monetag.com/dashboard
- **IP-API**: https://ip-api.com/docs

---

**Vous avez toutes les infos ! 🚀 C'est parti pour le déploiement !**
