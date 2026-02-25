# Guide de débogage - Page blanche

## Erreurs TypeScript corrigées ✅

Les erreurs TypeScript ont été corrigées. Voici comment déboguer la page blanche :

## Étapes de débogage

### 1. Vérifier la console du navigateur
Ouvrez les outils de développement (F12) et vérifiez :
- **Console** : Y a-t-il des erreurs JavaScript ?
- **Network** : Les fichiers sont-ils bien chargés ?
- **Elements** : Y a-t-il un élément `<div id="app">` dans le DOM ?

### 2. Vérifier que le serveur démarre correctement
```bash
cd frontend
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:5173`

### 3. Vérifier les erreurs courantes

#### Problème : Erreur dans AuthContext
Si vous voyez une erreur liée à `useAuth`, vérifiez que vous êtes bien dans un `AuthProvider`.

#### Problème : Erreur de routage
Si React Router ne fonctionne pas, vérifiez que vous accédez à `/login` ou `/` et non à `/frontend`.

#### Problème : Erreur API
Si le backend n'est pas démarré, certaines pages peuvent échouer silencieusement.

### 4. Test rapide
Ajoutez ceci temporairement dans `main.tsx` pour voir si React fonctionne :

```tsx
console.log('🚀 Démarrage de l\'application...')
console.log('Root element:', document.getElementById('app'))
```

### 5. Vérifier les styles Tailwind
Si Tailwind ne se charge pas, la page peut sembler vide. Vérifiez que `style.css` est bien importé dans `main.tsx`.

## Solutions possibles

1. **Vider le cache du navigateur** : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
2. **Vérifier que Node.js est bien à jour** : `node --version` (doit être >= 20.19.0)
3. **Réinstaller les dépendances** : `rm -rf node_modules && npm install`
4. **Vérifier les logs du serveur** : Regardez la sortie de `npm run dev`
