# Dockerfile RHM - Même stack qu'en local : Frontend + Backend + Nginx (sans Llama)
# L'IA utilise les variables d'environnement (Groq/OpenAI) configurées sur Fly.io

# ============================================
# Stage 1: Build Backend
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY app/backend/package.json app/backend/package-lock.json* ./
RUN npm ci

COPY app/backend/tsconfig.json ./
COPY app/backend/src ./src
RUN npm run build

# ============================================
# Stage 2: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend ./

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ============================================
# Stage 3: Backend runtime (dépendances prod uniquement)
# ============================================
FROM node:20-alpine AS backend-runtime

WORKDIR /app/backend

COPY app/backend/package.json app/backend/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/backend/dist ./dist

RUN mkdir -p uploads /data

ENV NODE_ENV=production
EXPOSE 3001

# ============================================
# Stage 4: Image finale - Nginx + Backend (comme en local)
# ============================================
FROM nginx:alpine

RUN apk add --no-cache nodejs npm netcat-openbsd

WORKDIR /app

# Backend compilé + node_modules
COPY --from=backend-runtime /app/backend /app/backend

# Frontend build
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Nginx (déjà utilisé en local avec nginx-fly.conf)
COPY nginx-fly.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /app/uploads /data

# Démarrage : backend en arrière-plan, puis nginx au premier plan
# Les variables (JWT_SECRET, CORS_ORIGIN, OPENAI_API_KEY, GROQ_API_KEY, etc.) viennent des secrets Fly
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "=== RHM - Démarrage (Backend + Nginx, comme en local) ==="' >> /start.sh && \
    echo 'cd /app/backend && node dist/server.js &' >> /start.sh && \
    echo 'BACKEND_PID=$!' >> /start.sh && \
    echo 'echo "Backend démarré (PID $BACKEND_PID)"' >> /start.sh && \
    echo 'for i in 1 2 3 4 5 6 7 8 9 10; do' >> /start.sh && \
    echo '  if nc -z 127.0.0.1 3001 2>/dev/null; then echo "Backend prêt"; break; fi' >> /start.sh && \
    echo '  sleep 1' >> /start.sh && \
    echo 'done' >> /start.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
