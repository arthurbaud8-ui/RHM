#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RHM Backend Setup Script${NC}"
echo "=================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Veuillez installer Node.js 18+ depuis https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire app/backend/"
    exit 1
fi

# Installer les dépendances si node_modules n'existe pas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    npm install
fi

# Copier .env.example vers .env si .env n'existe pas
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Création du fichier .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe déjà${NC}"
fi

# Créer le dossier uploads s'il n'existe pas
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    echo -e "${GREEN}✅ Dossier uploads créé${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Backend configuré avec succès!${NC}"
echo ""
echo -e "${BLUE}Commandes disponibles:${NC}"
echo -e "  ${YELLOW}npm run dev${NC}     - Démarrer en mode développement"
echo -e "  ${YELLOW}npm run build${NC}   - Build pour production"
echo -e "  ${YELLOW}npm start${NC}       - Démarrer en production"
echo ""
echo -e "${BLUE}API disponible sur:${NC} http://localhost:3001"
echo -e "${BLUE}Health check:${NC} http://localhost:3001/health"
echo ""
echo -e "${YELLOW}💡 Pour démarrer maintenant:${NC} npm run dev"