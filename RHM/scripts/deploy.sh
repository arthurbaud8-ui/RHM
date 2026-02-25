#!/usr/bin/env bash
# RHM - Script de déploiement (Railway ou manuel)
# Usage : ./scripts/deploy.sh [railway|render|docker]

set -e
RHM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RHM_ROOT"

usage() {
  echo "Usage: $0 [railway|render|docker]"
  echo ""
  echo "  railway  - Déploiement sur Railway (CLI requise)"
  echo "  render  - Affiche les instructions pour Render.com"
  echo "  docker   - Build image single-container (pour tout hébergeur Docker)"
  echo ""
}

# Vérifier que .env existe et a au moins JWT_SECRET
check_env() {
  if [ ! -f .env ]; then
    echo "⚠️  Fichier .env absent. Lancez d'abord : ./scripts/setup-env.sh"
    echo "   Puis éditez .env pour la production (CORS_ORIGIN = URL publique)."
    exit 1
  fi
  if grep -q 'JWT_SECRET=change-me-in-production' .env 2>/dev/null || grep -q 'JWT_SECRET=$' .env 2>/dev/null; then
    echo "⚠️  Définissez un JWT_SECRET sécurisé dans .env (openssl rand -base64 32)"
    exit 1
  fi
}

# Build image Docker fullstack (pour push vers registry ou déploiement manuel)
cmd_docker() {
  check_env
  echo "📦 Build de l'image Docker fullstack (frontend + backend + nginx)..."
  docker build -f Dockerfile.deploy -t rhm:latest .
  echo "✅ Image construite : rhm:latest"
  echo ""
  echo "Pour lancer en local avec persistance des données :"
  echo "  docker run -p 8080:80 -v rhm-data:/data -e JWT_SECRET=\$(openssl rand -base64 32) -e CORS_ORIGIN=http://localhost:8080 --env-file .env rhm:latest"
  echo ""
  echo "Pour pousser vers un registry (ex. Docker Hub) :"
  echo "  docker tag rhm:latest VOTRE_USER/rhm:latest && docker push VOTRE_USER/rhm:latest"
}

# Déploiement Railway
cmd_railway() {
  check_env
  if ! command -v railway 2>/dev/null; then
    echo "❌ Railway CLI non installée."
    echo "   Installation : npm i -g @railway/cli   ou   https://docs.railway.app/develop/cli"
    exit 1
  fi
  echo "🔗 Connexion à Railway..."
  railway login 2>/dev/null || true
  railway link 2>/dev/null || { echo "Créez un projet sur https://railway.app puis relancez."; exit 1; }
  echo ""
  echo "📤 Déploiement (Dockerfile.deploy) avec volume /data pour la persistance..."
  railway up
  echo ""
  echo "📌 Créer un volume pour les données : Railway Dashboard → votre service → Variables → Volumes → Add volume, mount path: /data"
  echo "   Puis redéployer. Les variables JWT_SECRET et CORS_ORIGIN doivent être définies (Settings → Variables)."
  echo ""
  echo "✅ Déploiement lancé. URL : railway open"
}

# Instructions Render
cmd_render() {
  echo "📋 Déploiement sur Render.com"
  echo ""
  echo "1. Poussez votre code sur GitHub."
  echo "2. Allez sur https://dashboard.render.com → New → Web Service."
  echo "3. Connectez le dépôt, puis :"
  echo "   - Build : Docker (ou utilisez le Dockerfile.deploy à la racine)."
  echo "   - Root Directory : (laisser vide, racine du repo)."
  echo "   - Dockerfile path : Dockerfile.deploy"
  echo "   - Instance : Free (ou paid pour disque persistant)."
  echo "4. Variables d'environnement (Environment) :"
  echo "   - JWT_SECRET  = (générer avec openssl rand -base64 32)"
  echo "   - CORS_ORIGIN = https://VOTRE-APP.onrender.com (sans slash final)"
  echo "5. Pour persister les données : ajoutez un Disk (paid) monté sur /data,"
  echo "   et définissez DATA_FILE=/data/rhm-data.json"
  echo "   (Sans disk, les données sont perdues à chaque redéploiement.)"
  echo ""
  echo "Voir aussi DEPLOY.md pour l’option Blueprint (render.yaml)."
}

case "${1:-}" in
  railway) cmd_railway ;;
  render)  cmd_render ;;
  docker)  cmd_docker ;;
  *)       usage; exit 0 ;;
esac
