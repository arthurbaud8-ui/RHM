#!/bin/bash

# Script de déploiement automatique sur Fly.io pour RHM
# Usage: ./scripts/deploy-fly.sh   (depuis n'importe quel répertoire du repo)

set -e

# Se placer à la racine du repo (où se trouvent fly.toml et le Dockerfile)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RHM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$RHM_ROOT"

echo "🚀 Déploiement RHM sur Fly.io"
echo "=============================="
echo "📁 Répertoire de déploiement: $RHM_ROOT"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si flyctl est installé
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo -e "${YELLOW}⚠️  Fly CLI n'est pas installé${NC}"
    echo "Installation de Fly CLI..."
    
    curl -L https://fly.io/install.sh | sh
    
    # Ajouter au PATH
    export FLYCTL_INSTALL="/home/$USER/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
    
    echo -e "${GREEN}✅ Fly CLI installé${NC}"
    echo ""
fi

# Utiliser flyctl ou fly selon ce qui est disponible
FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

echo -e "${GREEN}✅ Fly CLI trouvé: $FLY_CMD${NC}"
echo ""

# Vérifier si connecté
if ! $FLY_CMD auth whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à Fly.io${NC}"
    echo "Connexion..."
    $FLY_CMD auth login
fi

echo -e "${GREEN}✅ Connecté à Fly.io${NC}"
echo ""

# Vérifier si fly.toml existe
if [ ! -f "fly.toml" ]; then
    echo -e "${YELLOW}⚠️  fly.toml non trouvé${NC}"
    echo "Initialisation de Fly.io..."
    $FLY_CMD launch --no-deploy --name rhm-app || $FLY_CMD launch --no-deploy
    
    if [ ! -f "fly.toml" ]; then
        echo -e "${RED}❌ Erreur: fly.toml n'a pas été créé${NC}"
        exit 1
    fi
fi

# Lire le nom de l'app depuis fly.toml
APP_NAME=$(grep -E '^app = ' fly.toml | cut -d'"' -f2 || echo "rhm-app")

echo -e "${GREEN}📦 App: $APP_NAME${NC}"
echo ""

# Vérifier si l'app existe sur Fly.io (format: "fly apps list -q" = un nom par ligne)
echo "Vérification de l'existence de l'app sur Fly.io..."
APP_EXISTS=false
if $FLY_CMD apps list -q 2>/dev/null | grep -q "^${APP_NAME}$"; then
    APP_EXISTS=true
    echo -e "${GREEN}✅ L'app existe déjà${NC}"
else
    echo -e "${YELLOW}⚠️  L'app n'existe pas encore${NC}"
    echo "Création de l'app..."
    if $FLY_CMD apps create "$APP_NAME" 2>/dev/null; then
        echo -e "${GREEN}✅ App créée: $APP_NAME${NC}"
        APP_EXISTS=true
    else
        echo -e "${YELLOW}⚠️  La création a échoué (l'app existe peut-être déjà). On continue le déploiement.${NC}"
    fi
fi
echo ""

# Générer les secrets
echo "Configuration des secrets..."

# Générer un secret JWT
if command -v openssl &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
elif command -v node &> /dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
elif command -v python3 &> /dev/null; then
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
elif [ -c /dev/urandom ]; then
    JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
else
    JWT_SECRET=$(date +%s | sha256sum | base64 | head -c 32)
    echo -e "${YELLOW}⚠️  Utilisation d'un secret moins sécurisé${NC}"
fi

CORS_URL="https://${APP_NAME}.fly.dev"

# Vérifier les secrets existants
SECRETS=$($FLY_CMD secrets list -a "$APP_NAME" 2>/dev/null || echo "")

if ! echo "$SECRETS" | grep -q "JWT_SECRET"; then
    echo -e "${YELLOW}⚠️  JWT_SECRET non configuré${NC}"
    $FLY_CMD secrets set JWT_SECRET="$JWT_SECRET" -a "$APP_NAME"
    echo -e "${GREEN}✅ JWT_SECRET configuré${NC}"
fi

if ! echo "$SECRETS" | grep -q "CORS_ORIGIN"; then
    echo -e "${YELLOW}⚠️  CORS_ORIGIN non configuré${NC}"
    $FLY_CMD secrets set CORS_ORIGIN="$CORS_URL" -a "$APP_NAME"
    echo -e "${GREEN}✅ CORS_ORIGIN configuré: $CORS_URL${NC}"
fi

echo ""
echo "Secrets configurés:"
$FLY_CMD secrets list -a "$APP_NAME" 2>/dev/null || echo "Aucun secret"
echo ""

# Déployer
echo -e "${GREEN}🚀 Déploiement en cours...${NC}"
echo ""

$FLY_CMD deploy -a "$APP_NAME"

echo ""
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo ""

# Rappel des secrets IA (OpenAI ou Groq)
SECRETS_AFTER=$($FLY_CMD secrets list -a "$APP_NAME" 2>/dev/null || echo "")
if ! echo "$SECRETS_AFTER" | grep -qE "OPENAI_API_KEY|GROQ_API_KEY"; then
    echo -e "${YELLOW}⚠️  Aucune clé IA configurée (analyse CV, génération de tests)${NC}"
    echo "Pour activer l'IA avec Groq (gratuit) :"
    echo "  $FLY_CMD secrets set GROQ_API_KEY=\"votre-cle-groq\" -a $APP_NAME"
    echo "Ou avec OpenAI : $FLY_CMD secrets set OPENAI_API_KEY=\"votre-cle\" -a $APP_NAME"
    echo ""
fi

echo "🌐 Votre application est disponible à:"
echo -e "   ${GREEN}https://${APP_NAME}.fly.dev${NC}"
echo ""
echo "Commandes utiles:"
echo "  $FLY_CMD logs -a $APP_NAME          # Voir les logs"
echo "  $FLY_CMD status -a $APP_NAME       # Voir le statut"
echo "  $FLY_CMD open -a $APP_NAME         # Ouvrir dans le navigateur"
echo "  $FLY_CMD secrets list -a $APP_NAME # Voir les secrets"
echo ""
