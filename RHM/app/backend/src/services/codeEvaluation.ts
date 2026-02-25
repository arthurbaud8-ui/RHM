/**
 * Évalue une réponse code (exercice "écrire" ou "corriger") via GPT.
 * Retourne un score 0-100 et un feedback optionnel.
 */
export interface CodeEvaluationResult {
  score: number; // 0-100
  feedback?: string;
}

export async function evaluateCodeWithGPT(params: {
  question: string;
  correctAnswer: string;
  userCode: string;
  codeExerciseType?: 'write' | 'fix';
  pointsMax?: number;
}): Promise<CodeEvaluationResult> {
  const { question, correctAnswer, userCode, codeExerciseType = 'write', pointsMax = 20 } = params;
  const { baseUrl, apiKey, model } = (await import('./aiConfig.js')).getAIConfig();

  if (!apiKey) {
    console.warn('OPENAI_API_KEY manquante, évaluation par similarité de base');
    return fallbackEvaluation(userCode, correctAnswer);
  }

  const systemPrompt = `Tu es un correcteur technique. Tu évalues le code d'un candidat pour un exercice de recrutement.
Tu dois retourner UNIQUEMENT un JSON valide avec exactement deux champs :
- "score" : nombre entre 0 et 100 (qualité/correctitude de la solution)
- "feedback" : une courte phrase en français expliquant pourquoi le score (optionnel)

Règles importantes :
- Priorité à la correction FONCTIONNELLE : le code fait-il ce qui est demandé ? Ne pénalise pas les petites erreurs (typo comme "temps" au lieu de "temp", point-virgule oublié, espaces) si la logique est correcte.
- Pour un code correct avec petites erreurs de forme : 70-90. Pour un code correct et propre : 85-100. Pour une solution partielle mais idée bonne : 50-75. Pour incorrect ou vide : 0-45.`;

  const userPrompt = `**Énoncé :** ${question}

**Solution de référence (pour comparer) :**
\`\`\`
${correctAnswer}
\`\`\`

**Code du candidat :**
\`\`\`
${userCode.trim() || '(vide)'}
\`\`\`

Type d'exercice : ${codeExerciseType === 'fix' ? 'corriger un bug' : 'écrire du code'}.
Évalue si la solution du candidat est fonctionnellement correcte (même avec des variantes de nom de variable ou de style). Retourne uniquement le JSON, sans markdown. Exemple : {"score": 85, "feedback": "Bonne logique de swap, petite typo sur le nom de variable."}`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('OpenAI code evaluation error:', response.status, err);
      return fallbackEvaluation(userCode, correctAnswer);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackEvaluation(userCode, correctAnswer);

    const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { score?: number; feedback?: string };
    const score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
    return { score, feedback: parsed.feedback };
  } catch (e) {
    console.error('Code evaluation error:', e);
    return fallbackEvaluation(userCode, correctAnswer);
  }
}

function fallbackEvaluation(userCode: string, correctAnswer: string): CodeEvaluationResult {
  const u = userCode.trim().toLowerCase().replace(/\s+/g, ' ');
  const c = correctAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!u) return { score: 0, feedback: 'Aucune réponse fournie.' };
  // Similarité basique : présence des idées clés
  const keyParts = c.split(/\s*[{}();]\s*/).filter(Boolean).slice(0, 10);
  const found = keyParts.filter(p => p.length > 2 && u.includes(p)).length;
  const score = keyParts.length ? Math.round((found / keyParts.length) * 100) : 50;
  return { score: Math.min(100, score), feedback: 'Évaluation automatique (fallback).' };
}
