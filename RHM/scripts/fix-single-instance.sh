#!/bin/bash

# Script pour forcer une seule instance et résoudre les problèmes 401
# Usage: ./scripts/fix-single-instance.sh

APP_NAME="rhm-app"

echo "🔧 Correction du problème de multi-instances"
echo "=============================================="
echo ""
echo "Problème identifié :"
echo "  - Deux machines actives partagent le trafic"
echo "  - Chaque machine a son propre état en mémoire (dataStore)"
echo "  - Les requêtes sont réparties entre les machines"
echo "  - Résultat : 401 Unauthorized quand la requête va sur la mauvaise machine"
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

# Lister les machines
echo "📊 Machines actuelles :"
$FLY_CMD machines list -a "$APP_NAME"

echo ""
echo "🛑 Arrêt de la machine supplémentaire..."
echo "   (On garde seulement la première machine active)"

# Récupérer la liste des machines et arrêter toutes sauf la première
MACHINES=$($FLY_CMD machines list -a "$APP_NAME" --json 2>/dev/null | jq -r '.[].id' 2>/dev/null || $FLY_CMD machines list -a "$APP_NAME" | grep -E "^app" | awk '{print $2}')

if [ -z "$MACHINES" ]; then
    echo "⚠️  Impossible de récupérer la liste des machines"
    echo "   Essayez manuellement: $FLY_CMD machines list -a $APP_NAME"
    exit 1
fi

FIRST_MACHINE=""
COUNT=0

for MACHINE_ID in $MACHINES; do
    if [ -z "$FIRST_MACHINE" ]; then
        FIRST_MACHINE="$MACHINE_ID"
        echo "✅ Garde la machine: $MACHINE_ID"
    else
        echo "🛑 Arrêt et suppression de la machine: $MACHINE_ID"
        $FLY_CMD machines stop "$MACHINE_ID" -a "$APP_NAME" 2>/dev/null || true
        sleep 2
        $FLY_CMD machines destroy "$MACHINE_ID" -a "$APP_NAME" --force 2>/dev/null || true
    fi
    COUNT=$((COUNT + 1))
done

echo ""
echo "⏳ Attente de 5 secondes pour que les changements prennent effet..."
sleep 5

echo ""
echo "📊 Vérification finale :"
$FLY_CMD machines list -a "$APP_NAME"

echo ""
echo "✅ Correction terminée !"
echo ""
echo "Maintenant, toutes les requêtes iront vers la même machine."
echo "Le problème de 401 devrait être résolu."
echo ""
echo "Vérifiez avec:"
echo "  $FLY_CMD machines list -a $APP_NAME"
echo "  ./scripts/debug-fly.sh"
