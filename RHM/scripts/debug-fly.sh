#!/bin/bash

# Script de debug complet pour Fly.io
# Usage: ./scripts/debug-fly.sh

APP_NAME="rhm-app"

echo "🔍 Debug Fly.io - $APP_NAME"
echo "============================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Vérifier si flyctl est disponible
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI n'est pas installé${NC}"
    exit 1
fi

FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

# 1. Statut de l'app
echo -e "${BLUE}📊 1. Statut de l'application${NC}"
echo "----------------------------------------"
$FLY_CMD status -a "$APP_NAME" 2>/dev/null || echo -e "${RED}Erreur lors de la récupération du statut${NC}"
echo ""

# 2. Secrets configurés
echo -e "${BLUE}🔐 2. Secrets configurés${NC}"
echo "----------------------------------------"
SECRETS=$($FLY_CMD secrets list -a "$APP_NAME" 2>/dev/null)
if [ -z "$SECRETS" ]; then
    echo -e "${RED}❌ Aucun secret configuré${NC}"
else
    echo "$SECRETS"
    
    # Vérifier les secrets critiques
    if ! echo "$SECRETS" | grep -q "JWT_SECRET"; then
        echo -e "${RED}❌ JWT_SECRET manquant !${NC}"
    else
        echo -e "${GREEN}✅ JWT_SECRET configuré${NC}"
    fi
    
    if ! echo "$SECRETS" | grep -q "CORS_ORIGIN"; then
        echo -e "${RED}❌ CORS_ORIGIN manquant !${NC}"
    else
        # Les secrets affichent un digest, on vérifie juste qu'il existe
        echo -e "${GREEN}✅ CORS_ORIGIN configuré${NC}"
        echo -e "${YELLOW}   Note: Vérifiez que CORS_ORIGIN=https://${APP_NAME}.fly.dev${NC}"
        echo "   Pour voir la valeur: $FLY_CMD secrets reveal -a $APP_NAME | grep CORS_ORIGIN"
    fi
    
    if ! echo "$SECRETS" | grep -q "OPENAI_API_KEY"; then
        echo -e "${YELLOW}⚠️  OPENAI_API_KEY non configuré (fonctionnalités IA désactivées)${NC}"
    else
        echo -e "${GREEN}✅ OPENAI_API_KEY configuré${NC}"
    fi
fi
echo ""

# 3. Logs récents (dernières 100 lignes)
echo -e "${BLUE}📝 3. Logs récents (dernières 100 lignes)${NC}"
echo "----------------------------------------"
echo "Récupération des logs (cela peut prendre quelques secondes)..."
# Utiliser --limit pour éviter le blocage
RECENT_LOGS=$(timeout 15 $FLY_CMD logs -a "$APP_NAME" --limit 100 2>/dev/null)
if [ -z "$RECENT_LOGS" ]; then
    echo -e "${YELLOW}⚠️  Impossible de récupérer les logs (timeout ou erreur)${NC}"
    echo "   Essayez manuellement: $FLY_CMD logs -a $APP_NAME --limit 100"
else
    echo "$RECENT_LOGS"
fi
echo ""

# 4. Analyse des erreurs
echo -e "${BLUE}🚨 4. Analyse des erreurs${NC}"
echo "----------------------------------------"
ERRORS=$(timeout 10 $FLY_CMD logs -a "$APP_NAME" --limit 500 2>/dev/null | grep -iE "error|failed|refused|exception|crash" | tail -20)
if [ -z "$ERRORS" ]; then
    echo -e "${GREEN}✅ Aucune erreur récente détectée${NC}"
else
    echo -e "${RED}Erreurs détectées:${NC}"
    echo "$ERRORS"
fi
echo ""

# 5. Vérification du backend
echo -e "${BLUE}🔧 5. Vérification du backend${NC}"
echo "----------------------------------------"
BACKEND_LOGS=$(timeout 10 $FLY_CMD logs -a "$APP_NAME" --limit 500 2>/dev/null | grep -iE "backend|RHM Backend|starting backend|backend.*ready" | tail -10)
if [ -z "$BACKEND_LOGS" ]; then
    echo -e "${RED}❌ Aucun log de démarrage du backend trouvé${NC}"
else
    echo -e "${GREEN}Logs de démarrage du backend:${NC}"
    echo "$BACKEND_LOGS"
    
    if echo "$BACKEND_LOGS" | grep -q "RHM Backend API is running"; then
        echo -e "${GREEN}✅ Backend démarré avec succès${NC}"
    else
        echo -e "${RED}❌ Backend ne semble pas avoir démarré correctement${NC}"
    fi
fi
echo ""

# 6. Vérification de nginx
echo -e "${BLUE}🌐 6. Vérification de nginx${NC}"
echo "----------------------------------------"
NGINX_LOGS=$(timeout 10 $FLY_CMD logs -a "$APP_NAME" --limit 500 2>/dev/null | grep -iE "nginx|starting nginx" | tail -5)
if [ -z "$NGINX_LOGS" ]; then
    echo -e "${YELLOW}⚠️  Aucun log nginx trouvé${NC}"
else
    echo "$NGINX_LOGS"
    if echo "$NGINX_LOGS" | grep -q "start worker"; then
        echo -e "${GREEN}✅ Nginx démarré${NC}"
    fi
fi
echo ""

# 7. Requêtes API récentes
echo -e "${BLUE}📡 7. Requêtes API récentes (dernières 20)${NC}"
echo "----------------------------------------"
API_REQUESTS=$(timeout 10 $FLY_CMD logs -a "$APP_NAME" --limit 500 2>/dev/null | grep -E "\"GET |\"POST |\"PUT |\"DELETE |\"PATCH " | tail -20)
if [ -z "$API_REQUESTS" ]; then
    echo -e "${YELLOW}⚠️  Aucune requête API récente${NC}"
else
    echo "$API_REQUESTS"
    
    # Compter les codes de statut
    STATUS_200=$(echo "$API_REQUESTS" | grep -c "200" || echo "0")
    STATUS_401=$(echo "$API_REQUESTS" | grep -c "401" || echo "0")
    STATUS_500=$(echo "$API_REQUESTS" | grep -c "500" || echo "0")
    
    echo ""
    echo "Statistiques:"
    echo "  ✅ 200 OK: $STATUS_200"
    echo "  ❌ 401 Unauthorized: $STATUS_401"
    echo "  ❌ 500 Server Error: $STATUS_500"
    
    if [ "$STATUS_401" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Des requêtes retournent 401 (non autorisé)${NC}"
        echo "   Cela peut indiquer un problème avec le token JWT"
    fi
fi
echo ""

# 8. Healthcheck
echo -e "${BLUE}💚 8. Healthcheck${NC}"
echo "----------------------------------------"
HEALTH_LOGS=$(timeout 10 $FLY_CMD logs -a "$APP_NAME" --limit 500 2>/dev/null | grep -iE "health|healthcheck" | tail -10)
if [ -z "$HEALTH_LOGS" ]; then
    echo -e "${YELLOW}⚠️  Aucun log de healthcheck${NC}"
else
    echo "$HEALTH_LOGS"
    
    if echo "$HEALTH_LOGS" | grep -q "is now passing"; then
        echo -e "${GREEN}✅ Healthcheck passe${NC}"
    elif echo "$HEALTH_LOGS" | grep -q "has failed"; then
        echo -e "${RED}❌ Healthcheck échoue${NC}"
    fi
fi
echo ""

# 9. Recommandations
echo -e "${BLUE}💡 9. Recommandations${NC}"
echo "----------------------------------------"

# Vérifier les problèmes courants
ISSUES=0

if ! echo "$SECRETS" | grep -q "JWT_SECRET"; then
    echo -e "${RED}❌ Problème: JWT_SECRET manquant${NC}"
    echo "   Solution: flyctl secrets set JWT_SECRET=\"\$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"base64\"))')\" -a $APP_NAME"
    ISSUES=$((ISSUES + 1))
fi

if ! echo "$SECRETS" | grep -q "CORS_ORIGIN"; then
    echo -e "${RED}❌ Problème: CORS_ORIGIN manquant${NC}"
    echo "   Solution: flyctl secrets set CORS_ORIGIN=\"https://$APP_NAME.fly.dev\" -a $APP_NAME"
    ISSUES=$((ISSUES + 1))
fi

if echo "$ERRORS" | grep -q -i "connection refused"; then
    echo -e "${RED}❌ Problème: Connection refused détecté${NC}"
    echo "   Le backend ne répond pas. Vérifiez les logs du backend."
    ISSUES=$((ISSUES + 1))
fi

if echo "$ERRORS" | grep -q -i "backend.*failed"; then
    echo -e "${RED}❌ Problème: Le backend a échoué au démarrage${NC}"
    echo "   Vérifiez les logs: flyctl logs -a $APP_NAME | grep -i backend"
    ISSUES=$((ISSUES + 1))
fi

if [ "$STATUS_401" -gt "$STATUS_200" ]; then
    echo -e "${YELLOW}⚠️  Problème: Plus de requêtes 401 que 200${NC}"
    echo "   Le token JWT n'est probablement pas transmis correctement"
    echo "   Vérifiez dans la console du navigateur (F12) si le header Authorization est présent"
    ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Aucun problème évident détecté${NC}"
    echo ""
    echo "Si le problème persiste:"
    echo "  1. Vérifiez la console du navigateur (F12) pour les erreurs JavaScript"
    echo "  2. Vérifiez l'onglet Network pour voir les requêtes qui échouent"
    echo "  3. SSH dans le container: flyctl ssh console -a $APP_NAME"
    echo "  4. Voir tous les logs: flyctl logs -a $APP_NAME"
fi

echo ""

# 10. Commandes utiles
echo -e "${BLUE}📚 10. Commandes utiles${NC}"
echo "----------------------------------------"
echo "  Voir tous les logs:"
echo "    $FLY_CMD logs -a $APP_NAME"
echo ""
echo "  Voir seulement les erreurs:"
echo "    $FLY_CMD logs -a $APP_NAME | grep -i error"
echo ""
echo "  SSH dans le container:"
echo "    $FLY_CMD ssh console -a $APP_NAME"
echo ""
echo "  Redémarrer l'app:"
echo "    $FLY_CMD apps restart $APP_NAME"
echo ""
echo "  Voir les métriques:"
echo "    $FLY_CMD metrics -a $APP_NAME"
echo ""
