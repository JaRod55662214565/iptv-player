# 🚀 Guide de Déploiement - Web IPTV

## 1. Prérequis
- ✅ Nom de domaine Digital Plate
- ✅ Compte Cloudflare gratuit
- ✅ Compte Vercel gratuit
- ✅ Dépôt GitHub (fork du web-iptv)

## 2. Étapes de déploiement

### A. Préparation GitHub
```bash
# Le projet est déjà cloné et prêt
# Assurez-vous que vous avez poussé vers votre repo GitHub
git remote -v  # Vérifier l'URL
git push -u origin main
```

### B. Déploiement sur Vercel

1. **Allez sur vercel.com**
   - Connectez-vous avec votre compte GitHub
   
2. **Importez le projet**
   - Cliquez sur "New Project"
   - Sélectionnez votre dépôt `web-iptv`
   - Vercel détecte automatiquement Vue.js + Vite
   - Les commandes sont déjà configurées dans `vercel.json`

3. **Variables d'environnement (optionnel)**
   - Si vous utilisez Supabase Auth, ajoutez :
     ```
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_KEY=xxxxxxxx
     ```

4. **Déployez**
   - Cliquez sur "Deploy"
   - Vercel va générer une URL temporaire (ex: `web-iptv.vercel.app`)

### C. Configuration du domaine Digital Plate sur Cloudflare

1. **Pointez votre domaine vers Vercel**
   - Dans votre panneau de contrôle Digital Plate
   - Accédez aux DNS ou paramètres de domaine
   - Changez les nameservers vers Cloudflare :
     ```
     NS1: blake.ns.cloudflare.com
     NS2: clara.ns.cloudflare.com
     ```
     *(Les nameservers exactes vous seront donnés par Cloudflare)*

2. **Configurez Vercel dans Cloudflare**
   - Allez sur votre zone Cloudflare
   - Ajoutez un nouvel enregistrement DNS :
     ```
     Type: CNAME
     Nom: @ (ou votre-domaine.digital-plate)
     Contenu: cname.vercel-dns.com
     TTL: Auto
     Proxy: Proxied (orange cloud)
     ```

3. **Liez le domaine à votre projet Vercel**
   - Dans Vercel → Project Settings → Domains
   - Ajoutez votre domaine Digital Plate
   - Vercel va vérifier la configuration DNS

4. **Activez HTTPS**
   - Cloudflare génère automatiquement un certificat SSL gratuit
   - Allez dans Cloudflare → SSL/TLS → Chiffrement
   - Choisissez "Full" ou "Full (strict)" pour plus de sécurité

### D. Configuration recommandée Cloudflare (optionnel)
Dans Cloudflare Dashboard → Règles de Page :

```
URL: example.digital-plate/*
- Activer l'optimisation du cache
- Minifier automatiquement CSS/JS
- Activer Rocket Loader pour les scripts
```

## 3. Vérification

```bash
# Testez votre domaine
curl -I https://votre-domaine.digital-plate

# Ou ouvrez dans le navigateur :
# https://votre-domaine.digital-plate
```

### Résultat attendu :
- ✅ Page IPTV charge correctement
- ✅ Lecteur vidéo responsive
- ✅ HTTPS activé (cadenas vert)
- ✅ Vitesse optimisée (Cloudflare cache)

## 4. Déploiement continu

Une fois configuré :
- Chaque `push` sur GitHub déclenche un redéploiement automatique
- Les changements apparaissent sur votre domaine en ~1-2 minutes
- Cloudflare met en cache le contenu statique (assets)

## 5. Troubleshooting

| Problème | Solution |
|----------|----------|
| DNS ne se met pas à jour | Attendre 24h-48h (TTL) |
| Page blanche | Vérifier les logs Vercel (Deployments tab) |
| Erreur Supabase | Vérifier les variables d'env dans Vercel |
| Cloudflare bloque la page | Désactiver le mode "Challenge" en Caching → Cache Rules |
| Vidéo ne joue pas | Vérifier que la playlist M3U est accessible |

## 6. Statistiques

- **Coûts** : 0€ (Vercel Free + Cloudflare Free)
- **Temps de réponse** : ~100-200ms (via CDN Cloudflare)
- **Uptime** : 99.9% (garanti par Vercel)
- **Bande passante** : Illimitée sur Vercel Free

---

**Besoin d'aide ?** Consultez :
- 📖 [Docs Vercel](https://vercel.com/docs)
- 📖 [Docs Cloudflare](https://developers.cloudflare.com)
- 📖 [Docs Vue 3 + Vite](https://vitejs.dev/guide)
