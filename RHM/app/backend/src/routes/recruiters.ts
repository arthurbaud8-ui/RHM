import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { dataStore } from '../data/asyncStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { authenticateToken, AuthRequest, authorizeRoles } from '../middleware/auth.js';
import { messagesStore } from './messaging.js';
import { JobOffer, RecruiterStats, Test, ApplicationHistoryEntry } from '../types/index.js';
import { generateTestForJobOffer } from '../services/testGenerator.js';
import { sendMail, emailTemplates } from '../services/email.js';

const router = Router();

// Validation schema pour les offres d'emploi
const jobOfferSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(100),
  description: Joi.string().required().trim().min(10),
  requirements: Joi.array().items(Joi.string().trim()).min(1),
  location: Joi.string().required().trim(),
  salary: Joi.string().optional().allow(''),
  contractType: Joi.string().valid('CDI', 'CDD', 'Stage', 'Freelance').required(),
  experience: Joi.string().valid('Junior', 'Confirmé', 'Senior', 'Expert').required(),
  skills: Joi.array().items(Joi.string().trim()).min(1),
  benefits: Joi.array().items(Joi.string().trim()).optional(),
  /** Note du recruteur : ce qu'il souhaite tester en priorité chez le candidat (utilisée pour générer le test) */
  testInstructions: Joi.string().optional().allow(''),
});

// Dashboard recruteur - Statistiques (accessible aussi aux autres rôles avec données limitées)
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const userId = req.user.id;
    
    // Si l'utilisateur est recruteur, récupérer ses données
    if (req.user.role === 'recruiter') {
      // Récupérer les offres du recruteur
      const jobOffers = await dataStore.getJobOffersByRecruiterId(userId);
      const activeOffers = jobOffers.filter((offer: { status: string }) => offer.status === 'published');
      // Récupérer toutes les candidatures pour les offres de ce recruteur
      const appsPerOffer = await Promise.all(jobOffers.map((offer: { id: string }) => dataStore.getApplicationsByJobId(offer.id)));
      const allApplications = appsPerOffer.flat();
      const newApplications = allApplications.filter(app =>
        app.status === 'pending' &&
        new Date().getTime() - new Date(app.appliedAt).getTime() < 7 * 24 * 60 * 60 * 1000 // 7 jours
      );

      const shortlistedApplications = allApplications.filter(app => app.status === 'shortlisted');
      const hiredApplications = allApplications.filter(app => app.status === 'hired');

      // Calculer les compétences les plus demandées
      const skillsCount: { [key: string]: number } = {};
      jobOffers.forEach(offer => {
        offer.skills.forEach(skill => {
          skillsCount[skill] = (skillsCount[skill] || 0) + 1;
        });
      });

      const topSkills = Object.entries(skillsCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([skill]) => skill);

      const stats: RecruiterStats = {
        totalJobOffers: jobOffers.length,
        activeJobOffers: activeOffers.length,
        totalApplications: allApplications.length,
        newApplications: newApplications.length,
        shortlistedCandidates: shortlistedApplications.length,
        hiredCandidates: hiredApplications.length,
        averageTimeToHire: 15, // Placeholder
        topSkillsRequested: topSkills
      };

      res.json({
        success: true,
        data: {
          stats,
          recentOffers: jobOffers.slice(0, 5),
          recentApplications: allApplications.slice(0, 10)
        },
        message: 'Dashboard recruteur récupéré avec succès'
      });
    } else {
      // Pour les autres rôles, retourner des statistiques vides
      const stats: RecruiterStats = {
        totalJobOffers: 0,
        activeJobOffers: 0,
        totalApplications: 0,
        newApplications: 0,
        shortlistedCandidates: 0,
        hiredCandidates: 0,
        averageTimeToHire: 0,
        topSkillsRequested: []
      };

      res.json({
        success: true,
        data: {
          stats,
          recentOffers: [],
          recentApplications: []
        },
        message: 'Dashboard récupéré avec succès'
      });
    }
  } catch (error) {
    console.error('Get recruiter dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du dashboard'
    });
  }
});

// Récupérer toutes les offres du recruteur
router.get('/job-offers', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const jobOffers = await dataStore.getJobOffersByRecruiterId(req.user.id);
    const offersWithCount = await Promise.all(jobOffers.map(async (offer) => ({
      ...offer,
      applicationsCount: (await dataStore.getApplicationsByJobId(offer.id)).length
    })));

    res.json({
      success: true,
      data: offersWithCount,
      message: 'Offres d\'emploi récupérées avec succès'
    });
  } catch (error) {
    console.error('Get job offers error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des offres'
    });
  }
});

// Créer une nouvelle offre d'emploi
router.post('/job-offers', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { error, value } = jobOfferSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    const jobOffer: JobOffer = {
      id: uuidv4(),
      recruiterId: req.user.id,
      ...value,
      status: 'draft',
      applications: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Générer automatiquement un test technique pour cette offre (nécessite OPENAI_API_KEY)
    const recruiterTestNote = (value as any).testInstructions?.trim() || undefined;
    let testGenerated = false;
    try {
      const generatedTest = await generateTestForJobOffer(jobOffer, { recruiterTestNote });
      
      // Valider que le test a bien été généré avec des questions
      if (!generatedTest.questions || generatedTest.questions.length === 0) {
        console.error('Test généré sans questions');
        throw new Error('Test généré sans questions');
      }
      
      // Logger le nombre de questions générées pour debug
      console.log(`✅ Test généré avec ${generatedTest.questions.length} question(s) pour l'offre "${jobOffer.title}"`);
      
      const test: Test = {
        id: uuidv4(),
        title: generatedTest.title,
        description: generatedTest.description,
        category: generatedTest.category,
        difficulty: generatedTest.difficulty,
        questions: generatedTest.questions,
        timeLimit: generatedTest.timeLimit,
        passScore: generatedTest.passScore,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdTest = await dataStore.createTest(test);
      jobOffer.testId = createdTest.id;
      testGenerated = true;
    } catch (error: any) {
      console.error('Erreur lors de la génération du test:', error);
      console.error('Message:', error.message);
      // La fonction generateTestForJobOffer retourne maintenant toujours un test (même en cas d'erreur)
      // Donc on devrait toujours avoir un test, mais on log quand même l'erreur
      // Offre créée avec test par défaut si erreur
    }

    const createdOffer = await dataStore.createJobOffer(jobOffer);

    res.status(201).json({
      success: true,
      data: createdOffer,
      message: testGenerated
        ? 'Offre d\'emploi créée avec succès (test technique généré)'
        : 'Offre d\'emploi créée avec succès (test non généré : configurer OPENAI_API_KEY pour la génération automatique)',
      testGenerated
    });
  } catch (error) {
    console.error('Create job offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'offre'
    });
  }
});

// Mettre à jour une offre complète
router.put('/job-offers/:id', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const jobOffer = await dataStore.getJobOfferById(id);
    
    if (!jobOffer) {
      res.status(404).json({
        success: false,
        error: 'Offre non trouvée'
      });
      return;
    }

    if (jobOffer.recruiterId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
      return;
    }

    // Validation des données (tous les champs sont optionnels pour une mise à jour)
    const updateSchema = Joi.object({
      title: Joi.string().trim().min(3).max(100).optional(),
      description: Joi.string().trim().min(10).optional(),
      requirements: Joi.array().items(Joi.string().trim()).min(1).optional(),
      location: Joi.string().trim().optional(),
      salary: Joi.string().optional().allow(''),
      contractType: Joi.string().valid('CDI', 'CDD', 'Stage', 'Freelance').optional(),
      experience: Joi.string().valid('Junior', 'Confirmé', 'Senior', 'Expert').optional(),
      skills: Joi.array().items(Joi.string().trim()).min(1).optional(),
      benefits: Joi.array().items(Joi.string().trim()).optional(),
      testInstructions: Joi.string().optional().allow(''),
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    // Mettre à jour l'offre avec les nouvelles valeurs
    const updatedOffer = await dataStore.updateJobOffer(id, {
      ...value,
      updatedAt: new Date()
    });

    if (!updatedOffer) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'offre'
      });
      return;
    }

    res.json({
      success: true,
      data: updatedOffer,
      message: 'Offre mise à jour avec succès'
    });
  } catch (error) {
    console.error('Update job offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'offre'
    });
  }
});

// Publier/dépublier une offre
router.patch('/job-offers/:id/status', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'paused', 'closed', 'filled'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Statut invalide'
      });
      return;
    }

    const jobOffer = await dataStore.getJobOfferById(id);
    if (!jobOffer) {
      res.status(404).json({
        success: false,
        error: 'Offre non trouvée'
      });
      return;
    }

    if (jobOffer.recruiterId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
      return;
    }

    const updatedOffer = await dataStore.updateJobOffer(id, { status });

    res.json({
      success: true,
      data: updatedOffer,
      message: `Offre ${status === 'published' ? 'publiée' : status === 'paused' ? 'mise en pause' : status === 'closed' ? 'fermée' : status === 'filled' ? 'marquée comme pourvue' : 'sauvegardée'} avec succès`
    });
  } catch (error) {
    console.error('Update job offer status error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// Récupérer les candidatures pour une offre
router.get('/job-offers/:id/applications', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { id } = req.params;

    const jobOffer = await dataStore.getJobOfferById(id);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(404).json({
        success: false,
        error: 'Offre non trouvée'
      });
      return;
    }

    const applications = await dataStore.getApplicationsByJobId(id);

    // Enrichir avec les données utilisateur et calculer les scores
    const enrichedApplications = await Promise.all(applications.map(async (app) => {
      const candidate = await dataStore.getUserById(app.userId);
      
      // Récupérer le résultat du test si disponible
      let testScore = 0;
      if (app.testResultId) {
        const testResult = await dataStore.getTestResultById(app.testResultId);
        if (testResult) {
          testScore = testResult.percentage;
        }
      }

      // Calculer le score global (CV matching 60% + Test 40%)
      const cvScore = app.cvMatchScore || 0;
      const overallScore = Math.round((cvScore * 0.6) + (testScore * 0.4));

      return {
        ...app,
        jobTitle: jobOffer.title,
        candidate: candidate ? {
          nom: candidate.nom,
          prenom: candidate.prenom,
          email: candidate.email,
          profile: candidate.profile
        } : null,
        cvMatchScore: cvScore,
        testScore: testScore,
        overallScore: overallScore,
      };
    }));

    // Trier par score global décroissant (meilleurs candidats en premier)
    enrichedApplications.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

    // Ajouter le rang
    enrichedApplications.forEach((app, index) => {
      (app as any).rank = index + 1;
    });

    res.json({
      success: true,
      data: enrichedApplications,
      message: 'Candidatures récupérées avec succès (classées par score)'
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidatures'
    });
  }
});

// Détail d'une candidature (avec note GPT, note recruteur, détail du test)
router.get('/job-offers/:offerId/applications/:applicationId', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Utilisateur non authentifié' });
      return;
    }
    const { offerId, applicationId } = req.params;
    const jobOffer = await dataStore.getJobOfferById(offerId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(404).json({ success: false, error: 'Offre non trouvée' });
      return;
    }
    const applications = await dataStore.getApplicationsByJobId(offerId);
    const app = applications.find(a => a.id === applicationId);
    if (!app) {
      res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      return;
    }
    const candidate = await dataStore.getUserById(app.userId);
    let testScore = 0;
    let testResultDetail: any = null;
    if (app.testResultId) {
      const testResult = await dataStore.getTestResultById(app.testResultId);
      if (testResult) {
        testScore = testResult.percentage;
        const test = await dataStore.getTestById(testResult.testId);
        const questions = (test?.questions || []).map((q: any) => {
          const answer = testResult.answers.find((a: any) => a.questionId === q.id);
          return {
            questionId: q.id,
            questionText: q.question,
            type: q.type,
            candidateAnswer: answer?.answer ?? '',
            isCorrect: answer?.isCorrect ?? false,
            points: answer?.points ?? 0,
            maxPoints: q.points,
            correctAnswer: q.correctAnswer,
            explanation: answer?.feedback ?? q.explanation,
          };
        });
        testResultDetail = {
          testId: test?.id,
          testTitle: test?.title,
          score: testResult.score,
          maxScore: testResult.maxScore,
          percentage: testResult.percentage,
          completedAt: testResult.completedAt,
          questions,
        };
      }
    }
    
    // Vérifier aussi les tests personnalisés envoyés via messagerie (exclure celui déjà dans testResultDetail)
    const conversationId = `conv-${applicationId}`;
    const messages = messagesStore.get(conversationId) || [];
    const testInvitations = messages.filter((msg: any) => msg.type === 'test_invitation' && msg.testId);
    const customTestResults: any[] = [];
    
    const testResultDetailTestId = testResultDetail?.testId ?? null;
    for (const msg of testInvitations) {
      if (!msg.testId) continue;
      // Ne pas ajouter si ce test est déjà affiché dans testResultDetail (évite le doublon)
      if (testResultDetailTestId && msg.testId === testResultDetailTestId) continue;
      
      const allTestResults = await dataStore.getAllTestResults();
      const userTestResults = allTestResults.filter(tr => tr.userId === app.userId && tr.testId === msg.testId);
      
      if (userTestResults.length > 0) {
        const latestResult = userTestResults.sort((a, b) => 
          (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
        )[0];
        
        const test = await dataStore.getTestById(msg.testId);
        if (test && latestResult.status === 'completed') {
          const questions = (test.questions || []).map((q: any) => {
            const answer = latestResult.answers.find((a: any) => a.questionId === q.id);
            return {
              questionId: q.id,
              questionText: q.question,
              type: q.type,
              candidateAnswer: answer?.answer ?? '',
              isCorrect: answer?.isCorrect ?? false,
              points: answer?.points ?? 0,
              maxPoints: q.points,
              correctAnswer: q.correctAnswer,
              explanation: answer?.feedback ?? q.explanation,
            };
          });
          
          customTestResults.push({
            testId: msg.testId,
            testTitle: msg.testTitle || test.title,
            score: latestResult.score,
            maxScore: latestResult.maxScore,
            percentage: latestResult.percentage,
            completedAt: latestResult.completedAt,
            questions,
          });
        }
      }
    }
    const cvScore = app.cvMatchScore || 0;
    const overallScore = Math.round((cvScore * 0.6) + (testScore * 0.4));
    
    // Vérifier si un rendez-vous a déjà été proposé
    const hasMeetingProposed = messages.some((msg: any) => msg.type === 'meeting_invitation');
    
    res.json({
      success: true,
      data: {
        ...app,
        candidate: candidate ? {
          nom: candidate.nom,
          prenom: candidate.prenom,
          email: candidate.email,
          avatarUrl: candidate.avatarUrl,
          profile: candidate.profile ? {
            linkedInUrl: candidate.profile.linkedInUrl,
            skills: candidate.profile.skills,
            experience: candidate.profile.experience,
            education: candidate.profile.education,
            preferredLocation: candidate.profile.preferredLocation,
            jobPreferences: candidate.profile.jobPreferences,
            cvAnalysis: candidate.profile.cvAnalysis ? {
              skills: candidate.profile.cvAnalysis.skills,
              experience: candidate.profile.cvAnalysis.experience,
              education: candidate.profile.cvAnalysis.education,
              yearsOfExperience: candidate.profile.cvAnalysis.yearsOfExperience,
              languages: candidate.profile.cvAnalysis.languages,
              summary: candidate.profile.cvAnalysis.summary,
            } : undefined,
          } : undefined,
        } : null,
        cvMatchScore: cvScore,
        testScore: testScore,
        overallScore: overallScore,
        cvNoteFromGpt: app.cvNoteFromGpt,
        recruiterNote: app.recruiterNote,
        testResultDetail,
        customTestResults: customTestResults.length > 0 ? customTestResults : undefined,
        hasMeetingProposed,
      },
    });
  } catch (error) {
    console.error('Get application detail error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du détail' });
  }
});

// Accès au CV d'un candidat (recruteur uniquement)
router.get('/job-offers/:offerId/applications/:applicationId/cv', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Utilisateur non authentifié' });
      return;
    }
    const { offerId, applicationId } = req.params;
    const jobOffer = await dataStore.getJobOfferById(offerId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(404).json({ success: false, error: 'Offre non trouvée' });
      return;
    }
    const applications = await dataStore.getApplicationsByJobId(offerId);
    const app = applications.find(a => a.id === applicationId);
    if (!app) {
      res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      return;
    }
    const resumeUrl = app.resumeUrl?.trim();
    if (!resumeUrl) {
      res.status(404).json({ success: false, error: 'Aucun CV disponible pour cette candidature' });
      return;
    }
    // Résoudre le chemin du fichier (resumeUrl = "/uploads/cv-xxx.pdf")
    const relativePath = resumeUrl.startsWith('/') ? resumeUrl.slice(1) : resumeUrl;
    const filePath = path.join(__dirname, '../../', relativePath);
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Fichier CV introuvable' });
      return;
    }
    const filename = path.basename(filePath);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Get application CV error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'accès au CV' });
  }
});

// Mettre à jour la note recruteur et/ou le statut d'une candidature
router.patch('/job-offers/:offerId/applications/:applicationId', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Utilisateur non authentifié' });
      return;
    }
    const { offerId, applicationId } = req.params;
    const { recruiterNote, status } = req.body;
    const jobOffer = await dataStore.getJobOfferById(offerId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(404).json({ success: false, error: 'Offre non trouvée' });
      return;
    }
    const applications = await dataStore.getApplicationsByJobId(offerId);
    const app = applications.find(a => a.id === applicationId);
    if (!app) {
      res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      return;
    }
    const allApps = await dataStore.getAllJobApplications();
    const oldApp = allApps.find(a => a.id === applicationId);
    const updates: { recruiterNote?: string; status?: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' } = {};
    if (recruiterNote !== undefined) updates.recruiterNote = String(recruiterNote);
    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
    if (typeof status === 'string' && validStatuses.includes(status)) updates.status = status as typeof app.status;
    const statusChanged = updates.status != null && oldApp && oldApp.status !== updates.status;
    await dataStore.updateJobApplication(applicationId, updates);

    // Historique : note et/ou changement de statut
    if (oldApp && req.user) {
      const entry: ApplicationHistoryEntry = {
        id: uuidv4(),
        applicationId,
        action: statusChanged ? 'status_changed' : 'note_added',
        performedBy: req.user.id,
        performedByRole: req.user.role as 'recruiter',
        details: statusChanged ? { oldStatus: oldApp.status, newStatus: updates.status } : { note: recruiterNote != null ? String(recruiterNote) : '' },
        createdAt: new Date()
      };
      await dataStore.addApplicationHistoryEntry(entry);
    }

    // Email au candidat en cas de changement de statut (shortlist, rejet, embauche, etc.)
    if (statusChanged && updates.status && updates.status !== 'pending' && updates.status !== 'reviewed') {
      (async () => {
        try {
          const candidate = await dataStore.getUserById(app.userId);
          const recruiter = await dataStore.getUserById(jobOffer.recruiterId);
          const companyName = recruiter?.recruiterProfile?.companyName;
          if (candidate) {
            await sendMail(
              candidate.email,
              `Mise à jour de votre candidature : ${jobOffer.title}`,
              emailTemplates.applicationStatusChange(candidate.prenom, jobOffer.title, updates.status as string, companyName)
            );
          }
        } catch (e) {
          console.error('Email changement statut candidature:', e);
        }
      })();
    }

    const apps = await dataStore.getApplicationsByJobId(offerId);
    const updated = apps.find((a: { id: string }) => a.id === applicationId);
    res.json({
      success: true,
      data: updated,
      message: statusChanged ? 'Statut et note mis à jour' : 'Note enregistrée',
    });
  } catch (error) {
    console.error('Update recruiter note error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'enregistrement de la note' });
  }
});

// Récupérer l'historique d'une candidature
router.get('/job-offers/:offerId/applications/:applicationId/history', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Utilisateur non authentifié' });
      return;
    }
    const { offerId, applicationId } = req.params;
    const jobOffer = await dataStore.getJobOfferById(offerId);
    if (!jobOffer || jobOffer.recruiterId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }
    const history = await dataStore.getApplicationHistory(applicationId);
    res.json({
      success: true,
      data: history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      message: 'Historique récupéré avec succès'
    });
  } catch (error) {
    console.error('Get application history error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'historique' });
  }
});

export default router;