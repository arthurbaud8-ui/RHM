# RHM Backend API

Backend API pour la plateforme de recrutement RHM.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation

1. **Installer les dépendances**
```bash
cd app/backend
npm install
```

2. **Configuration environnement**
```bash
cp .env.example .env
# Modifier les variables dans .env selon vos besoins
```

3. **Démarrer en mode développement**
```bash
npm run dev
```

4. **Build pour production**
```bash
npm run build
npm start
```

## 📚 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

### Utilisateurs
- `GET /api/users/profile` - Profil utilisateur (authentifié)
- `PUT /api/users/profile` - Mettre à jour le profil
- `GET /api/users/test-results` - Résultats des tests

### Opportunités
- `GET /api/opportunities` - Opportunités utilisateur (authentifié)
- `PATCH /api/opportunities/:id/status` - Mettre à jour le statut

### Tests
- `GET /api/tests` - Liste des tests disponibles
- `GET /api/tests/:id` - Détails d'un test
- `POST /api/tests/:id/start` - Démarrer un test (authentifié)
- `POST /api/tests/:id/submit` - Soumettre les réponses (authentifié)

### Uploads
- `POST /api/uploads/cv` - Upload CV (authentifié)
- `POST /api/uploads/application` - Upload documents candidature

## 🔧 Configuration

### Variables d'environnement (.env)
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_FORMATS=pdf,doc,docx,txt
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗃️ Structure des données

### Stockage actuel
- **Données en mémoire** : Les données sont stockées temporairement en mémoire
- **Redémarrage** : Les données sont perdues au redémarrage du serveur
- **Migration DB** : Prêt pour intégration avec PostgreSQL/MongoDB plus tard

### Données par défaut
- Utilisateurs de test
- Tests de compétences JavaScript
- Opportunités d'emploi exemples

## 🔐 Sécurité

- **CORS** configuré pour le frontend Vue.js
- **Helmet** pour les headers de sécurité
- **Rate limiting** pour prévenir les abus
- **JWT** pour l'authentification
- **Validation** des données avec Joi
- **Upload sécurisé** avec restrictions de types et tailles

## 🧪 Tests

```bash
npm test
```

## 📱 Intégration Frontend

Le backend est configuré pour fonctionner avec le frontend Vue.js sur `http://localhost:5173`.

### Exemples d'appels API depuis le frontend

```typescript
// Inscription
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    nom: 'Doe',
    prenom: 'John', 
    email: 'john@example.com',
    password: 'password123'
  })
});

// Récupérer les opportunités (avec token)
const opportunities = await fetch('http://localhost:3001/api/opportunities', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🔄 Roadmap

### Phase actuelle : MVP sans DB
- ✅ API REST complète
- ✅ Authentification JWT
- ✅ Stockage en mémoire
- ✅ Upload de fichiers
- ✅ Tests de compétences basiques

### Phase suivante : Intégration DB
- [ ] PostgreSQL/MongoDB
- [ ] Migrations de schéma
- [ ] Persistence des données
- [ ] Cache Redis
- [ ] Sauvegarde automatique

### Fonctionnalités futures
- [ ] WebSockets pour temps réel
- [ ] Integration IA pour matching
- [ ] API analytics
- [ ] Notifications push
- [ ] Export PDF des résultats