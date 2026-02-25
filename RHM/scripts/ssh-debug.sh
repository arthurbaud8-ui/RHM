#!/bin/bash

# Script pour SSH dans le container Fly.io et diagnostiquer les problèmes

APP_NAME="rhm-app"

echo "🔧 Debug SSH - $APP_NAME"
echo "========================"
echo ""

# Vérifier si flyctl est disponible
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI n'est pas installé"
    exit 1
fi

FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

echo "Connexion SSH au container..."
echo ""
echo "Commandes utiles une fois connecté:"
echo "  ps aux | grep node          # Vérifier si le backend tourne"
echo "  ps aux | grep nginx         # Vérifier si nginx tourne"
echo "  curl http://127.0.0.1:3001/health  # Tester le backend"
echo "  curl http://localhost/api/health    # Tester via nginx"
echo "  cat /tmp/backend.log        # Voir les logs du backend"
echo "  tail -f /tmp/backend.log   # Suivre les logs en temps réel"
echo "  env | grep -E '(JWT|CORS|OPENAI)'  # Voir les variables d'environnement"
echo "  netstat -tuln | grep 3001   # Vérifier que le port 3001 est ouvert"
echo ""

$FLY_CMD ssh console -a "$APP_NAME"
