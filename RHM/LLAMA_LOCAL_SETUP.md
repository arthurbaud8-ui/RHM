# Configuration Llama Local pour RHM

Ce projet utilise maintenant **Llama 3.2 3B** en local au lieu d'utiliser des APIs externes (OpenAI, Groq).

## Architecture

- **Llama.cpp** : Serveur HTTP compatible OpenAI API
- **Modèle** : Llama 3.2 3B Instruct (quantifié Q4_K_M, ~2GB)
- **Port** : 8080 (interne, accessible uniquement depuis le container)
- **API** : Compatible OpenAI (`/v1/chat/completions`)

## Configuration

### Variables d'environnement

Le script de démarrage configure automatiquement :
- `OPENAI_API_BASE_URL=http://127.0.0.1:8080/v1`
- `OPENAI_API_KEY=local-llama-key`
- `AI_MODEL=llama-3.2-3b-instruct`

### Ressources Fly.io

- **CPU** : 2 cores (shared)
- **RAM** : 3072 MB (3GB) - nécessaire pour le modèle
- **Stockage** : Le modèle (~2GB) est téléchargé au premier démarrage

## Déploiement

### 1. Déployer sur Fly.io

```bash
./scripts/deploy-fly.sh
```

Le modèle sera automatiquement téléchargé lors du premier démarrage (peut prendre 5-10 minutes).

### 2. Vérifier le déploiement

```bash
# Voir les logs pour vérifier que Llama démarre correctement
flyctl logs -a rhm-app | grep -i llama

# Vérifier que le serveur Llama répond
flyctl ssh console -a rhm-app
curl http://127.0.0.1:8080/v1/models
```

## Utilisation

Tous les services IA utilisent maintenant Llama local :

1. **Génération de tests techniques** (`testGenerator.ts`)
2. **Analyse de CV** (`cvAnalysis.ts`)
3. **Évaluation de code** (`codeEvaluation.ts`)
4. **Notes de recrutement** (`cvNoteForOffer.ts`)

**Note** : La génération de logos (`companyLogoGenerator.ts`) utilise toujours un placeholder car DALL-E nécessite OpenAI. Si vous voulez générer des logos, vous pouvez configurer une clé OpenAI séparée.

## Performance

- **Premier démarrage** : 5-10 minutes (téléchargement du modèle)
- **Démarrages suivants** : 30-60 secondes (modèle déjà présent)
- **Génération de réponse** : 2-10 secondes selon la complexité
- **Contexte** : 4096 tokens (peut être ajusté dans le Dockerfile)

## Dépannage

### Le modèle ne se télécharge pas

Vérifiez les logs :
```bash
flyctl logs -a rhm-app | grep -i "téléchargement\|download\|modèle"
```

### Llama server ne démarre pas

Vérifiez les logs :
```bash
flyctl ssh console -a rhm-app
cat /tmp/llama.log
```

### Réponses de mauvaise qualité

Le modèle 3B est plus petit que GPT-4. Pour de meilleures performances :
- Augmentez le contexte (`-c` dans le Dockerfile)
- Utilisez un modèle plus grand (7B ou 13B) - nécessitera plus de RAM
- Ajustez la température dans les prompts

## Modifier le modèle

Pour utiliser un autre modèle Llama :

1. Modifiez `MODEL_URL` dans le Dockerfile (script `/download-model.sh`)
2. Modifiez `MODEL_FILE` dans le script de démarrage
3. Modifiez `AI_MODEL` dans les variables d'environnement
4. Ajustez la RAM dans `fly.toml` si nécessaire

Modèles recommandés :
- **Llama 3.2 3B** : ~2GB, rapide, bon pour la plupart des cas
- **Llama 3.1 8B** : ~4.5GB, meilleure qualité, nécessite 6-8GB RAM
- **Phi-3 3.8B** : ~2.2GB, très rapide, bonne qualité

## Retour aux APIs externes

Si vous voulez revenir à Groq ou OpenAI :

1. Configurez les secrets Fly.io :
```bash
flyctl secrets set OPENAI_API_BASE_URL="https://api.groq.com/openai/v1" -a rhm-app
flyctl secrets set OPENAI_API_KEY="votre-cle" -a rhm-app
flyctl secrets set AI_MODEL="llama-3.1-8b-instant" -a rhm-app
```

2. Redéployez sans Llama (modifiez le Dockerfile pour ne pas compiler llama.cpp)

## Coûts

- **Fly.io** : ~$15-20/mois pour 3GB RAM + 2 CPU
- **APIs externes** : $0 (plus besoin de clés API)
