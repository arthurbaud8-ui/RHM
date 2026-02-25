import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { dataStore } from '../data/asyncStore.js';

const router = Router();

// Récupérer les applications selon le rôle de l'utilisateur
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    let allApplications: any[] = [];

    if (req.user.role === 'recruiter') {
      const jobOffers = await dataStore.getJobOffersByRecruiterId(req.user.id);
      const appArrays = await Promise.all(jobOffers.map(offer => dataStore.getApplicationsByJobId(offer.id)));
      allApplications = appArrays.flat();
    } else if (req.user.role === 'candidate') {
      // Pour les candidats : récupérer leurs propres candidatures
      allApplications = await dataStore.getApplicationsByUserId(req.user.id);
    } else {
      // Pour les admins : toutes les candidatures
      allApplications = await dataStore.getAllJobApplications();
    }

    // Enrichir avec les données du candidat et de l'offre
    // Pour les recruteurs : inclure les scores et calculer le rang par offre
    if (req.user.role === 'recruiter') {
      const jobOffers = await dataStore.getJobOffersByRecruiterId(req.user.id);
      const enrichedByOffer: any[] = [];

      for (const offer of jobOffers) {
        const offerApplications = await dataStore.getApplicationsByJobId(offer.id);
        const enriched = await Promise.all(offerApplications.map(async (app) => {
          const candidate = await dataStore.getUserById(app.userId);
          let testScore = 0;
          if (app.testResultId) {
            const testResult = await dataStore.getTestResultById(app.testResultId);
            if (testResult) testScore = testResult.percentage;
          }
          const cvScore = app.cvMatchScore || 0;
          const overallScore = Math.round((cvScore * 0.6) + (testScore * 0.4));
          return {
            id: app.id,
            candidate: candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat',
            role: offer.title,
            score: overallScore,
            stage: app.status === 'pending' ? 'Screening' : app.status === 'shortlisted' ? 'Entretien' : app.status === 'hired' ? 'Offre' : 'Rejeté',
            snapshotId: app.resumeUrl || undefined,
            createdAt: app.appliedAt,
            updatedAt: app.updatedAt,
            cvMatchScore: cvScore,
            testScore: testScore,
            overallScore: overallScore,
            jobOfferId: offer.id,
            cvNoteFromGpt: app.cvNoteFromGpt,
            recruiterNote: app.recruiterNote,
          };
        }));
        const sortedWithRank = enriched
          .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
          .map((app, index) => ({ ...app, rank: index + 1 }));
        enrichedByOffer.push(...sortedWithRank);
      }

      res.json({
        success: true,
        data: enrichedByOffer,
        message: 'Applications récupérées avec succès (classées par score)'
      });
      return;
    }

    // Pour les candidats : format simple sans scores
    const enrichedApplications = await Promise.all(allApplications.map(async (app) => {
      const candidate = await dataStore.getUserById(app.userId);
      const jobOffer = await dataStore.getJobOfferById(app.jobOfferId);
      return {
        id: app.id,
        jobOfferId: app.jobOfferId,
        candidate: candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat',
        role: jobOffer?.title || 'Offre',
        score: 0,
        stage: app.status === 'pending' ? 'Screening' : app.status === 'shortlisted' ? 'Entretien' : app.status === 'hired' ? 'Offre' : 'Rejeté',
        snapshotId: app.resumeUrl || undefined,
        appliedAt: app.appliedAt,
        createdAt: app.appliedAt,
        updatedAt: app.updatedAt
      };
    }));

    res.json({
      success: true,
      data: enrichedApplications,
      message: 'Applications récupérées avec succès'
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des applications'
    });
  }
});

export default router;
