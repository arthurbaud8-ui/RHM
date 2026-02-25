#!/bin/bash

# Script pour vérifier le statut complet de Llama
# Usage: ./scripts/check-llama-status.sh

APP_NAME="rhm-app"

echo "🔍 Vérification complète du statut Llama"
echo "=========================================="
echo ""

# Vérifier si flyctl est disponible
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
else
    echo "⚠️  Fly CLI n'est pas installé"
    echo "Utilisez le dashboard Fly.io ou installez Fly CLI"
    exit 0
fi

echo "📋 1. Vérification du modèle"
echo "----------------------------------------"
MODEL_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ls -lh /data/models/llama-3.2-3b-instruct-q4_k_m.gguf 2>/dev/null && echo "✅ Modèle présent" || echo "❌ Modèle absent"')
echo "$MODEL_CHECK"
echo ""

echo "📋 2. Vérification du processus Llama"
echo "----------------------------------------"
PROCESS_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ps aux | grep llama-server | grep -v grep || echo "❌ Llama server non trouvé"')
echo "$PROCESS_CHECK"
echo ""

echo "📋 3. Vérification du port 8080"
echo "----------------------------------------"
PORT_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'netstat -tlnp | grep 8080 || echo "❌ Port 8080 non ouvert"')
echo "$PORT_CHECK"
echo ""

echo "📋 4. Test de l'API Llama"
echo "----------------------------------------"
API_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'curl -s http://127.0.0.1:8080/v1/models 2>&1 | head -10')
if echo "$API_CHECK" | grep -q "data"; then
    echo "✅ API Llama répond correctement!"
    echo "$API_CHECK"
else
    echo "❌ API Llama ne répond pas"
    echo "$API_CHECK"
fi
echo ""

echo "📋 5. Derniers logs Llama"
echo "----------------------------------------"
LOGS_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'tail -20 /tmp/llama.log 2>/dev/null || echo "Aucun log disponible"')
echo "$LOGS_CHECK"
echo ""

echo "📋 6. Résumé"
echo "----------------------------------------"
if echo "$PROCESS_CHECK" | grep -q "llama-server" && echo "$API_CHECK" | grep -q "data"; then
    echo "✅ Llama est opérationnel!"
    echo ""
    echo "Pour tester depuis l'extérieur:"
    echo "  flyctl ssh console -a $APP_NAME"
    echo "  curl http://127.0.0.1:8080/v1/models"
else
    echo "⚠️  Llama n'est pas encore démarré"
    echo ""
    echo "Vérifiez les logs:"
    echo "  flyctl logs -a $APP_NAME | grep -i llama"
    echo ""
    echo "Ou connectez-vous au container:"
    echo "  flyctl ssh console -a $APP_NAME"
    echo "  tail -50 /tmp/llama.log"
fi
