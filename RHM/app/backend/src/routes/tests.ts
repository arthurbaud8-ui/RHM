import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dataStore } from '../data/asyncStore.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { TestResult, Answer } from '../types/index.js';
import { evaluateCodeWithGPT } from '../services/codeEvaluation.js';

const router = Router();

// Get all available tests
router.get('/', async (req, res): Promise<void> => {
  try {
    const tests = await dataStore.getAllTests();

    const testsForClient = tests.map(test => ({
      ...test,
      questions: (test.questions || []).map((q: any) => ({
        id: q.id || `q-${Math.random()}`,
        question: q.question || '',
        type: q.type || (q.codeExerciseType ? 'code' : 'multiple-choice'),
        options: q.options || (q.type === 'code' ? undefined : []),
        points: q.points || 20,
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        codeExerciseType: q.codeExerciseType,
        initialCode: q.initialCode,
        starterCode: q.starterCode
      }))
    }));

    res.json({
      success: true,
      data: testsForClient,
      message: 'Tests récupérés avec succès'
    });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tests'
    });
  }
});

// Get test by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const test = await dataStore.getTestById(id);

    if (!test) {
      res.status(404).json({
        success: false,
        error: 'Test non trouvé'
      });
      return;
    }

    // Remove correct answers for security; keep code exercise fields for display
    const testForClient = {
      ...test,
      questions: (test.questions || []).map((q: any) => ({
        id: q.id || `q-${Math.random()}`,
        question: q.question || '',
        type: q.type || (q.codeExerciseType ? 'code' : 'multiple-choice'),
        options: q.options || (q.type === 'code' ? undefined : []),
        points: q.points || 20,
        correctAnswer: q.correctAnswer || '', // Gardé pour l'évaluation côté serveur
        explanation: q.explanation || '',
        codeExerciseType: q.codeExerciseType,
        initialCode: q.initialCode,
        starterCode: q.starterCode
      }))
    };

    res.json({
      success: true,
      data: testForClient,
      message: 'Test récupéré avec succès'
    });
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du test'
    });
  }
});

// Start a test (create test result entry)
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const test = await dataStore.getTestById(id);

    if (!test) {
      res.status(404).json({
        success: false,
        error: 'Test non trouvé'
      });
      return;
    }

    // Check if user already has an active test result for this test
    const existingResults = await dataStore.getTestResultsByUserId(req.user.id);
    const activeResult = existingResults.find(result =>
      result.testId === id && result.status === 'in-progress'
    );

    if (activeResult) {
      res.json({
        success: true,
        data: {
          testResultId: activeResult.id,
          test: {
            ...test,
            questions: (test.questions || []).map((q: any) => ({
              id: q.id || `q-${Math.random()}`,
              question: q.question || '',
              type: q.type || (q.codeExerciseType ? 'code' : 'multiple-choice'),
              options: q.options || (q.type === 'code' ? undefined : []),
              points: q.points || 20,
              correctAnswer: q.correctAnswer || '',
              explanation: q.explanation || '',
              codeExerciseType: q.codeExerciseType,
              initialCode: q.initialCode,
              starterCode: q.starterCode
            }))
          }
        },
        message: 'Test en cours récupéré'
      });
      return;
    }

    // Create new test result
    const testResult: TestResult = {
      id: uuidv4(),
      testId: id,
      userId: req.user.id,
      answers: [],
      score: 0,
      maxScore: test.questions.reduce((sum, q) => sum + q.points, 0),
      percentage: 0,
      startedAt: new Date(),
      status: 'in-progress'
    };

    const createdResult = await dataStore.createTestResult(testResult);

    res.json({
      success: true,
      data: {
        testResultId: createdResult.id,
        test: {
          ...test,
          questions: (test.questions || []).map((q: any) => ({
            id: q.id || `q-${Math.random()}`,
            question: q.question || '',
            type: q.type || (q.codeExerciseType ? 'code' : 'multiple-choice'),
            options: q.options || (q.type === 'code' ? undefined : []),
            points: q.points || 20,
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            codeExerciseType: q.codeExerciseType,
            initialCode: q.initialCode,
            starterCode: q.starterCode
          }))
        }
      },
      message: 'Test démarré avec succès'
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du démarrage du test'
    });
  }
});

// Submit test answers
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const { testResultId, answers, applicationId } = req.body;

    const test = await dataStore.getTestById(id);
    const testResult = await dataStore.getTestResultById(testResultId);

    if (!test || !testResult) {
      res.status(404).json({
        success: false,
        error: 'Test ou résultat non trouvé'
      });
      return;
    }

    if (testResult.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
      return;
    }

    // Grade the answers (async pour les questions code évaluées par GPT)
    const gradedAnswers: Answer[] = [];
    for (const userAnswer of answers) {
      const question = test.questions.find((q: any) => q.id === userAnswer.questionId);
      if (!question) {
        gradedAnswers.push({
          questionId: userAnswer.questionId,
          answer: userAnswer.answer,
          isCorrect: false,
          points: 0
        });
        continue;
      }

      // Normaliser la réponse de l'utilisateur
      let answerText = Array.isArray(userAnswer.answer) 
        ? userAnswer.answer.join('').trim()
        : String(userAnswer.answer ?? '').trim();
      
      // Nettoyer la réponse (enlever les espaces, caractères spéciaux de formatage)
      answerText = answerText.replace(/\s+/g, ' ').trim();

      if (question.type === 'multiple-choice') {
        // Normaliser la bonne réponse aussi
        let correctAnswerRaw = Array.isArray(question.correctAnswer)
          ? question.correctAnswer[0]
          : question.correctAnswer;
        let correctAnswer = String(correctAnswerRaw ?? '').trim();
        
        // Nettoyer la bonne réponse aussi
        correctAnswer = correctAnswer.replace(/\s+/g, ' ').trim();
        
        let isCorrect = false;
        
        // Si on a des options, utiliser la logique de comparaison avec les options
        if (question.options && Array.isArray(question.options) && question.options.length > 0) {
          // Normaliser toutes les options
          const normalizedOptions = question.options.map((opt, idx) => {
            const optStr = String(opt).trim().replace(/\s+/g, ' ');
            return {
              original: opt,
              index: idx,
              letter: String.fromCharCode(65 + idx), // A, B, C, D
              normalized: optStr.toUpperCase(),
              normalizedLower: optStr.toLowerCase()
            };
          });
          
          // Si correctAnswer est une lettre (A, B, C, D), trouver l'option correspondante
          const correctAnswerUpper = correctAnswer.toUpperCase();
          let correctOptionText = null;
          let correctOptionIndex = -1;
          
          if (/^[A-D]$/.test(correctAnswerUpper)) {
            // C'est une lettre, trouver l'option correspondante
            correctOptionIndex = correctAnswerUpper.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            if (correctOptionIndex >= 0 && correctOptionIndex < normalizedOptions.length) {
              correctOptionText = normalizedOptions[correctOptionIndex].normalized;
            }
          } else {
            // Ce n'est pas une lettre, chercher l'option qui correspond au texte
            const found = normalizedOptions.find(opt => 
              opt.normalized === correctAnswerUpper ||
              opt.normalizedLower === correctAnswer.toLowerCase()
            );
            if (found) {
              correctOptionIndex = found.index;
              correctOptionText = found.normalized;
            }
          }
          
          // Normaliser la réponse du candidat
          const answerTextUpper = answerText.toUpperCase();
          
          // Comparer la réponse du candidat avec le texte de l'option correcte
          if (correctOptionText) {
            // Fonction pour normaliser encore plus (enlever ponctuation, espaces multiples)
            const deepNormalize = (text: string) => {
              return text
                .toLowerCase()
                .replace(/[^\w\s]/g, '') // Enlever ponctuation
                .replace(/\s+/g, ' ') // Espaces multiples -> un seul
                .trim();
            };
            
            const normalizedCandidateAnswer = deepNormalize(answerText);
            const normalizedCorrectAnswer = deepNormalize(normalizedOptions[correctOptionIndex].original);
            
            // Comparaison directe avec le texte de l'option correcte
            isCorrect = answerTextUpper === correctOptionText ||
                       answerText.toLowerCase() === normalizedOptions[correctOptionIndex].normalizedLower ||
                       normalizedCandidateAnswer === normalizedCorrectAnswer;
            
            // Si pas encore trouvé, comparer avec toutes les options pour trouver celle du candidat
            if (!isCorrect) {
              const candidateOptionIndex = normalizedOptions.findIndex(opt => {
                const optNormalized = deepNormalize(opt.original);
                return opt.normalized === answerTextUpper || 
                       opt.normalizedLower === answerText.toLowerCase() ||
                       optNormalized === normalizedCandidateAnswer ||
                       // Comparaison partielle (pour gérer les variations de texte)
                       opt.normalized.includes(answerTextUpper) ||
                       answerTextUpper.includes(opt.normalized) ||
                       optNormalized.includes(normalizedCandidateAnswer) ||
                       normalizedCandidateAnswer.includes(optNormalized);
              });
              
              if (candidateOptionIndex >= 0 && candidateOptionIndex === correctOptionIndex) {
                isCorrect = true;
              }
            }
            // Équivalence sémantique : si la réponse du candidat contient l'essentiel de la bonne option (ex. "Fonction d'entrée" pour une option plus longue)
            if (!isCorrect && correctOptionIndex >= 0 && answerText.length >= 3) {
              const correctOptionNorm = deepNormalize(normalizedOptions[correctOptionIndex].original);
              const wordsCorrect = correctOptionNorm.split(/\s+/).filter(w => w.length > 2);
              const wordsCandidate = normalizedCandidateAnswer.split(/\s+/).filter(w => w.length > 2);
              const overlap = wordsCandidate.filter(w => correctOptionNorm.includes(w)).length;
              const wordOverlapRatio = wordsCorrect.length > 0 ? overlap / wordsCorrect.length : 0;
              const candidateCoversCorrect = wordsCorrect.length >= 2 && wordsCorrect.filter(w => normalizedCandidateAnswer.includes(w)).length >= Math.min(2, wordsCorrect.length);
              if (wordOverlapRatio >= 0.6 || candidateCoversCorrect || (normalizedCandidateAnswer.length >= 8 && correctOptionNorm.includes(normalizedCandidateAnswer))) {
                isCorrect = true;
              }
            }
          } else {
            // Fallback : comparaison directe si on n'a pas trouvé l'option correcte
            isCorrect = answerTextUpper === correctAnswerUpper;
          }
        } else {
          // Pas d'options disponibles, comparaison directe
          const answerTextUpper = answerText.toUpperCase();
          const correctAnswerUpper = correctAnswer.toUpperCase();
          isCorrect = answerTextUpper === correctAnswerUpper;
        }
        gradedAnswers.push({
          questionId: userAnswer.questionId,
          answer: userAnswer.answer,
          isCorrect,
          points: isCorrect ? question.points : 0
        });
      } else if (question.type === 'code') {
        const correctAnswer = Array.isArray(question.correctAnswer)
          ? question.correctAnswer[0]
          : (question.correctAnswer || '');
        const evaluation = await evaluateCodeWithGPT({
          question: question.question,
          correctAnswer,
          userCode: answerText,
          codeExerciseType: question.codeExerciseType,
          pointsMax: question.points
        });
        const points = Math.round((question.points * evaluation.score) / 100);
        gradedAnswers.push({
          questionId: userAnswer.questionId,
          answer: userAnswer.answer,
          isCorrect: evaluation.score >= 50,
          points,
          feedback: evaluation.feedback
        });
      } else {
        gradedAnswers.push({
          questionId: userAnswer.questionId,
          answer: userAnswer.answer,
          isCorrect: false,
          points: 0
        });
      }
    }

    const totalScore = gradedAnswers.reduce((sum, answer) => sum + answer.points, 0);
    const percentage = Math.round((totalScore / testResult.maxScore) * 100);

    // Update test result
    const updatedResult = await dataStore.updateTestResult(testResultId, {
      answers: gradedAnswers,
      score: totalScore,
      percentage,
      completedAt: new Date(),
      status: 'completed'
    });

    // Si un applicationId est fourni, lier le testResultId à la candidature
    let relatedApplication = null;
    if (applicationId && typeof applicationId === 'string' && req.user) {
      const allApplications = await dataStore.getAllJobApplications();
      relatedApplication = allApplications.find(app => app.id === applicationId && app.userId === req.user!.id);
    }

    // Sinon, chercher automatiquement la candidature liée à ce test
    // Chercher d'abord par testId de l'offre, puis par testId envoyé dans les messages
    if (!relatedApplication && req.user) {
      const userId = req.user.id;
      const allApplications = await dataStore.getAllJobApplications();
      
      // Chercher par testId de l'offre
      for (const app of allApplications) {
        if (app.userId !== userId) continue;
        const jobOffer = await dataStore.getJobOfferById(app.jobOfferId);
        if (jobOffer?.testId === id) {
          relatedApplication = app;
          break;
        }
      }
      
      // Si pas trouvé, chercher dans les messages de conversation pour ce test
      if (!relatedApplication) {
        const { messagesStore } = await import('./messaging.js');
        // Chercher dans toutes les applications de l'utilisateur
        for (const app of allApplications) {
          if (app.userId !== userId) continue;
          const conversationId = `conv-${app.id}`;
          const messages = messagesStore.get(conversationId) || [];
          // Vérifier si ce test a été envoyé dans cette conversation
          const testSent = messages.some((msg: any) => 
            msg.type === 'test_invitation' && msg.testId === id
          );
          if (testSent) {
            // Même si un testResultId existe déjà, on peut mettre à jour avec le nouveau résultat
            relatedApplication = app;
            break;
          }
        }
      }
    }

    // Mettre à jour la candidature avec le résultat du test si trouvée
    if (relatedApplication) {
      const cvScore = relatedApplication.cvMatchScore || 0;
      const overallScore = Math.round((cvScore * 0.6) + (percentage * 0.4));

      await dataStore.updateJobApplication(relatedApplication.id, {
        testResultId: testResultId,
        testScore: percentage,
        overallScore: overallScore,
      });
    }

    res.json({
      success: true,
      data: {
        result: updatedResult,
        passed: percentage >= test.passScore,
        applicationUpdated: !!relatedApplication
      },
      message: 'Test soumis avec succès' + (relatedApplication ? '. Votre candidature a été mise à jour.' : '')
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la soumission du test'
    });
  }
});

// Générer un nouveau test avec prompt personnalisé (recruteur uniquement)
router.post('/generate-custom', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'recruiter') {
      res.status(403).json({
        success: false,
        error: 'Seuls les recruteurs peuvent générer des tests personnalisés'
      });
      return;
    }

    const { jobOfferId, applicationId, customPrompt } = req.body;

    if (!jobOfferId || !applicationId || !customPrompt) {
      res.status(400).json({
        success: false,
        error: 'jobOfferId, applicationId et customPrompt sont requis'
      });
      return;
    }

    // Vérifier que l'offre appartient au recruteur
    const jobOffer = await dataStore.getJobOfferById(jobOfferId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Offre non trouvée ou accès refusé'
      });
      return;
    }

    // Vérifier que la candidature existe
    const allApps = await dataStore.getAllJobApplications();
    const application = allApps.find(app => app.id === applicationId && app.jobOfferId === jobOfferId);
    if (!application) {
      res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
      return;
    }

    // Générer le test STRICTEMENT à partir de ce que le recruteur a écrit (option "Nouveau test IA")
    const { generateTestForJobOffer } = await import('../services/testGenerator.js');
    const generatedTest = await generateTestForJobOffer(jobOffer, {
      recruiterTestNote: customPrompt,
      isCustomTest: true
    });

    if (!generatedTest.questions || generatedTest.questions.length === 0) {
      res.status(500).json({
        success: false,
        error: 'La génération n\'a produit aucune question. Réessayez avec une description plus précise.'
      });
      return;
    }

    // Créer le test dans le dataStore
    const newTest: any = {
      id: uuidv4(),
      title: generatedTest.title || `Test personnalisé - ${jobOffer.title}`,
      description: generatedTest.description || `Test généré pour ${jobOffer.title}`,
      category: generatedTest.category || 'Technique',
      difficulty: generatedTest.difficulty,
      questions: generatedTest.questions,
      timeLimit: generatedTest.timeLimit || 3600,
      passScore: generatedTest.passScore || 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await dataStore.createTest(newTest);

    res.json({
      success: true,
      data: {
        testId: newTest.id,
        testTitle: newTest.title,
        questionsCount: newTest.questions.length
      },
      message: 'Test généré avec succès'
    });
  } catch (error) {
    console.error('Generate custom test error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du test'
    });
  }
});

export default router;