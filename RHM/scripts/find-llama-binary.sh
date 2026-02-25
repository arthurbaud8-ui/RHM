#!/bin/bash

# Script pour trouver où se trouve le binaire llama-server
# Usage: ./scripts/find-llama-binary.sh

APP_NAME="rhm-app"

echo "🔍 Recherche du binaire llama-server"
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

echo "Recherche dans le container..."
echo ""

# Chercher le binaire
RESULT=$(flyctl ssh console -a "$APP_NAME" -C 'find /usr -name "llama-server" 2>/dev/null || find / -name "llama-server" 2>/dev/null | head -5 || echo "Aucun binaire trouvé"')

echo "$RESULT"
echo ""

# Vérifier aussi dans /usr/local/bin
echo "Vérification de /usr/local/bin/llama-server:"
CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ls -lh /usr/local/bin/llama-server 2>&1')
echo "$CHECK"
echo ""

# Lister tous les binaires dans /usr/local/bin
echo "Binaires dans /usr/local/bin:"
BINARIES=$(flyctl ssh console -a "$APP_NAME" -C 'ls -la /usr/local/bin/ | grep -i llama || echo "Aucun binaire llama trouvé"')
echo "$BINARIES"
