#!/bin/bash

# Script pour démarrer Llama manuellement sur Fly.io
# Usage: ./scripts/start-llama.sh

APP_NAME="rhm-app"

echo "🚀 Démarrage de Llama sur Fly.io"
echo "=================================="
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

echo "📋 Vérification du modèle..."
MODEL_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ls -lh /data/models/llama-3.2-3b-instruct-q4_k_m.gguf 2>&1')
echo "$MODEL_CHECK"
echo ""

echo "📋 Vérification du binaire..."
BINARY_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ls -lh /usr/local/bin/llama-server 2>&1')
echo "$BINARY_CHECK"
echo ""

echo "📋 Vérification si Llama tourne déjà..."
RUNNING_CHECK=$(flyctl ssh console -a "$APP_NAME" -C 'ps | grep llama-server | grep -v grep || echo "Llama non démarré"')
echo "$RUNNING_CHECK"
echo ""

if echo "$RUNNING_CHECK" | grep -q "llama-server"; then
    echo "✅ Llama est déjà en cours d'exécution!"
    echo ""
    echo "Test de l'API:"
    flyctl ssh console -a "$APP_NAME" -C 'curl -s http://127.0.0.1:8080/v1/models | head -10'
    exit 0
fi

echo "🚀 Démarrage de Llama..."
echo ""

# Démarrer Llama
flyctl ssh console -a "$APP_NAME" << 'EOF'
MODEL_FILE="/data/models/llama-3.2-3b-instruct-q4_k_m.gguf"
LLAMA_BIN="/usr/local/bin/llama-server"

if [ ! -f "$MODEL_FILE" ]; then
    echo "❌ Modèle non trouvé: $MODEL_FILE"
    exit 1
fi

if [ ! -f "$LLAMA_BIN" ]; then
    echo "❌ Binaire non trouvé: $LLAMA_BIN"
    exit 1
fi

echo "📂 Modèle: $MODEL_FILE"
echo "🔧 Binaire: $LLAMA_BIN"
echo "🌐 Port: 8080"
echo ""
echo "🚀 Démarrage..."

# Vérifier si Llama tourne déjà
if ps | grep llama-server | grep -v grep > /dev/null; then
    echo "⚠️  Llama est déjà en cours d'exécution"
    exit 0
fi

# Démarrer Llama
"$LLAMA_BIN" -m "$MODEL_FILE" --host 127.0.0.1 --port 8080 -c 4096 -t 4 --api-key local-llama-key > /tmp/llama.log 2>&1 &

LLAMA_PID=$!
echo "✅ Llama démarré avec PID: $LLAMA_PID"
echo ""
echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

# Vérifier que Llama répond
if curl -s http://127.0.0.1:8080/v1/models > /dev/null 2>&1; then
    echo "✅ Llama répond correctement!"
    echo ""
    echo "📊 Test de l'API:"
    curl -s http://127.0.0.1:8080/v1/models | head -10
else
    echo "⚠️  Llama ne répond pas encore"
    echo "📋 Logs:"
    tail -20 /tmp/llama.log
fi
EOF

echo ""
echo "✅ Script terminé!"
echo ""
echo "Pour vérifier le statut:"
echo "  flyctl ssh console -a $APP_NAME -C 'ps | grep llama-server'"
echo ""
echo "Pour voir les logs:"
echo "  flyctl ssh console -a $APP_NAME -C 'tail -f /tmp/llama.log'"
