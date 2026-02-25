# 🚀 Guide de démarrage RHM

## 🎯 **Démarrage rapide (Recommandé)**

### Méthode 1 : Script automatique
```bash
./start.sh
```
✅ **Avantages** : Lance tout d'un coup, arrêt avec Ctrl+C

### Méthode 2 : Manuel (2 terminaux)
```bash
# Terminal 1 - Backend
cd app/backend
npm run dev

# Terminal 2 - Frontend
cd app/frontend
npm run dev
```
✅ **Avantages** : Contrôle total, logs séparés

## 🔗 **URLs des serveurs**
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001
- **Health check** : http://localhost:3001/health

## 📋 **Prérequis**
- Node.js 18+
- npm

## 🔧 **Installation initiale**
```bash
# Backend
cd app/backend
npm install

# Frontend
cd app/frontend
npm install
```

## 🧪 **Test rapide**
1. Lancer les serveurs (méthode au choix)
2. Aller sur http://localhost:3000
3. S'inscrire via le bouton "S'inscrire"
4. Explorer le dashboard !

## 🐛 **Debugging**
- **Backend non accessible** : Vérifier que le port 3001 est libre
- **Frontend erreur CORS** : Vérifier que le backend est démarré
- **"Utilisateur non trouvé"** : Normal après redémarrage backend, le système se récupère automatiquement

## 🛑 **Arrêter les serveurs**
- **Script automatique** : Ctrl+C
- **Manuel** : Ctrl+C dans chaque terminal