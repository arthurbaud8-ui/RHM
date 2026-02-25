# Guide pour mettre à jour Node.js

## Problème
Vous utilisez Node.js 18.19.0, mais les packages nécessitent Node.js >= 20.19.0.

## Solution 1 : Installer nvm (Recommandé)

### Étape 1 : Installer nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

### Étape 2 : Recharger votre shell
```bash
source ~/.bashrc
# ou
source ~/.zshrc
```

### Étape 3 : Installer Node.js 20 (ou la dernière version LTS)
```bash
nvm install 20
nvm use 20
nvm alias default 20
```

### Étape 4 : Vérifier la version
```bash
node --version
```

## Solution 2 : Utiliser le gestionnaire de paquets Fedora

### Option A : Via NodeSource (versions récentes)
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### Option B : Via dnf (peut être une version plus ancienne)
```bash
sudo dnf module reset nodejs
sudo dnf module enable nodejs:20
sudo dnf install nodejs npm
```

## Solution 3 : Télécharger depuis nodejs.org

1. Visitez https://nodejs.org/
2. Téléchargez la version LTS (20.x ou 22.x)
3. Installez le paquet .rpm pour Fedora

## Après la mise à jour

Une fois Node.js mis à jour, dans le répertoire `frontend` :

```bash
npm install
npm run dev
```
