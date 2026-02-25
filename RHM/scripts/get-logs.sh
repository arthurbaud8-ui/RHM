#!/bin/bash

# Script simple pour récupérer les logs Fly.io
# Usage: ./scripts/get-logs.sh [nombre_de_lignes]

APP_NAME="rhm-app"
LINES=${1:-100}

# Vérifier si flyctl est disponible
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI n'est pas installé"
    exit 1
fi

FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

echo "📝 Récupération des $LINES dernières lignes de logs pour $APP_NAME..."
echo ""

# Utiliser --limit pour éviter le blocage
timeout 20 $FLY_CMD logs -a "$APP_NAME" --limit "$LINES" 2>&1
