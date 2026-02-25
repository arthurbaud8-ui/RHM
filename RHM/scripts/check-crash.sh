#!/bin/bash

# Script pour vérifier pourquoi l'app crash
# Usage: ./scripts/check-crash.sh

APP_NAME="rhm-app"
MACHINE_ID="${1:-891241f6412078}"

echo "🔍 Analyse du crash de l'application"
echo "===================================="
echo ""

# Vérifier si flyctl est disponible
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
else
    echo "❌ Fly CLI n'est pas installé"
    exit 1
fi

echo "📋 Logs récents de la machine $MACHINE_ID"
echo "----------------------------------------"
$FLY_CMD logs -a "$APP_NAME" -i "$MACHINE_ID" --limit 100

echo ""
echo ""
echo "📋 Logs complets (dernières 200 lignes)"
echo "----------------------------------------"
$FLY_CMD logs -a "$APP_NAME" --limit 200 | tail -100

echo ""
echo ""
echo "💡 Commandes utiles:"
echo "----------------------------------------"
echo "  Voir tous les logs:"
echo "    $FLY_CMD logs -a $APP_NAME -i $MACHINE_ID"
echo ""
echo "  Voir seulement les erreurs:"
echo "    $FLY_CMD logs -a $APP_NAME | grep -i error"
echo ""
echo "  SSH dans le container:"
echo "    $FLY_CMD ssh console -a $APP_NAME"
