#!/bin/bash

# Script pour vérifier la configuration Fly.io

APP_NAME="rhm-app"

echo "🔍 Vérification de la configuration Fly.io"
echo "=========================================="
echo ""

# Vérifier les secrets
echo "📝 Secrets configurés:"
flyctl secrets list -a "$APP_NAME" 2>/dev/null || echo "Erreur lors de la récupération des secrets"
echo ""

# Vérifier le statut
echo "📊 Statut de l'app:"
flyctl status -a "$APP_NAME" 2>/dev/null || echo "Erreur lors de la récupération du statut"
echo ""

# Vérifier les logs récents
echo "📋 Derniers logs (erreurs uniquement):"
flyctl logs -a "$APP_NAME" 2>/dev/null | grep -i "error\|failed\|refused" | tail -20 || echo "Aucune erreur récente"
echo ""

# Vérifier que CORS_ORIGIN est bien configuré
CORS_ORIGIN=$(flyctl secrets list -a "$APP_NAME" 2>/dev/null | grep "CORS_ORIGIN" | awk '{print $2}' || echo "")
if [ -z "$CORS_ORIGIN" ]; then
    echo "⚠️  CORS_ORIGIN n'est pas configuré !"
    echo "Configurez-le avec:"
    echo "  flyctl secrets set CORS_ORIGIN=\"https://$APP_NAME.fly.dev\" -a $APP_NAME"
else
    echo "✅ CORS_ORIGIN configuré: $CORS_ORIGIN"
    EXPECTED_CORS="https://${APP_NAME}.fly.dev"
    if [ "$CORS_ORIGIN" != "$EXPECTED_CORS" ]; then
        echo "⚠️  Attention: CORS_ORIGIN devrait être: $EXPECTED_CORS"
    fi
fi
echo ""

# Vérifier JWT_SECRET
JWT_SECRET=$(flyctl secrets list -a "$APP_NAME" 2>/dev/null | grep "JWT_SECRET" | awk '{print $2}' || echo "")
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET n'est pas configuré !"
    echo "Configurez-le avec:"
    echo "  flyctl secrets set JWT_SECRET=\"\$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"base64\"))')\" -a $APP_NAME"
else
    echo "✅ JWT_SECRET configuré"
fi
echo ""

echo "🌐 URL de l'application: https://$APP_NAME.fly.dev"
echo ""
