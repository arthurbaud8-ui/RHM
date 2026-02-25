#!/usr/bin/env bash
# Déploiement RHM sur VPS : pull, build front + back, restart PM2.
# À exécuter sur le VPS depuis la racine du projet (où se trouvent app/ et frontend/).
# Usage: ./scripts/deploy-vps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "🔄 Déploiement RHM (VPS)"
echo "   Racine: $ROOT"
echo ""

# Optionnel : pull (commenter si tu déploies sans git)
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "📥 git pull..."
  git pull
  echo ""
fi

# Backend
echo "📦 Backend: npm ci + build..."
cd "$ROOT/app/backend"
npm ci
npm run build
echo "   Backend OK"
echo ""

# Frontend (API en relatif /api pour le même domaine)
echo "📦 Frontend: npm ci + build (VITE_API_URL=/api)..."
cd "$ROOT/frontend"
export VITE_API_URL=/api
npm ci
npm run build
echo "   Frontend OK"
echo ""

# Redémarrer le backend sous PM2
if command -v pm2 >/dev/null 2>&1; then
  echo "🔄 Redémarrage PM2 (rhm-backend)..."
  cd "$ROOT/app/backend"
  pm2 restart rhm-backend --update-env || pm2 start dist/server.js --name rhm-backend
  pm2 save
  echo "   PM2 OK"
else
  echo "⚠️  PM2 non trouvé. Pensez à redémarrer le backend manuellement."
fi

echo ""
echo "✅ Déploiement terminé."
