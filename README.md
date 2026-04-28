# ChroMind — Guide de déploiement

## Structure du projet
```
chromind/
├── index.html       ← App principale
├── manifest.json    ← Config PWA
├── sw.js            ← Service Worker (offline)
├── css/style.css    ← Styles
├── js/
│   ├── app.js       ← Logique du jeu
│   └── stripe.js    ← Paiements
└── icons/
    ├── icon-192.png ← Icône app (à créer)
    └── icon-512.png ← Icône store (à créer)
```

---

## ÉTAPE 1 — Créer les icônes

Va sur https://www.canva.com ou https://icon.kitchen
- Crée une icône 1024x1024 avec le logo ChroMind
- Exporte en PNG à 192x192 → `icons/icon-192.png`
- Exporte en PNG à 512x512 → `icons/icon-512.png`

---

## ÉTAPE 2 — Configurer Stripe

1. Crée un compte sur https://stripe.com (gratuit)
2. Dashboard → Developers → API Keys
3. Copie ta **Publishable key** (commence par `pk_live_...`)
4. Dans `js/stripe.js`, remplace :
   ```
   const STRIPE_PUBLIC_KEY = 'pk_live_VOTRE_CLE_STRIPE_ICI';
   ```
5. Crée un backend simple (Node.js recommandé) pour créer les PaymentIntents
   - Hébergement backend gratuit : https://railway.app ou https://render.com

---

## ÉTAPE 3 — Déployer sur Vercel (gratuit)

1. Crée un compte sur https://github.com
2. Crée un nouveau repository "chromind"
3. Upload tous les fichiers
4. Va sur https://vercel.com → "Import from GitHub"
5. Sélectionne ton repo → Deploy
6. Ton jeu est en ligne à : `https://chromind.vercel.app`

---

## ÉTAPE 4 — Amazon Appstore (gratuit)

1. Crée un compte développeur sur https://developer.amazon.com (gratuit)
2. Va sur https://www.pwabuilder.com
3. Entre ton URL Vercel → Generate → Amazon
4. Download le package → Upload sur Amazon Appstore
5. Soumets → validation en 1-3 jours

---

## ÉTAPE 5 — Google Play Store (25$ une fois)

Quand tu seras prêt :
1. https://play.google.com/console → créer compte (25$)
2. https://www.pwabuilder.com → Generate → Android (TWA)
3. Suis le guide pour signer et soumettre l'APK

---

## Monétisation configurée

- **Coins in-app** → Stripe Checkout (à configurer avec ton backend)
- **Pubs simulées** → 1 pub toutes les 2 game over, +30 coins si regardée
- **Cosmétiques** → 6 skins, prix entre 60 et 150 coins

---

## Support
Pour toute question sur le déploiement, utilise Claude Code.
