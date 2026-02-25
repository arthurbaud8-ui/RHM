#!/bin/bash

# Script d'analyse approfondie des logs Fly.io
# Usage: ./scripts/analyze-logs.sh [nombre_de_lignes]

APP_NAME="rhm-app"
LINES=${1:-200}

echo "📊 Analyse approfondie des logs - $APP_NAME"
echo "============================================="
echo ""

FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

# Récupérer les logs
echo "Récupération des $LINES dernières lignes de logs..."
LOGS=$($FLY_CMD logs -a "$APP_NAME" 2>/dev/null | tail -$LINES)

if [ -z "$LOGS" ]; then
    echo "❌ Impossible de récupérer les logs"
    exit 1
fi

# Sauvegarder dans un fichier
LOG_FILE="fly-logs-$(date +%Y%m%d-%H%M%S).txt"
echo "$LOGS" > "$LOG_FILE"
echo "✅ Logs sauvegardés dans: $LOG_FILE"
echo ""

# 1. Analyse des erreurs backend
echo "🔴 Erreurs Backend:"
echo "-------------------"
BACKEND_ERRORS=$(echo "$LOGS" | grep -iE "backend.*error|backend.*failed|node.*error|RHM Backend.*error" | head -10)
if [ -z "$BACKEND_ERRORS" ]; then
    echo "✅ Aucune erreur backend détectée"
else
    echo "$BACKEND_ERRORS"
fi
echo ""

# 2. Vérification du démarrage
echo "🚀 Démarrage du Backend:"
echo "------------------------"
STARTUP=$(echo "$LOGS" | grep -iE "starting backend|backend.*ready|RHM Backend API is running" | head -5)
if [ -z "$STARTUP" ]; then
    echo "❌ Aucun log de démarrage du backend trouvé"
else
    echo "$STARTUP"
    if echo "$STARTUP" | grep -q "RHM Backend API is running"; then
        PORT=$(echo "$STARTUP" | grep -oP "port \K[0-9]+" | head -1)
        echo "✅ Backend démarré sur le port $PORT"
    fi
fi
echo ""

# 3. Analyse des requêtes API
echo "📡 Analyse des requêtes API:"
echo "-----------------------------"
API_REQUESTS=$(echo "$LOGS" | grep -E "\"(GET|POST|PUT|DELETE|PATCH) /api" | tail -30)

if [ ! -z "$API_REQUESTS" ]; then
    # Compter par endpoint
    echo "Endpoints les plus appelés:"
    echo "$API_REQUESTS" | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
    echo ""
    
    # Compter par code de statut
    echo "Codes de statut HTTP:"
    echo "$API_REQUESTS" | grep -oE " [0-9]{3} " | sort | uniq -c | sort -rn
    echo ""
    
    # Requêtes qui échouent
    FAILED=$(echo "$API_REQUESTS" | grep -E " (401|500|502|503|504) ")
    if [ ! -z "$FAILED" ]; then
        echo "❌ Requêtes échouées:"
        echo "$FAILED" | head -10
        echo ""
    fi
fi
echo ""

# 4. Problèmes de connexion
echo "🔌 Problèmes de connexion:"
echo "---------------------------"
CONNECTION_ISSUES=$(echo "$LOGS" | grep -iE "connection refused|connection.*failed|connect.*failed|upstream.*failed" | tail -10)
if [ -z "$CONNECTION_ISSUES" ]; then
    echo "✅ Aucun problème de connexion détecté"
else
    echo "$CONNECTION_ISSUES"
fi
echo ""

# 5. Healthcheck
echo "💚 Healthcheck:"
echo "---------------"
HEALTH=$(echo "$LOGS" | grep -iE "health|healthcheck" | tail -10)
if [ -z "$HEALTH" ]; then
    echo "⚠️  Aucun log de healthcheck"
else
    echo "$HEALTH"
    PASSING=$(echo "$HEALTH" | grep -c "is now passing" || echo "0")
    FAILED=$(echo "$HEALTH" | grep -c "has failed" || echo "0")
    echo ""
    echo "Healthcheck passing: $PASSING"
    echo "Healthcheck failed: $FAILED"
fi
echo ""

# 6. Nginx
echo "🌐 Nginx:"
echo "--------"
NGINX=$(echo "$LOGS" | grep -iE "nginx|start worker" | tail -5)
if [ -z "$NGINX" ]; then
    echo "⚠️  Aucun log nginx"
else
    echo "$NGINX"
fi
echo ""

# 7. Variables d'environnement (si disponibles dans les logs)
echo "🔐 Variables d'environnement (si visibles):"
echo "--------------------------------------------"
ENV_VARS=$(echo "$LOGS" | grep -iE "CORS|JWT|OPENAI|API_KEY" | head -5)
if [ -z "$ENV_VARS" ]; then
    echo "⚠️  Aucune variable d'environnement visible dans les logs"
    echo "   Utilisez: flyctl ssh console -a $APP_NAME"
    echo "   Puis: env | grep -E '(JWT|CORS|OPENAI)'"
else
    echo "$ENV_VARS"
fi
echo ""

# 8. Timeline des événements récents
echo "⏱️  Timeline des événements récents:"
echo "-------------------------------------"
TIMELINE=$(echo "$LOGS" | grep -E "\[.*\]|Starting|Backend|nginx|health" | tail -15)
if [ ! -z "$TIMELINE" ]; then
    echo "$TIMELINE"
fi
echo ""

# 9. Recommandations basées sur l'analyse
echo "💡 Recommandations:"
echo "-------------------"

ISSUES_FOUND=0

# Vérifier si le backend démarre
if ! echo "$LOGS" | grep -q "RHM Backend API is running"; then
    echo "❌ Le backend ne semble pas démarrer correctement"
    echo "   Vérifiez: flyctl logs -a $APP_NAME | grep -i backend"
    ISSUES_FOUND=1
fi

# Vérifier les erreurs de connexion
if echo "$LOGS" | grep -q "connection refused"; then
    echo "❌ Erreurs 'connection refused' détectées"
    echo "   Le backend n'est probablement pas accessible depuis nginx"
    echo "   Vérifiez que le backend écoute sur 0.0.0.0:3001"
    ISSUES_FOUND=1
fi

# Vérifier les 401
STATUS_401_COUNT=$(echo "$LOGS" | grep -c " 401 " || echo "0")
STATUS_200_COUNT=$(echo "$LOGS" | grep -c " 200 " || echo "0")

if [ "$STATUS_401_COUNT" -gt 0 ] && [ "$STATUS_401_COUNT" -gt "$STATUS_200_COUNT" ]; then
    echo "⚠️  Beaucoup de requêtes retournent 401"
    echo "   Problème probable avec l'authentification JWT"
    echo "   Vérifiez que JWT_SECRET est configuré correctement"
    ISSUES_FOUND=1
fi

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo "✅ Aucun problème majeur détecté dans les logs"
    echo ""
    echo "Si le problème persiste côté client:"
    echo "  1. Ouvrez la console du navigateur (F12)"
    echo "  2. Vérifiez l'onglet Network pour voir les requêtes qui échouent"
    echo "  3. Vérifiez si le header 'Authorization' est présent dans les requêtes"
    echo "  4. Vérifiez localStorage.getItem('auth_token') dans la console"
fi

echo ""
echo "📄 Logs complets sauvegardés dans: $LOG_FILE"
echo "   Vous pouvez les analyser avec: cat $LOG_FILE | grep -i error"
