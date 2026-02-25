import { JobOffer, Test, Question } from '../types/index.js';

export interface GeneratedTest {
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  timeLimit: number;
  passScore: number;
}

export interface GenerateTestOptions {
  /** Note du recruteur : ce qu'il souhaite tester en priorité chez le candidat */
  recruiterTestNote?: string;
  /** Si true, le test est généré UNIQUEMENT à partir du texte du recruteur (option "Nouveau test IA") */
  isCustomTest?: boolean;
}

/**
 * Génère un test technique personnalisé pour une offre d'emploi en utilisant l'IA (Llama local ou API externe)
 * @param jobOffer L'offre d'emploi pour laquelle générer le test
 * @param options Note du recruteur pour cibler ce qu'il veut tester
 * @returns Un test généré avec des questions adaptées
 */
export async function generateTestForJobOffer(jobOffer: JobOffer, options?: GenerateTestOptions): Promise<GeneratedTest> {
  const { baseUrl, apiKey, model } = (await import('./aiConfig.js')).getAIConfig();
  const recruiterTestNote = options?.recruiterTestNote?.trim();
  const isCustomTest = options?.isCustomTest === true && !!recruiterTestNote;

  if (!apiKey) {
    throw new Error('Clé API IA non configurée : définissez OPENAI_API_KEY ou GROQ_API_KEY dans le .env (ex. app/backend/.env)');
  }

  // Déterminer la difficulté basée sur le niveau d'expérience requis
  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    'Junior': 'easy',
    'Confirmé': 'medium',
    'Senior': 'hard',
    'Expert': 'hard'
  };
  const difficulty = difficultyMap[jobOffer.experience] || 'medium';

  const noteBlock = recruiterTestNote
    ? `\n\n⚠️ **INSTRUCTION PRIORITAIRE DU RECRUTEUR (À INTÉGRER DANS TOUTES LES QUESTIONS) :**\n${recruiterTestNote}\n\nTu DOIS absolument tenir compte de cette instruction du recruteur lors de la génération de CHAQUE question. Les questions doivent tester spécifiquement ce que le recruteur demande.\n`
    : '';

  // Détecter si les compétences nécessitent du code
  const codingKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c ', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
    'react', 'vue', 'angular', 'node', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
    'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
    'algorithm', 'algorithme', 'programmation', 'développement', 'développeur', 'dev', 'coding', 'code',
    'api', 'rest', 'graphql', 'microservice', 'backend', 'frontend', 'fullstack', 'full-stack',
    'c/c++', 'c langage', 'langage c'
  ];
  
  const skillsLower = jobOffer.skills.map(s => s.toLowerCase()).join(' ');
  // Détection améliorée : pour "C" seul, vérifier qu'il n'est pas dans un autre mot. En mode "Nouveau test IA", on laisse l'IA décider (QCM ou code).
  let requiresCode = isCustomTest ? false : codingKeywords.some(keyword => {
    if (keyword === 'c ' || keyword === 'c/c++' || keyword === 'c langage' || keyword === 'langage c') {
      // Pour "C", vérifier qu'il apparaît comme mot séparé ou avec des caractères spéciaux
      return /\bc\b|\bc\/|\bc\+\+|\bc#/i.test(skillsLower);
    }
    return skillsLower.includes(keyword.toLowerCase());
  });

  // Préparer le prompt pour l'IA (mode "Nouveau test IA" = strictement ce que le recruteur a écrit)
  let prompt: string;
  if (isCustomTest && recruiterTestNote) {
    prompt = `Tu es un expert en création de tests pour le recrutement. Un recruteur demande un test personnalisé. Tu DOIS générer un test qui correspond STRICTEMENT et UNIQUEMENT à sa demande : chaque question doit porter directement sur ce qu'il a décrit. N'ajoute pas de sujets génériques.

**DEMANDE EXACTE DU RECRUTEUR (À RESPECTER À LA LETTRE) :**
${recruiterTestNote}

**Contexte (pour le niveau et le format uniquement) :** Poste "${jobOffer.title}", compétences : ${jobOffer.skills.join(', ')}, niveau ${jobOffer.experience}.

**Instructions :**
1. Génère EXACTEMENT 5 questions qui testent UNIQUEMENT ce que le recruteur a demandé ci-dessus.
2. Si sa demande mentionne du code / programmation, inclus des exercices de code (type "code" avec codeExerciseType "write" ou "fix"). Sinon, fais des QCM.
3. Chaque question doit être clairement en lien avec sa demande (ex. s'il demande "tester React et les hooks", toutes les questions portent sur React et les hooks).
4. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après. Format :
{
  "title": "Test personnalisé - [sujet demandé par le recruteur]",
  "description": "Description reflétant la demande du recruteur",
  "category": "Technique",
  "difficulty": "${difficulty}",
  "timeLimit": 30,
  "passScore": 60,
  "questions": [
    { "id": "q1", "question": "...", "type": "multiple-choice" ou "code", "options": ["A","B","C","D"] si QCM, "correctAnswer": "...", "points": 20, "explanation": "...", "codeExerciseType": "write" ou "fix" si code, "initialCode" ou "starterCode" si pertinent }
  ]
}
Le tableau "questions" doit contenir EXACTEMENT 5 éléments. Pas de markdown, pas de \\n dans les chaînes de code (utilise des espaces).`;
  } else {
    prompt = `Tu es un expert en recrutement technique. Génère un test technique personnalisé pour cette offre d'emploi.

**Offre d'emploi :**
- Titre : ${jobOffer.title}
- Description : ${jobOffer.description}
- Compétences requises : ${jobOffer.skills.join(', ')}
- Niveau d'expérience : ${jobOffer.experience}
- Type de contrat : ${jobOffer.contractType}
- Localisation : ${jobOffer.location}
${noteBlock}

**Instructions CRITIQUES :**
${requiresCode 
  ? `1. ⚠️ IMPORTANT : Tu DOIS générer EXACTEMENT 5 questions au total : 2 QCM (multiple-choice) + 3 exercices de code réels. Pas moins, pas plus.
2. Pour les QCM (questions 1 et 2) : 4 options, une seule correcte, adaptées aux compétences ${jobOffer.skills.join(', ')}.
3. Pour les exercices de code (questions 3, 4 et 5), utilise DE VRAIS exercices (pas de quiz) directement liés aux compétences ${jobOffer.skills.join(', ')} :
   - Question 3 : "write" (codeExerciseType: "write") - demander d'écrire une fonction ou un petit programme en rapport avec ${jobOffer.skills.join(', ')}. Exemples selon les compétences :
     * Si React/Vue/Angular : "Écris un composant React qui affiche une liste d'items avec filtrage"
     * Si Node.js/Express : "Implémente une route API REST qui gère CRUD pour une ressource"
     * Si Python/Django : "Écris une fonction qui traite des données et les sauvegarde"
     * Si SQL/Database : "Écris une requête SQL qui joint plusieurs tables et filtre les résultats"
     * Adapte selon les compétences réelles de l'offre.
   - Question 4 : "fix" (codeExerciseType: "fix") - donner du code contenant un bug en rapport avec ${jobOffer.skills.join(', ')}. Champ "initialCode" = code bugué, "question" = consigne ("Corrige le bug dans le code suivant pour que..."), "correctAnswer" = code corrigé.
   - Question 5 : "write" (codeExerciseType: "write") - un autre exercice d'écriture de code en rapport avec ${jobOffer.skills.join(', ')}.
   - Les exercices doivent être pertinents pour les compétences demandées, pas génériques.
4. Difficulté : ${difficulty}. Langage privilégié : détecte automatiquement selon les compétences (JavaScript/TypeScript pour React/Node, Python pour Django/Flask, etc.).`
  : `1. ⚠️ IMPORTANT : Tu DOIS générer EXACTEMENT 5 questions QCM (multiple-choice), AUCUN exercice de code. Pas moins, pas plus.
2. Les questions doivent tester la connaissance théorique et pratique des compétences ${jobOffer.skills.join(', ')}.
3. Chaque QCM : 4 options, une seule correcte, adaptées aux compétences spécifiques de l'offre.
4. Difficulté : ${difficulty}.`
}
5. Chaque question a "points" (répartis pour total 100, ex: 20 par question).
6. ⚠️ CRITIQUE : Assure-toi que le JSON est COMPLET avec TOUTES les 5 questions. Ne tronque pas la réponse.

**Format de réponse JSON strict (sans markdown, pas de \\n dans les chaînes de code, utilise des espaces) :**
${requiresCode
  ? `{
  "title": "Test technique - [Titre du poste]",
  "description": "Description du test adaptée à l'offre",
  "category": "Technique",
  "difficulty": "${difficulty}",
  "timeLimit": 30,
  "passScore": 60,
  "questions": [
    {
      "id": "q1",
      "question": "Question QCM 1 sur ${jobOffer.skills[0] || 'les compétences'}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q2",
      "question": "Question QCM 2 sur ${jobOffer.skills[1] || 'les compétences'}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q3",
      "question": "Écris une fonction en rapport avec ${jobOffer.skills.join(', ')}",
      "type": "code",
      "codeExerciseType": "write",
      "starterCode": "function example() { /* ... */ }",
      "correctAnswer": "function example() { /* solution */ }",
      "points": 20,
      "explanation": "Solution"
    },
    {
      "id": "q4",
      "question": "Corrige le bug dans le code suivant lié à ${jobOffer.skills[0] || 'la compétence'}",
      "type": "code",
      "codeExerciseType": "fix",
      "initialCode": "function buggy() { /* bug */ }",
      "correctAnswer": "function buggy() { /* corrigé */ }",
      "points": 20,
      "explanation": "Explication du bug"
    },
    {
      "id": "q5",
      "question": "Écris un autre exercice de code en rapport avec ${jobOffer.skills.join(', ')}",
      "type": "code",
      "codeExerciseType": "write",
      "starterCode": "function another() { /* ... */ }",
      "correctAnswer": "function another() { /* solution */ }",
      "points": 20,
      "explanation": "Solution"
    }
  ]
}`
  : `{
  "title": "Test technique - [Titre du poste]",
  "description": "Description du test adaptée à l'offre",
  "category": "Technique",
  "difficulty": "${difficulty}",
  "timeLimit": 30,
  "passScore": 60,
  "questions": [
    {
      "id": "q1",
      "question": "Question QCM 1 sur ${jobOffer.skills[0] || 'les compétences'}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q2",
      "question": "Question QCM 2 sur ${jobOffer.skills[1] || 'les compétences'}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q3",
      "question": "Question QCM 3 sur ${jobOffer.skills[2] || 'les compétences'}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "C",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q4",
      "question": "Question QCM 4 sur ${jobOffer.skills.join(', ')}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "D",
      "points": 20,
      "explanation": "Explication"
    },
    {
      "id": "q5",
      "question": "Question QCM 5 sur ${jobOffer.skills.join(', ')}",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "points": 20,
      "explanation": "Explication"
    }
  ]
}`
}

Réponds UNIQUEMENT avec le JSON complet et valide, sans texte avant ou après. Le JSON doit contenir EXACTEMENT 5 questions dans le tableau "questions".`;
  }

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
          {
            role: 'system',
            content: 'Tu es un expert en création de tests techniques pour le recrutement. Génère des tests pertinents et adaptés aux postes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 6000, // Augmenté pour garantir que toutes les questions sont générées (6000 tokens = ~4500 mots)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erreur API OpenAI: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Aucune réponse de ChatGPT');
    }

    // Parser la réponse JSON avec gestion d'erreur améliorée
    let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Essayer d'extraire le JSON si entouré de texte
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }
    
    // Logger le contenu brut pour debug (premiers 500 caractères)
    console.log('📝 Réponse brute de ChatGPT (premiers 500 caractères):', cleanedContent.substring(0, 500));
    
    let generatedTest: GeneratedTest;
    try {
      generatedTest = JSON.parse(cleanedContent);
      const numQuestions = generatedTest.questions?.length || 0;
      console.log(`✅ JSON parsé avec succès. Nombre de questions trouvées: ${numQuestions}`);
      
      // Vérifier que le test a bien des questions
      if (!generatedTest.questions || numQuestions === 0) {
        console.error('❌ Test généré sans questions dans le JSON');
        console.error('Structure du JSON:', JSON.stringify(generatedTest, null, 2).substring(0, 500));
        throw new Error('Test généré sans questions');
      }
      
      // Vérifier si le JSON semble tronqué (dernier caractère n'est pas })
      if (!cleanedContent.trim().endsWith('}')) {
        console.warn('⚠️ Le JSON semble tronqué (ne se termine pas par })');
      }
    } catch (parseError: any) {
      console.error('❌ Erreur de parsing JSON:', parseError.message);
      console.error('Contenu reçu (premiers 1000 caractères):', cleanedContent.substring(0, 1000));
      console.error('Contenu reçu (derniers 500 caractères):', cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
      throw new Error(`Réponse JSON invalide de ChatGPT: ${parseError.message}`);
    }

    // Valider et nettoyer les résultats - s'assurer que toutes les questions sont incluses
    const cleanedQuestions = (generatedTest.questions || []).map((q: any, index: number) => {
      const isCode = q.type === 'code' || q.codeExerciseType || q.initialCode || q.starterCode;
      return {
        id: q.id || `q${index + 1}`,
        question: q.question || `Question ${index + 1}`,
        type: (isCode ? 'code' : 'multiple-choice') as 'code' | 'multiple-choice',
        options: isCode ? undefined : (Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D']),
        correctAnswer: q.correctAnswer || '',
        points: q.points || Math.floor(100 / (generatedTest.questions?.length || 5)),
        explanation: q.explanation || '',
        codeExerciseType: (q.codeExerciseType === 'fix' ? 'fix' : q.codeExerciseType === 'write' ? 'write' : (isCode ? 'write' : undefined)) as 'write' | 'fix' | undefined,
        initialCode: q.initialCode || undefined,
        starterCode: q.starterCode || undefined,
      };
    });

    // S'assurer qu'il y a au moins quelques questions
    if (cleanedQuestions.length === 0) {
      console.error('Aucune question générée par ChatGPT');
      throw new Error('Aucune question générée par ChatGPT');
    }

    // Si moins de 5 questions, compléter avec des questions par défaut
    if (cleanedQuestions.length < 5) {
      console.warn(`⚠️ Seulement ${cleanedQuestions.length} question(s) générée(s) au lieu de 5. Complétion avec des questions par défaut.`);
      console.warn('Contenu reçu (premiers 1000 caractères):', cleanedContent.substring(0, 1000));
      
      // Compléter jusqu'à 5 questions
      const numMissing = 5 - cleanedQuestions.length;
      for (let i = 0; i < numMissing; i++) {
        const questionIndex = cleanedQuestions.length + i + 1;
        const isCodeQuestion = requiresCode && questionIndex > 2; // Questions de code à partir de la 3ème
        
        if (isCodeQuestion) {
          const codeType = (questionIndex === 3) ? 'write' : (questionIndex === 4) ? 'fix' : 'write';
          cleanedQuestions.push({
            id: `q${questionIndex}`,
            question: codeType === 'fix' 
              ? `Corrige le bug dans le code suivant lié à ${jobOffer.skills[0] || 'la compétence'}`
              : `Écris une fonction en rapport avec ${jobOffer.skills[questionIndex - 3] || jobOffer.skills[0] || 'les compétences'}`,
            type: 'code' as const,
            options: undefined,
            codeExerciseType: codeType,
            starterCode: codeType === 'write' ? `function example${questionIndex}() {\n  // Votre code ici\n}` : undefined,
            initialCode: codeType === 'fix' ? `function buggy() {\n  // Code avec bug à corriger\n  return false;\n}` : undefined,
            correctAnswer: codeType === 'fix' 
              ? `function buggy() {\n  // Code corrigé\n  return true;\n}`
              : `function example${questionIndex}() {\n  // Solution\n}`,
            points: Math.floor(100 / 5),
            explanation: 'Question complétée automatiquement',
          });
        } else {
          cleanedQuestions.push({
            id: `q${questionIndex}`,
            question: `Question ${questionIndex} sur ${jobOffer.skills[questionIndex - 1] || jobOffer.skills[0] || 'les technologies requises'}`,
            type: 'multiple-choice' as const,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option B',
            points: Math.floor(100 / 5),
            explanation: 'Question complétée automatiquement',
            codeExerciseType: undefined,
            initialCode: undefined,
            starterCode: undefined,
          });
        }
      }
    }

    return {
      title: generatedTest.title || `Test technique - ${jobOffer.title}`,
      description: generatedTest.description || `Test technique pour le poste de ${jobOffer.title}`,
      category: generatedTest.category || 'Technique',
      difficulty: generatedTest.difficulty || difficulty,
      timeLimit: generatedTest.timeLimit || 30,
      passScore: generatedTest.passScore || 60,
      questions: cleanedQuestions,
    };
  } catch (error: any) {
    console.error('Erreur lors de la génération du test avec ChatGPT:', error);
    console.error('Détails de l\'erreur:', error.message);
    console.error('Stack:', error.stack);
    
    // En cas d'erreur, retourner un test par défaut avec 5 questions
    const defaultQuestions: any[] = [];
    const numQuestions = requiresCode ? 5 : 5; // Toujours 5 questions
    
    for (let i = 0; i < numQuestions; i++) {
      if (requiresCode && i >= 2) {
        // Questions de code à partir de la 3ème
        const codeType = i === 2 ? 'write' : i === 3 ? 'fix' : 'write';
        defaultQuestions.push({
          id: `q${i + 1}`,
          question: codeType === 'fix' 
            ? `Corrige le bug dans le code suivant lié à ${jobOffer.skills[0] || 'la compétence'}`
            : `Écris une fonction en rapport avec ${jobOffer.skills[i - 2] || jobOffer.skills[0] || 'les compétences'}`,
          type: 'code' as const,
          options: undefined,
          codeExerciseType: codeType,
          starterCode: codeType === 'write' ? `function example${i + 1}() {\n  // Votre code ici\n}` : undefined,
          initialCode: codeType === 'fix' ? `function buggy() {\n  // Code avec bug\n  return false;\n}` : undefined,
          correctAnswer: codeType === 'fix' 
            ? `function buggy() {\n  // Code corrigé\n  return true;\n}`
            : `function example${i + 1}() {\n  // Solution\n}`,
          points: 20,
          explanation: 'Question générée par défaut',
        });
      } else {
        // Questions QCM
        defaultQuestions.push({
          id: `q${i + 1}`,
          question: `Question ${i + 1} sur ${jobOffer.skills[i] || jobOffer.skills[0] || 'les technologies requises'}`,
          type: 'multiple-choice' as const,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option B',
          points: 20,
          explanation: 'Question générée par défaut',
          codeExerciseType: undefined,
          initialCode: undefined,
          starterCode: undefined,
        });
      }
    }
    
    return {
      title: `Test technique - ${jobOffer.title}`,
      description: `Test technique pour le poste de ${jobOffer.title} (généré par défaut suite à une erreur)`,
      category: 'Technique',
      difficulty,
      timeLimit: 30,
      passScore: 60,
      questions: defaultQuestions,
    };
  }
}
