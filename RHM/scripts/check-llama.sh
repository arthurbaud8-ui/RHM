#!/bin/bash

# Script pour vérifier le statut de Llama sur Fly.io
# Usage: ./scripts/check-llama.sh

APP_NAME="rhm-app"

echo "🔍 Vérification du statut Llama sur Fly.io"
echo "=========================================="
echo ""

# Vérifier si flyctl est disponible
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
fi

if [ -z "$FLY_CMD" ]; then
    echo "⚠️  Fly CLI n'est pas installé"
    echo ""
    echo "Pour installer Fly CLI :"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo ""
    echo "Ou utilisez le dashboard Fly.io :"
    echo "  https://fly.io/dashboard"
    echo ""
    echo "📋 Commandes manuelles sans Fly CLI :"
    echo "----------------------------------------"
    echo ""
    echo "1. Via le dashboard Fly.io :"
    echo "   - Allez sur https://fly.io/dashboard"
    echo "   - Sélectionnez votre app: $APP_NAME"
    echo "   - Cliquez sur 'Logs' pour voir les logs"
    echo "   - Cliquez sur 'Console' pour SSH dans le container"
    echo ""
    echo "2. Dans le container (via Console du dashboard) :"
    echo "   ps aux | grep llama-server"
    echo "   ls -lh /models/"
    echo "   curl http://127.0.0.1:8080/v1/models"
    echo "   tail -50 /tmp/llama.log"
    echo ""
    exit 0
fi

echo "✅ Utilisation de la commande: $FLY_CMD"
echo ""

echo "📋 1. Logs Llama (dernières 20 lignes)"
echo "----------------------------------------"
$FLY_CMD logs -a "$APP_NAME" --limit 50 | grep -i llama | tail -20 || echo "Aucun log Llama trouvé"
echo ""

echo "📋 2. Vérification via SSH"
echo "----------------------------------------"
echo "Exécutez ces commandes dans le container :"
echo ""
echo "  # Vérifier si le processus Llama tourne"
echo "  ps aux | grep llama-server"
echo ""
echo "  # Vérifier si le modèle est téléchargé"
echo "  ls -lh /models/"
echo ""
echo "  # Vérifier si Llama écoute sur le port 8080"
echo "  netstat -tlnp | grep 8080"
echo ""
echo "  # Tester l'API Llama directement"
echo "  curl http://127.0.0.1:8080/v1/models"
echo ""
echo "  # Voir les logs Llama"
echo "  tail -50 /tmp/llama.log"
echo ""
echo "Pour SSH dans le container :"
echo "  $FLY_CMD ssh console -a $APP_NAME"
echo ""

echo "📋 3. Test de l'API depuis l'extérieur"
echo "----------------------------------------"
echo "Note: L'API Llama n'est accessible que depuis le container (127.0.0.1:8080)"
echo "Pour tester depuis l'extérieur, vous devez SSH dans le container."
echo ""

echo "📋 4. Vérification du modèle"
echo "----------------------------------------"
echo "Pour vérifier si le modèle est téléchargé :"
echo "  $FLY_CMD ssh console -a $APP_NAME -C 'ls -lh /models/'"
echo ""

echo "📋 5. Commandes utiles"
echo "----------------------------------------"
echo "  # Voir tous les logs"
echo "  $FLY_CMD logs -a $APP_NAME"
echo ""
echo "  # Filtrer les logs Llama"
echo "  $FLY_CMD logs -a $APP_NAME | grep -i llama"
echo ""
echo "  # Voir les logs du téléchargement du modèle"
echo "  $FLY_CMD ssh console -a $APP_NAME -C 'cat /tmp/model-download.log'"
echo ""
echo "  # Redémarrer l'app (si Llama ne démarre pas)"
echo "  $FLY_CMD apps restart $APP_NAME"
echo ""
