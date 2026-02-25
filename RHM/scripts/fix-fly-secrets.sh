#!/bin/bash

# Script pour configurer les secrets Fly.io correctement

APP_NAME="rhm-app"

echo "🔐 Configuration des secrets Fly.io pour $APP_NAME"
echo "================================================"
echo ""

# Vérifier si connecté
if ! flyctl auth whoami &> /dev/null; then
    echo "Connexion à Fly.io..."
    flyctl auth login
fi

# Générer JWT_SECRET si pas déjà configuré
echo "Vérification de JWT_SECRET..."
SECRETS=$(flyctl secrets list -a "$APP_NAME" 2>/dev/null || echo "")

if ! echo "$SECRETS" | grep -q "JWT_SECRET"; then
    echo "Génération d'un nouveau JWT_SECRET..."
    if command -v node &> /dev/null; then
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    elif command -v python3 &> /dev/null; then
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    else
        JWT_SECRET=$(date +%s | sha256sum | base64 | head -c 32)
    fi
    
    flyctl secrets set JWT_SECRET="$JWT_SECRET" -a "$APP_NAME"
    echo "✅ JWT_SECRET configuré"
else
    echo "✅ JWT_SECRET déjà configuré"
fi

# Configurer CORS_ORIGIN
echo ""
echo "Vérification de CORS_ORIGIN..."
CORS_URL="https://${APP_NAME}.fly.dev"
if ! echo "$SECRETS" | grep -q "CORS_ORIGIN"; then
    flyctl secrets set CORS_ORIGIN="$CORS_URL" -a "$APP_NAME"
    echo "✅ CORS_ORIGIN configuré: $CORS_URL"
else
    echo "✅ CORS_ORIGIN déjà configuré"
fi

# Rappel pour OPENAI_API_KEY
echo ""
echo "📝 Secrets configurés:"
flyctl secrets list -a "$APP_NAME"
echo ""
echo "⚠️  Si OPENAI_API_KEY n'est pas configuré, les fonctionnalités IA ne fonctionneront pas."
echo "Pour le configurer:"
echo "  flyctl secrets set OPENAI_API_KEY=\"votre-cle\" -a $APP_NAME"
echo ""
