#!/bin/bash

# Script pour créer le volume Fly.io pour le modèle Llama
# Usage: ./scripts/setup-volume.sh

APP_NAME="rhm-app"
VOLUME_NAME="llama_models"
VOLUME_SIZE_GB=3

echo "📦 Configuration du volume Fly.io pour le modèle Llama"
echo "======================================================"
echo ""

# Vérifier si flyctl est disponible
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
else
    echo "❌ Fly CLI n'est pas installé"
    echo "Installez-le avec: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo "✅ Utilisation de la commande: $FLY_CMD"
echo ""

# Vérifier si le volume existe déjà
echo "🔍 Vérification du volume existant..."
VOLUMES=$($FLY_CMD volumes list -a "$APP_NAME" 2>/dev/null | grep "$VOLUME_NAME" || echo "")

if [ -n "$VOLUMES" ]; then
    echo "✅ Volume '$VOLUME_NAME' existe déjà"
    echo ""
    echo "$VOLUMES"
    echo ""
    echo "Pour supprimer et recréer:"
    echo "  $FLY_CMD volumes destroy $VOLUME_NAME -a $APP_NAME"
    exit 0
fi

echo "📦 Création du volume '$VOLUME_NAME' ($VOLUME_SIZE_GB GB)..."
echo ""

# Créer le volume
$FLY_CMD volumes create "$VOLUME_NAME" \
    --size "$VOLUME_SIZE_GB" \
    --region cdg \
    -a "$APP_NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Volume créé avec succès!"
    echo ""
    echo "Le modèle Llama sera stocké dans ce volume et persistera entre les redémarrages."
    echo ""
    echo "Pour vérifier:"
    echo "  $FLY_CMD volumes list -a $APP_NAME"
else
    echo ""
    echo "❌ Erreur lors de la création du volume"
    exit 1
fi
