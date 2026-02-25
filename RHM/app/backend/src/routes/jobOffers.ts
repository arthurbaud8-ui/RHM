import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dataStore } from '../data/asyncStore.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { JobApplication, TestResult } from '../types/index.js';
import { calculateCvMatchScore } from '../services/cvMatching.js';
import { generateCvNoteForOffer } from '../services/cvNoteForOffer.js';
import { analyzeCvWithChatGPT } from '../services/cvAnalysis.js';
import { getOrGenerateCompanyLogo } from '../services/companyLogoGenerator.js';
import { sendMail, emailTemplates } from '../services/email.js';
import type { User } from '../types/index.js';

const router = Router();

// Récupérer toutes les offres publiées (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      location,
      contractType,
      experience,
      skills,
      search,
      page = '1',
      limit = '10'
    } = req.query;

    let offers = (await dataStore.getAllJobOffers())
      .filter((offer: { status: string }) => offer.status === 'published');

    // Filtrage par localisation
    if (location && typeof location === 'string') {
      offers = offers.filter((offer: { location: string }) =>
        offer.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filtrage par type de contrat
    if (contractType && typeof contractType === 'string') {
      offers = offers.filter((offer: { contractType: string }) => offer.contractType === contractType);
    }

    // Filtrage par niveau d'expérience
    if (experience && typeof experience === 'string') {
      offers = offers.filter((offer: { experience: string }) => offer.experience === experience);
    }

    // Filtrage par compétences
    if (skills && typeof skills === 'string') {
      const skillsArray = skills.split(',').map((s: string) => s.trim());
      offers = offers.filter((offer: { skills: string[] }) =>
        skillsArray.some((skill: string) =>
          offer.skills.some((offerSkill: string) =>
            offerSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Recherche textuelle
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      offers = offers.filter((offer: { title: string; description: string; skills: string[] }) =>
        offer.title.toLowerCase().includes(searchTerm) ||
        offer.description.toLowerCase().includes(searchTerm) ||
        offer.skills.some((skill: string) => skill.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedOffers = offers.slice(startIndex, endIndex);

    // Masquer les informations sensibles (ces offres sont toutes publiées)
    // Récupérer les logos des entreprises pour chaque offre
    const publicOffers = await Promise.all(paginatedOffers.map(async (offer) => {
      const recruiter = await dataStore.getUserById(offer.recruiterId);
      const companyName = recruiter?.recruiterProfile?.companyName;
      const existingLogo = recruiter?.recruiterProfile?.logo;
      const industry = recruiter?.recruiterProfile?.industry;
      
      // Générer le logo avec l'IA si nécessaire
      const companyLogo = await getOrGenerateCompanyLogo(
        companyName || 'Entreprise',
        existingLogo,
        industry
      );
      
      return {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        requirements: offer.requirements,
        location: offer.location,
        salary: offer.salary,
        contractType: offer.contractType,
        experience: offer.experience,
        skills: offer.skills,
        benefits: offer.benefits,
        createdAt: offer.createdAt,
        applicationsCount: (await dataStore.getApplicationsByJobId(offer.id)).length,
        status: offer.status,
        companyName,
        companyLogo
      };
    }));

    res.json({
      success: true,
      data: {
        offers: publicOffers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(offers.length / limitNum),
          totalOffers: offers.length,
          hasNext: endIndex < offers.length,
          hasPrev: pageNum > 1
        }
      },
      message: 'Offres récupérées avec succès'
    });
  } catch (error) {
    console.error('Get job offers error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des offres'
    });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const offer = await dataStore.getJobOfferById(id);
    if (!offer || offer.status !== 'published') {
      res.status(404).json({
        success: false,
        error: 'Offre non trouvée'
      });
      return;
    }

    // Récupérer les informations du recruteur pour le logo et le nom de l'entreprise
    const recruiter = await dataStore.getUserById(offer.recruiterId);
    const companyName = recruiter?.recruiterProfile?.companyName;
    const existingLogo = recruiter?.recruiterProfile?.logo;
    const industry = recruiter?.recruiterProfile?.industry;
    
    // Générer le logo avec l'IA si nécessaire
    const companyLogo = await getOrGenerateCompanyLogo(
      companyName || 'Entreprise',
      existingLogo,
      industry
    );

    // Masquer les informations sensibles
    const publicOffer = {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      requirements: offer.requirements,
      location: offer.location,
      salary: offer.salary,
      contractType: offer.contractType,
      experience: offer.experience,
      skills: offer.skills,
      benefits: offer.benefits,
      createdAt: offer.createdAt,
      applicationsCount: (await dataStore.getApplicationsByJobId(offer.id)).length,
      companyName,
      companyLogo
    };

    res.json({
      success: true,
      data: publicOffer,
      message: 'Offre récupérée avec succès'
    });
  } catch (error) {
    console.error('Get job offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'offre'
    });
  }
});

// Postuler à une offre (authentifié)
router.post('/:id/apply', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    if (req.user.role !== 'candidate') {
      res.status(403).json({
        success: false,
        error: 'Seuls les candidats peuvent postuler'
      });
      return;
    }

    const { id } = req.params;
    const { coverLetter, resumeUrl } = req.body;

    const offer = await dataStore.getJobOfferById(id);
    if (!offer || offer.status !== 'published') {
      res.status(404).json({
        success: false,
        error: 'Offre non trouvée ou non disponible'
      });
      return;
    }

    // Vérifier si l'utilisateur a déjà postulé
    const existingApplications = await dataStore.getApplicationsByJobId(id);
    const hasApplied = existingApplications.some(app => app.userId === req.user!.id);

    if (hasApplied) {
      res.status(400).json({
        success: false,
        error: 'Vous avez déjà postulé à cette offre'
      });
      return;
    }

    // Utiliser le CV fourni à la candidature (resumeUrl) pour le score et la note IA
    const candidate = await dataStore.getUserById(req.user.id);
    let cvMatchScore = 0;
    let candidateForScoring: User | null = candidate ?? null;

    if (resumeUrl && typeof resumeUrl === 'string') {
      // Analyser le CV joint à cette candidature (pas le profil)
      try {
        const filePath = resumeUrl.replace(/^\//, '');
        const cvAnalysis = await analyzeCvWithChatGPT(filePath);
        const syntheticProfile = {
          skills: cvAnalysis.skills,
          experience: cvAnalysis.experience,
          education: cvAnalysis.education,
          cvAnalysis,
          testResults: candidate?.profile?.testResults ?? [],
          preferredLocation: candidate?.profile?.preferredLocation,
          jobPreferences: candidate?.profile?.jobPreferences,
        };
        candidateForScoring = candidate
          ? { ...candidate, profile: syntheticProfile }
          : { id: req.user.id, nom: '', prenom: '', email: req.user.email || '', password: '', role: 'candidate', profile: syntheticProfile, createdAt: new Date(), updatedAt: new Date() } as User;
        if (candidateForScoring) cvMatchScore = calculateCvMatchScore(candidateForScoring, offer);
      } catch (err) {
        console.error('Analyse CV candidature:', err);
        if (candidate) cvMatchScore = calculateCvMatchScore(candidate, offer);
      }
    } else if (candidate) {
      cvMatchScore = calculateCvMatchScore(candidate, offer);
    }

    const application: JobApplication = {
      id: uuidv4(),
      jobOfferId: id,
      userId: req.user.id,
      coverLetter: coverLetter || '',
      resumeUrl: resumeUrl || '',
      status: 'pending',
      appliedAt: new Date(),
      updatedAt: new Date(),
      cvMatchScore,
    };

    const createdApplication = await dataStore.createJobApplication(application);

    // Emails transactionnels (non bloquants)
    (async () => {
      try {
        const candidate = await dataStore.getUserById(req.user!.id);
        const recruiter = await dataStore.getUserById(offer.recruiterId);
        const companyName = recruiter?.recruiterProfile?.companyName;
        if (candidate) {
          await sendMail(candidate.email, 'Candidature bien reçue', emailTemplates.applicationReceived(candidate.prenom, offer.title, companyName ?? ''));
        }
        if (recruiter) {
          const candidateName = `${candidate?.prenom ?? ''} ${candidate?.nom ?? ''}`.trim() || (candidate?.email ?? 'Un candidat');
          await sendMail(recruiter.email, `Nouvelle candidature pour "${offer.title}"`, emailTemplates.newApplicationToRecruiter(recruiter.prenom, offer.title, candidateName, createdApplication.id, id));
        }
      } catch (e) {
        console.error('Email candidature/recruteur:', e);
      }
    })();

    // Note IA sur le CV (celui fourni à la candidature si resumeUrl, sinon profil)
    if (candidateForScoring) {
      try {
        const cvNoteFromGpt = await generateCvNoteForOffer(candidateForScoring, offer);
        if (cvNoteFromGpt) {
          await dataStore.updateJobApplication(createdApplication.id, { cvNoteFromGpt });
        }
      } catch (err) {
        console.error('CV note GPT error:', err);
      }
    }

    const appsForOffer = await dataStore.getApplicationsByJobId(id);
    const updatedApp = appsForOffer.find((a: JobApplication) => a.id === createdApplication.id) ?? createdApplication;

    // Si l'offre a un test associé, informer le candidat qu'il doit le passer
    const responseData: any = {
      ...updatedApp,
      requiresTest: !!offer.testId,
      testId: offer.testId || null,
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: offer.testId 
        ? 'Candidature envoyée avec succès. Vous devez maintenant passer le test technique.'
        : 'Candidature envoyée avec succès'
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de la candidature'
    });
  }
});

// Récupérer les candidatures de l'utilisateur connecté
router.get('/my/applications', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const applications = await dataStore.getApplicationsByUserId(req.user.id);

    // Enrichir avec les données de l'offre
    const enrichedApplications = await Promise.all(applications.map(async (app: JobApplication) => {
      const jobOffer = await dataStore.getJobOfferById(app.jobOfferId);
      return {
        ...app,
        jobOffer: jobOffer ? {
          title: jobOffer.title,
          location: jobOffer.location,
          contractType: jobOffer.contractType,
          experience: jobOffer.experience,
          testId: jobOffer.testId // Inclure le testId pour permettre au candidat de passer le test
        } : null
      };
    }));

    res.json({
      success: true,
      data: enrichedApplications,
      message: 'Candidatures récupérées avec succès'
    });
  } catch (error) {
    console.error('Get user applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidatures'
    });
  }
});

export default router;