# Auto-École Maroc — Application de Gestion

Application web multi-tenant de gestion d'auto-école construite avec **Next.js 14**, **PostgreSQL** et **Tailwind CSS**.

---

## 🚀 Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
```
Remplissez `.env` :
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="votre-secret-jwt-au-moins-32-caracteres"
DATABASE_SSL="true"          # false pour local
UPLOAD_DIR=""                # laisser vide pour utiliser ./uploads
```

### 3. Initialiser la base de données
Visitez `http://localhost:3000/api/init` pour créer les tables.

### 4. Lancer le serveur
```bash
npm run dev
```

---

## 🔑 Identifiants par défaut

| Rôle | Utilisateur | Mot de passe |
|------|-------------|--------------|
| Super Admin | `Login` | `Login@2026` |

**Changez ces identifiants immédiatement en production.**

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/                       # Routes API (Next.js Route Handlers)
│   │   ├── auth/route.js          # Authentification JWT
│   │   ├── students/route.js      # CRUD étudiants
│   │   ├── payments/route.js      # Paiements
│   │   ├── attendance/route.js    # Présences QR
│   │   ├── stages/route.js        # Stages & examens
│   │   ├── invoices/route.js      # Factures
│   │   ├── alerts/route.js        # Alertes automatiques
│   │   ├── offers/route.js        # Offres de formation
│   │   ├── settings/route.js      # Paramètres école
│   │   ├── incidents/route.js     # Incidents
│   │   ├── payment-schedules/     # Échéanciers
│   │   ├── files/route.js         # Upload fichiers
│   │   ├── ecoles/[slug]/         # Info publique école
│   │   └── super-admin/           # Routes super-admin
│   ├── login/page.jsx             # Connexion super-admin
│   ├── [slug]/                    # Portail multi-tenant
│   │   ├── layout.jsx             # Sidebar + navigation
│   │   ├── page.jsx               # Tableau de bord
│   │   ├── login/page.jsx         # Connexion école
│   │   ├── students/              # Gestion étudiants
│   │   ├── attendance/            # Scanner QR code
│   │   ├── presences-absences/    # Liste présences
│   │   ├── obtenir-permis/        # Permis obtenus
│   │   ├── stages/                # Stages & examens
│   │   ├── payments/              # Paiements
│   │   ├── invoices/              # Factures
│   │   ├── alerts/                # Alertes
│   │   ├── offers/                # Offres
│   │   └── settings/              # Paramètres
│   └── super-admin/               # Panneau super-admin
│       ├── page.jsx               # Dashboard global
│       └── ecoles/                # Gestion des écoles
├── lib/
│   ├── db.js                      # Toutes les opérations base de données
│   ├── auth.js                    # JWT helpers
│   ├── tenant.js                  # Context multi-tenant
│   ├── storage.js                 # Upload fichiers (local)
│   ├── rateLimit.js               # Rate limiting connexion
│   ├── validation.js              # Validation des données
│   ├── api.js                     # Client API côté client
│   └── AuthContext.jsx            # Context React authentification
└── middleware.js                  # Protection des routes
```

---

## 🌐 Fonctionnalités

### Multi-tenant
- Chaque auto-école a son propre sous-espace `/[slug]`
- Isolation complète des données par `auto_ecole_id`
- Un super-admin gère toutes les écoles

### Gestion étudiants
- Fiche complète (CIN, photo, permis, statut)
- Code QR unique par étudiant
- Suivi paiements avec échéancier
- Historique présences et stages

### Scanner QR
- Scan via caméra (html5-qrcode)
- Saisie manuelle du code
- Enregistrement entrée/sortie automatique

### Alertes automatiques
- Paiements en retard ou à venir
- Formations expirées ou se terminant
- Stages planifiés du jour
- Rappels personnalisés

### Finances
- Paiements (Cash, Virement, Chèque, TPE)
- Échéanciers de paiement
- Factures numérotées automatiquement
- Tableau de bord revenus

---

## 🗄️ Base de données

Les tables sont créées automatiquement au premier appel de `/api/init`.

Tables principales : `auto_ecoles`, `admins`, `students`, `attendance`, `payments`, `payment_schedules`, `stages`, `invoices`, `documents`, `offers`, `settings`, `incidents`

---

## 🚢 Déploiement

### Variables d'environnement requises
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<secret-32-chars-minimum>
DATABASE_SSL=true
```

### Build production
```bash
npm run build
npm start
```

### Docker (recommandé)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📝 Notes importantes

1. **Initialisation** : Appelez `/api/init` une seule fois après déploiement
2. **Sécurité** : Changez `Login@2026` immédiatement
3. **JWT_SECRET** : Minimum 32 caractères, conservez-le secret
4. **Uploads** : Les fichiers sont stockés en base64 dans PostgreSQL par défaut
5. **SSL** : Mettez `DATABASE_SSL=false` pour PostgreSQL local sans SSL
