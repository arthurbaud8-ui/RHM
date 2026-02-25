#!/usr/bin/env bash
# Génère et configure le .env pour le déploiement Docker (JWT_SECRET, CORS_ORIGIN, VITE_API_URL).
# Usage : ./scripts/setup-env.sh   ou   bash scripts/setup-env.sh

set -e
cd "$(dirname "$0")/.."

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "Fichier $ENV_EXAMPLE introuvable."
  exit 1
fi

# Créer .env à partir de .env.example si nécessaire
if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Création de $ENV_FILE à partir de $ENV_EXAMPLE"
fi

# Générer JWT_SECRET si absent ou encore la valeur par défaut
current_jwt=$(grep -E '^JWT_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
if [ -z "$current_jwt" ] || [ "$current_jwt" = "change-me-in-production" ] || [ "$current_jwt" = "fallback-secret-key" ]; then
  new_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 2>/dev/null || echo "")
  if [ -z "$new_secret" ]; then
    echo "Impossible de générer un secret. Définissez JWT_SECRET manuellement dans $ENV_FILE"
  else
    if sed --version 2>/dev/null | grep -q GNU; then
      sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$new_secret|" "$ENV_FILE"
    else
      sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$new_secret|" "$ENV_FILE"
    fi
    echo "JWT_SECRET généré et enregistré dans $ENV_FILE"
  fi
else
  echo "JWT_SECRET déjà défini dans $ENV_FILE"
fi

# CORS_ORIGIN : demander si encore localhost
current_cors=$(grep -E '^CORS_ORIGIN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
if [ -z "$current_cors" ] || [ "$current_cors" = "http://localhost:8080" ]; then
  echo ""
  echo "Pour la production, définissez l’URL publique de l’app (ex. https://rhm.example.com)"
  read -r -p "CORS_ORIGIN (Entrée = garder http://localhost:8080) : " input_cors
  if [ -n "$input_cors" ]; then
    # Retirer un éventuel slash final
    input_cors="${input_cors%/}"
    if sed --version 2>/dev/null | grep -q GNU; then
      sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$input_cors|" "$ENV_FILE"
    else
      sed -i '' "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$input_cors|" "$ENV_FILE"
    fi
    echo "CORS_ORIGIN mis à jour : $input_cors"
  fi
fi

# VITE_API_URL : en Docker (même domaine), /api suffit (déjà dans .env.example)
if ! grep -qE '^VITE_API_URL=' "$ENV_FILE" 2>/dev/null; then
  echo "" >> "$ENV_FILE"
  echo "VITE_API_URL=/api" >> "$ENV_FILE"
  echo "VITE_API_URL ajouté : /api (adapté au déploiement Docker)"
else
  echo "VITE_API_URL déjà défini dans $ENV_FILE"
fi

echo ""
echo "Configuration terminée. Vérifiez $ENV_FILE puis lancez : docker-compose up -d --build"
echo "  - JWT_SECRET : utilisé par le backend"
echo "  - CORS_ORIGIN : origine autorisée (URL du site en prod)"
echo "  - VITE_API_URL : URL de l’API au build du frontend (/api si même domaine)"
