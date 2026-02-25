#!/bin/bash

# Script pour vérifier les logs Fly.io et diagnostiquer les problèmes

APP_NAME="rhm-app"

echo "🔍 Diagnostic Fly.io - $APP_NAME"
echo "================================"
echo ""

echo "📊 Statut de l'app:"
flyctl status -a "$APP_NAME" 2>/dev/null || echo "App non trouvée"
echo ""

echo "📝 Derniers logs (50 lignes):"
flyctl logs -a "$APP_NAME" 2>/dev/null | tail -50
echo ""

echo "🔐 Secrets configurés:"
flyctl secrets list -a "$APP_NAME" 2>/dev/null || echo "Aucun secret"
echo ""

echo "💡 Commandes utiles:"
echo "  flyctl logs -a $APP_NAME                    # Voir tous les logs"
echo "  flyctl logs -a $APP_NAME | grep -i error   # Voir seulement les erreurs"
echo "  flyctl ssh console -a $APP_NAME            # SSH dans le container"
echo "  flyctl status -a $APP_NAME                  # Voir le statut"
echo ""
