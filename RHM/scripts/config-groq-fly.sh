#!/bin/bash

# Script pour configurer Groq sur Fly.io

APP_NAME="rhm-app"

echo "🔧 Configuration Groq pour $APP_NAME"
echo "===================================="
echo ""

# Vérifier si connecté
if ! flyctl auth whoami &> /dev/null; then
    echo "Connexion à Fly.io..."
    flyctl auth login
fi

echo "Pour utiliser Groq, vous devez :"
echo "1. Créer une clé API sur https://console.groq.com/keys"
echo "2. La copier ci-dessous"
echo ""

read -p "Entrez votre clé API Groq: " GROQ_API_KEY

if [ -z "$GROQ_API_KEY" ]; then
    echo "❌ Clé API vide, annulation"
    exit 1
fi

echo ""
echo "Configuration des secrets Groq..."

# Configurer l'URL de base Groq
flyctl secrets set OPENAI_API_BASE_URL="https://api.groq.com/openai/v1" -a "$APP_NAME"
echo "✅ OPENAI_API_BASE_URL configuré pour Groq"

# Configurer la clé API Groq
flyctl secrets set OPENAI_API_KEY="$GROQ_API_KEY" -a "$APP_NAME"
echo "✅ OPENAI_API_KEY configuré"

# Configurer le modèle Groq (llama-3.1-8b-instant est rapide et gratuit)
flyctl secrets set AI_MODEL="llama-3.1-8b-instant" -a "$APP_NAME"
echo "✅ AI_MODEL configuré: llama-3.1-8b-instant"

echo ""
echo "✅ Configuration Groq terminée !"
echo ""
echo "📝 Secrets configurés:"
flyctl secrets list -a "$APP_NAME" | grep -E "(OPENAI|AI_MODEL)"
echo ""
echo "🔄 Redéployez l'app pour appliquer les changements:"
echo "   flyctl deploy -a $APP_NAME"
echo ""
