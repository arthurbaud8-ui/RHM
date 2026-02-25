# Déploiement RHM sur un VPS

Guide pour héberger RHM (frontend + backend Node + PostgreSQL) sur un VPS (Ubuntu/Debian) avec Nginx et SSL.

---

## Prérequis

- Un **VPS** (Hetzner, OVH, Scaleway, etc.) avec **Ubuntu 22.04** ou **Debian 12**.
- Un **nom de domaine** pointant vers l’IP du VPS (enregistrement **A** : `mondomaine.fr` → IP du serveur).
- Accès **SSH** au serveur (`ssh root@IP` ou `ssh ubuntu@IP`).

---

## 1. Préparer le serveur

### Mise à jour et utilisateur (optionnel mais recommandé)

```bash
sudo apt update && sudo apt upgrade -y
sudo adduser rhm --disabled-password --gecos ""
sudo usermod -aG sudo rhm
# Se connecter en tant que rhm : su - rhm  ou  ssh rhm@IP
```

### Installer Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

### Installer PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Créer la base et un utilisateur :

```bash
sudo -u postgres psql -c "CREATE USER rhm WITH PASSWORD 'RHM2727';"
sudo -u postgres psql -c "CREATE DATABASE rhm OWNER rhm;"
```

Remplacez `CHANGEZ_MOT_DE_PASSE` par un mot de passe fort.

### Installer Nginx et PM2

```bash
sudo apt install -y nginx
sudo npm install -g pm2
```

---

## 2. Cloner le projet et configurer l’environnement

### Cloner le dépôt

Par exemple dans `/var/www/rhm` (ou `~/rhm`) :

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/VOTRE_USER/RHM.git rhm
cd rhm
# ou : cd rhm/RHM  si la racine du projet est dans un sous-dossier
```

Si ton repo est dans un sous-dossier (ex. `RHM/RHM`), adapte :

```bash
cd /var/www/rhm/RHM   # selon ta structure
```

### Variables d’environnement Backend

Créer le fichier `.env` du backend :

```bash
cd /var/www/rhm/RHM/app/backend
cp .env.example .env
nano .env
```

Exemple de contenu (à adapter) :

```env
NODE_ENV=production
PORT=3001

JWT_SECRET=une-cle-secrete-longue-et-aleatoire
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://mondomaine.fr
FRONTEND_URL=https://mondomaine.fr

DATABASE_URL=postgres://rhm:CHANGEZ_MOT_DE_PASSE@localhost:5432/rhm

# Optionnel : emails (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxx
MAIL_FROM=RHM <noreply@mondomaine.fr>

# Optionnel : IA (Groq)
OPENAI_API_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=votre_cle_groq
AI_MODEL=llama-3.1-8b-instant
```

Sauvegarder et quitter (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Frontend : URL de l’API

Le front doit appeler l’API en relatif (`/api`) pour que tout passe par le même domaine. Au build, on définit :

```bash
cd /var/www/rhm/RHM/frontend
echo "VITE_API_URL=/api" > .env.production
```

---

## 3. Build et migrations

### Backend

```bash
cd /var/www/rhm/RHM/app/backend
npm ci
npm run build
```

Les **migrations** (création des tables) s’exécutent automatiquement au **premier démarrage** du backend si `DATABASE_URL` est défini (voir `server.ts`). Aucune commande manuelle nécessaire.

### Frontend

```bash
cd /var/www/rhm/RHM/frontend
npm ci
npm run build
```

Les fichiers statiques sont dans `frontend/dist/`.

---

## 4. Démarrer le backend avec PM2

```bash
cd /var/www/rhm/RHM/app/backend
pm2 start dist/server.js --name rhm-backend
pm2 save
pm2 startup   # exécuter la commande suggérée pour démarrage au boot
```

Vérifier :

```bash
pm2 status
curl -s http://127.0.0.1:3001/health
```

---

## 5. Configurer Nginx

Copier la config fournie (à adapter avec ton domaine) :

```bash
sudo cp /var/www/rhm/RHM/config/nginx-vps.conf /etc/nginx/sites-available/rhm
sudo ln -sf /etc/nginx/sites-available/rhm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Éditer le nom de domaine :

```bash
sudo nano /etc/nginx/sites-available/rhm
```

Remplacer `mondomaine.fr` par ton domaine (et `www.mondomaine.fr` si tu utilises le www). Vérifier les chemins :

- `root` doit pointer vers le dossier **build du frontend**, ex. :  
  `root /var/www/rhm/RHM/frontend/dist;`
- Les `proxy_pass` pointent vers `http://127.0.0.1:3001;`

Tester et recharger Nginx :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. SSL avec Let’s Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mondomaine.fr -d www.mondomaine.fr
```

Suivre les instructions. Certbot modifie la config Nginx pour servir en HTTPS. Recharger Nginx si besoin :

```bash
sudo systemctl reload nginx
```

Renouvellement automatique :

```bash
sudo certbot renew --dry-run
```

---

## 7. Dossier uploads et permissions

Le backend enregistre les fichiers dans `app/backend/uploads`. S’assurer que l’utilisateur qui lance Node (celui qui exécute PM2) peut écrire dedans :

```bash
cd /var/www/rhm/RHM/app/backend
mkdir -p uploads
chmod 755 uploads
```

---

## 8. Déploiements suivants (mise à jour du code)

Depuis le VPS (ou en SSH depuis ta machine) :

```bash
cd /var/www/rhm/RHM
./scripts/deploy-vps.sh
```

Le script fait : `git pull`, `npm ci` + build front et back, redémarrage PM2. Voir la section suivante pour l’adapter à ton chemin (ex. `RHM/RHM`).

---

## Résumé des commandes utiles

| Action              | Commande                    |
|---------------------|----------------------------|
| Logs backend        | `pm2 logs rhm-backend`     |
| Redémarrer backend  | `pm2 restart rhm-backend` |
| Statut PM2          | `pm2 status`               |
| Tester Nginx        | `sudo nginx -t`            |
| Recharger Nginx     | `sudo systemctl reload nginx` |

---

## Dépannage

- **502 Bad Gateway** : le backend ne répond pas. Vérifier `pm2 status` et `pm2 logs rhm-backend`, et que `PORT=3001` est bien utilisé.
- **Page blanche / 404 sur les routes front** : le `root` Nginx doit pointer vers `frontend/dist` et `try_files` doit inclure `/index.html`.
- **Erreur base de données** : vérifier `DATABASE_URL`, que PostgreSQL écoute sur `localhost`, et que les migrations ont été exécutées (redémarrage du backend au moins une fois).
- **CORS** : en prod, `CORS_ORIGIN` et `FRONTEND_URL` doivent être l’URL réelle du site (ex. `https://mondomaine.fr`).
