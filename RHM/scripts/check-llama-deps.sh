#!/bin/bash

# Script pour vérifier les dépendances de llama-server
# Usage: ./scripts/check-llama-deps.sh

APP_NAME="rhm-app"

echo "🔍 Vérification des dépendances de llama-server"
echo "================================================"
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

echo "📋 1. Informations sur le binaire"
echo "----------------------------------------"
flyctl ssh console -a "$APP_NAME" << 'EOF'
echo "Fichier:"
ls -lh /usr/local/bin/llama-server

echo ""
echo "Type de fichier:"
file /usr/local/bin/llama-server

echo ""
echo "Permissions:"
ls -l /usr/local/bin/llama-server
EOF

echo ""
echo "📋 2. Vérification des dépendances (ldd)"
echo "----------------------------------------"
flyctl ssh console -a "$APP_NAME" << 'EOF'
echo "Dépendances du binaire:"
ldd /usr/local/bin/llama-server 2>&1 || echo "ldd non disponible, essai avec readelf..."
EOF

echo ""
echo "📋 3. Test d'exécution directe"
echo "----------------------------------------"
flyctl ssh console -a "$APP_NAME" << 'EOF'
echo "Test d'exécution:"
/usr/local/bin/llama-server --help 2>&1 | head -5 || echo "Erreur lors de l'exécution"
EOF

echo ""
echo "📋 4. Vérification de l'architecture"
echo "----------------------------------------"
flyctl ssh console -a "$APP_NAME" << 'EOF'
echo "Architecture du système:"
uname -m

echo ""
echo "Architecture du binaire:"
readelf -h /usr/local/bin/llama-server 2>/dev/null | grep Machine || file /usr/local/bin/llama-server | grep -i "ELF\|architecture"
EOF
