# 🎪 INTÉGRATION LARAFLY - GUIDE COMPLET

## Vue d'ensemble

Larafly a été complètement intégré à votre lecteur IPTV avec **monétisation dual** (Monetag + Larafly). Les deux réseaux fonctionnent ensemble pour maximiser les revenus publicitaires.

---

## Architecture Larafly

### 1. Service Worker (`public/sw.js`)

Le service worker Larafly est enregistré au démarrage de l'application:
- Domaine: `3nbf4.com` (configurable via `VITE_LARAFLY_DOMAIN`)
- Zone ID: `11244621` (configurable via `VITE_LARAFLY_ZONE_ID`)
- Gère l'injection automatique d'annonces
- Survit au rechargement de page

### 2. Service Larafly (`src/services/laraflyService.js`)

Gère l'initialisation et le cycle de vie:

#### Fonctions principales:

```javascript
// Initialiser Larafly au démarrage
await initLarafly()

// Rafraîchir les annonces
refreshLaraflyAds()

// Vérifier si chargé
isLaraflyLoaded()

// Récupérer la configuration
getLaraflyConfig()

// Nettoyer à la fermeture
await unloadLarafly()
```

### 3. Intégration App.vue

Larafly s'initialise automatiquement dans `onMounted()`:

```javascript
// Initialiser le tracking, Monetag et Larafly
initMonetag()
initLarafly()
```

Chaque service s'exécute indépendamment sans dépendances.

---

## Configuration

### Variables d'environnement

```bash
# Domaine Larafly (défaut: 3nbf4.com)
VITE_LARAFLY_DOMAIN=3nbf4.com

# Zone ID Larafly (défaut: 11244621)
VITE_LARAFLY_ZONE_ID=11244621

# Activer/désactiver Larafly (true/false)
VITE_LARAFLY_ENABLED=true
```

### Où ajouter les variables?

**Développement local:**
Créer `.env.local` à la racine:
```
VITE_LARAFLY_DOMAIN=3nbf4.com
VITE_LARAFLY_ZONE_ID=11244621
VITE_LARAFLY_ENABLED=true
```

**Production (Vercel):**
Settings → Environment Variables → Ajouter les 3 variables

---

## Monétisation Dual

### Monetag vs Larafly

| Aspect | Monetag | Larafly |
|--------|---------|---------|
| Méthode | Script direct | Service Worker |
| Placement | Top/Bottom explicit | Injection domaine |
| API | Direct | Service worker + script |
| Configuration | Site ID | Domain + Zone ID |
| Service Worker | Non requis | Requis |
| Compatibilité | 100% | 100% |
| Revenu | Par impression | Par placement |

### Comment les deux travaillent ensemble?

```
App.vue onMounted()
    ↓
initMonetag() → Charge script Monetag
initLarafly() → Enregistre SW + charge Larafly script
    ↓
Les deux réseaux fonctionnent en parallèle
    ↓
Monétisation dual maximale
```

### Résultat final

L'utilisateur voit:
1. **Annonces Monetag** (top/bottom du lecteur)
2. **Annonces Larafly** (injectées par domaine)

Les deux générent des revenus en même temps.

---

## Déploiement

### Build local

```bash
npm install --legacy-peer-deps
npm run build
```

Build inclut:
- ✅ Service worker dans `dist/sw.js`
- ✅ Code Larafly optimisé
- ✅ Configuration en variables d'env

### Déployer sur Vercel

```bash
git push origin main
```

Vercel automatiquement:
1. Reconstruit le projet
2. Déploie incluant le service worker
3. Les variables d'env sont appliquées

### Vérifier le déploiement

```bash
# Vérifier que le SW existe
curl https://votre-domaine.digital-plate/sw.js

# Ouvrir l'app et vérifier les logs
F12 → Console → Chercher "[Larafly"
```

---

## Dépannage

### Service worker ne s'enregistre pas

**Symptôme:** Pas de message `[Larafly SW] Installing service worker`

**Solutions:**
1. Vérifier HTTPS activé (requis pour SW)
2. Vérifier `VITE_LARAFLY_ENABLED=true`
3. Ouvrir F12 → Application → Service Workers
4. Vérifier les permissions du navigateur

### Larafly ne se charge pas

**Symptôme:** Pas de script chargé depuis 3nbf4.com

**Solutions:**
1. Vérifier domaine et zone ID corrects
2. Vérifier `VITE_LARAFLY_ENABLED=true`
3. Vérifier dans F12 → Network → Chercher 3nbf4.com
4. Vérifier que le site est approuvé sur Larafly

### Conflit avec Monetag

**Symptôme:** Annonces Monetag ne s'affichent pas après Larafly

**Solutions:**
1. Les deux doivent s'initialiser séparément (déjà fait)
2. Vérifier que les deux sont enabled
3. Vérifier dans Console → aucun erreur
4. Attendre approbation des deux réseaux (24-48h)

---

## Debugging

### Logs console

Larafly écrit dans la console (développement):

```
[Larafly] Disabled by configuration
[Larafly] Service worker registered: [object ServiceWorkerRegistration]
[Larafly] Script loaded successfully
[Larafly] Initialized
[Larafly] Ads refreshed
[Larafly] Unloaded
```

### Vérifier configuration

```javascript
// Dans la console du navigateur:
window.larafly_config
// Devrait afficher:
// {domain: "3nbf4.com", zoneId: 11244621}
```

### Monitorer Larafly

```javascript
// Dans console:
navigator.serviceWorker.getRegistrations()
// Devrait inclure le SW enregistré

window.lary
// Devrait être défini si Larafly chargé
```

---

## Fichiers créés/modifiés

### Créés

- `public/sw.js` - Service worker Larafly
- `src/services/laraflyService.js` - Service Larafly complet
- `LARAFLY_INTEGRATION.md` - Ce document

### Modifiés

- `src/App.vue` - Ajout initLarafly()
- `.env.example` - Ajout 3 variables
- `API_KEYS_GUIDE.md` - Section Larafly complète
- `API_KEYS_GUIDE.md` - Mise à jour table résumé

---

## Checklist de déploiement

- [ ] Variables d'env configurées localement (`.env.local`)
- [ ] Build local fonctionne: `npm run build`
- [ ] Service worker présent dans `dist/sw.js`
- [ ] Pas d'erreurs en console
- [ ] `git push origin main`
- [ ] Vercel redéploie sans erreurs
- [ ] Variables d'env ajoutées sur Vercel Settings
- [ ] HTTPS activé sur domaine
- [ ] Service worker enregistré (F12 → Application)
- [ ] Larafly script chargé (F12 → Network)
- [ ] Annonces Larafly visibles (après approbation)
- [ ] Annonces Monetag visibles (après approbation)

---

## Prochaines étapes

1. **Ajouter variables sur Vercel:**
   - `VITE_LARAFLY_DOMAIN=3nbf4.com`
   - `VITE_LARAFLY_ZONE_ID=11244621`
   - `VITE_LARAFLY_ENABLED=true`

2. **Attendre approbation Larafly:**
   - 24-48h avant que les annonces s'affichent
   - Site doit être approuvé pour le domaine

3. **Tester en production:**
   - Vérifier que SW enregistré
   - Vérifier que script Larafly chargé
   - Vérifier que Monetag + Larafly coexistent

4. **Monitorer revenus:**
   - Dashboard Larafly: impressions/clics
   - Dashboard Monetag: revenus distincts
   - Vercel Analytics pour le trafic

---

## Support

Pour l'intégration Larafly:
- Consulter: **API_KEYS_GUIDE.md** (section Larafly)
- Consulter: **COMPLETE_INTEGRATION_SUMMARY.md**
- Console logs en développement
- Dashboard Larafly pour le statut

---

**Larafly est maintenant entièrement intégré et prêt pour la production!** 🎪
