#!/bin/bash

# Script simple pour tester si Llama fonctionne
# Usage: ./scripts/test-llama.sh

APP_NAME="rhm-app"

echo "🔍 Test de Llama"
echo "================"
echo ""

# Vérifier si flyctl est disponible
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
else
    echo "❌ Fly CLI n'est pas installé"
    echo ""
    echo "Commandes manuelles via SSH:"
    echo "  flyctl ssh console -a $APP_NAME"
    echo "  ps | grep llama-server"
    echo "  curl http://127.0.0.1:8080/v1/models"
    exit 0
fi

echo "1️⃣  Vérification du processus Llama"
echo "----------------------------------------"
PROCESS=$(flyctl ssh console -a "$APP_NAME" -C 'ps | grep "[l]lama-server" || echo "❌ Llama non démarré"')
echo "$PROCESS"
echo ""

echo "2️⃣  Vérification du port 8080"
echo "----------------------------------------"
PORT=$(flyctl ssh console -a "$APP_NAME" -C 'netstat -tln | grep 8080 || echo "❌ Port 8080 non ouvert"')
echo "$PORT"
echo ""

echo "3️⃣  Test de l'API Llama"
echo "----------------------------------------"
API_TEST=$(flyctl ssh console -a "$APP_NAME" -C 'curl -s http://127.0.0.1:8080/v1/models 2>&1')
if echo "$API_TEST" | grep -q '"data"'; then
    echo "✅ Llama répond correctement!"
    echo ""
    echo "Réponse de l'API:"
    echo "$API_TEST" | head -15
else
    echo "❌ Llama ne répond pas"
    echo ""
    echo "Réponse:"
    echo "$API_TEST"
fi
echo ""

echo "4️⃣  Derniers logs Llama"
echo "----------------------------------------"
LOGS=$(flyctl ssh console -a "$APP_NAME" -C 'tail -10 /tmp/llama.log 2>&1')
if echo "$LOGS" | grep -q "not found\|error\|Error"; then
    echo "⚠️  Erreurs dans les logs:"
else
    echo "📋 Logs:"
fi
echo "$LOGS"
echo ""

echo "📊 Résumé"
echo "----------------------------------------"
if echo "$PROCESS" | grep -q "llama-server" && echo "$API_TEST" | grep -q '"data"'; then
    echo "✅ Llama fonctionne correctement!"
else
    echo "❌ Llama ne fonctionne pas"
    echo ""
    echo "Pour démarrer Llama manuellement:"
    echo "  flyctl ssh console -a $APP_NAME"
    echo "  /usr/local/bin/llama-server -m /data/models/llama-3.2-3b-instruct-q4_k_m.gguf --host 127.0.0.1 --port 8080 -c 4096 -t 4 --api-key local-llama-key > /tmp/llama.log 2>&1 &"
fi
