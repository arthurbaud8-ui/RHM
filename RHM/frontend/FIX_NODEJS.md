# Résolution du conflit Node.js

## Problème
Les packages Node.js 18 sont en conflit avec Node.js 20. Il faut désinstaller les anciens packages avant d'installer la nouvelle version.

## Solution : Désinstaller puis réinstaller

### Étape 1 : Désinstaller tous les packages Node.js 18
```bash
sudo dnf remove -y nodejs nodejs-libs nodejs-docs nodejs-full-i18n nodejs-npm
```

### Étape 2 : Installer Node.js 20 depuis NodeSource
```bash
sudo dnf install -y nodejs
```

### Étape 3 : Vérifier la version
```bash
node --version
npm --version
```

### Étape 4 : Dans le répertoire frontend, réinstaller les dépendances
```bash
cd frontend
npm install
npm run dev
```

## Alternative : Utiliser --allowerasing (plus rapide mais moins sûr)

Si vous préférez forcer la mise à jour directement :

```bash
sudo dnf install -y --allowerasing nodejs
```

Cette commande désinstallera automatiquement les packages conflictuels et installera Node.js 20.
