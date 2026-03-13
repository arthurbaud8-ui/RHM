import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { dataStore } from '../data/asyncStore.js';
import { analyzeCvWithChatGPT } from '../services/cvAnalysis.js';
import { calculateCvMatchScore } from '../services/cvMatching.js'; // ⭐ Import du modèle local

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'));
  }
};

const imageOnlyFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Seules les images (JPEG, PNG, GIF, WebP) sont autorisées pour la photo de profil'));
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760')
  },
  fileFilter: fileFilter
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageOnlyFilter
});

// ⭐ NOUVELLE FONCTION: Recalculer les scores après CV update
async function recalculateApplicationScores(userId: string, updatedProfile: any) {
  try {
    console.log(`[CV RECALC] Starting recalculation for user: ${userId}`);
    
    const userApplications = await dataStore.getJobApplicationsByUserId(userId);
    console.log(`[CV RECALC] Found ${userApplications.length} applications to update`);
    
    let recalculatedCount = 0;
    let errorCount = 0;
    
    for (const app of userApplications) {
      try {
        // Récupérer l'offre d'emploi
        const offer = await dataStore.getJobOfferById(app.jobOfferId);
        if (!offer) {
          console.warn(`[CV RECALC] Offer not found for app ${app.id}`);
          continue;
        }
        
        // Créer objet candidat avec profil mis à jour
        const candidateWithUpdatedProfile = {
          id: userId,
          profile: updatedProfile
        };
        
        // Recalculer le score avec le modèle local
        const newScore = calculateCvMatchScore(candidateWithUpdatedProfile, offer);
        
        // Mettre à jour la candidature
        await dataStore.updateJobApplication(app.id, {
          cvMatchScore: newScore,
          lastScoreRecalcAt: new Date().toISOString()
        });
        
        console.log(`[CV RECALC] App ${app.id} updated: score=${newScore}`);
        recalculatedCount++;
        
      } catch (err) {
        console.error(`[CV RECALC] Error recalculating app ${app.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`[CV RECALC] Completed: ${recalculatedCount} updated, ${errorCount} errors`);
    return { recalculatedCount, errorCount, totalApps: userApplications.length };
    
  } catch (err) {
    console.error('[CV RECALC] Fatal error:', err);
    throw err;
  }
}

// Upload CV/documents
router.post('/cv', authenticateToken, upload.single('cv'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
      return;
    }

    const filePath = `/uploads/${req.file.filename}`;

    // Analyser le CV avec ChatGPT
    let cvAnalysis = null;
    try {
      cvAnalysis = await analyzeCvWithChatGPT(filePath);
      
      // Mettre à jour le profil utilisateur avec le CV et les données analysées
      const existing = req.user.profile ?? { skills: [], experience: '', education: '', testResults: [] };
      const updatedProfile = {
        ...existing,
        skills: cvAnalysis.skills,
        experience: cvAnalysis.experience,
        education: cvAnalysis.education,
        cv: filePath,
        cvAnalysis: cvAnalysis,
        testResults: existing.testResults ?? [],
      };
      await dataStore.updateUser(req.user.id, { profile: updatedProfile });

      // ⭐ Recalculer les scores des candidatures existantes
      try {
        await recalculateApplicationScores(req.user.id, updatedProfile);
      } catch (err) {
        console.error('[CV UPLOAD] Recalculation failed:', err);
      }

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: filePath,
          size: req.file.size,
          analysis: cvAnalysis
        },
        message: 'CV uploadé et analysé avec succès'
      });
    } catch (analysisError: any) {
      // Si l'analyse échoue, on sauvegarde quand même le CV
      console.error('Erreur lors de l\'analyse du CV:', analysisError);

      const existing = req.user.profile ?? { skills: [], experience: '', education: '', testResults: [] };
      const updatedProfile = {
        ...existing,
        cv: filePath,
        skills: existing.skills ?? [],
        experience: existing.experience ?? '',
        education: existing.education ?? '',
        testResults: existing.testResults ?? [],
      };
      await dataStore.updateUser(req.user.id, { profile: updatedProfile });

      // ⭐ Recalculer les scores des candidatures existantes
      try {
        await recalculateApplicationScores(req.user.id, updatedProfile);
      } catch (err) {
        console.error('[CV UPLOAD] Recalculation failed:', err);
      }

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: filePath,
          size: req.file.size,
          analysis: null,
          analysisError: 'L\'analyse automatique a échoué, mais le CV a été sauvegardé'
        },
        message: 'CV uploadé avec succès (analyse non disponible)'
      });
    }
  } catch (error) {
    console.error('Upload CV error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du CV'
    });
  }
});

// Analyser un CV déjà uploadé
router.post('/cv/analyze', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const user = await dataStore.getUserById(req.user.id);
    if (!user || !user.profile?.cv) {
      res.status(404).json({
        success: false,
        error: 'Aucun CV trouvé pour cet utilisateur'
      });
      return;
    }

    // Analyser le CV avec ChatGPT
    const cvAnalysis = await analyzeCvWithChatGPT(user.profile.cv);

    // Mettre à jour le profil avec les données analysées
    const existingProfile = user.profile ?? { skills: [], experience: '', education: '', testResults: [] };
    const updatedProfile = {
      ...existingProfile,
      skills: cvAnalysis.skills,
      experience: cvAnalysis.experience,
      education: cvAnalysis.education,
      cvAnalysis: cvAnalysis,
      testResults: existingProfile.testResults ?? [],
    };
    await dataStore.updateUser(req.user.id, { profile: updatedProfile });

    // ⭐ Recalculer les scores des candidatures existantes
    try {
      await recalculateApplicationScores(req.user.id, updatedProfile);
    } catch (err) {
      console.error('[CV ANALYZE] Recalculation failed:', err);
    }

    res.json({
      success: true,
      data: {
        analysis: cvAnalysis,
        profile: updatedProfile
      },
      message: 'CV analysé avec succès'
    });
  } catch (error: any) {
    console.error('Analyze CV error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'analyse du CV'
    });
  }
});

// Upload photo de profil (recruteur ou candidat)
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Utilisateur non authentifié' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
      return;
    }
    const avatarPath = `/uploads/${req.file.filename}`;
    const updatedUser = await dataStore.updateUser(req.user.id, { avatarUrl: avatarPath });
    const { password, ...userWithoutPassword } = updatedUser!;
    res.json({
      success: true,
      data: { avatarUrl: avatarPath, user: userWithoutPassword },
      message: 'Photo de profil mise à jour'
    });
  } catch (error: any) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload de la photo'
    });
  }
});

// Upload application documents
router.post('/application', authenticateToken, upload.array('documents', 5), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
      return;
    }

    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size
    }));

    res.json({
      success: true,
      data: {
        files: uploadedFiles,
        message: req.body.message || ''
      },
      message: 'Documents uploadés avec succès'
    });
  } catch (error) {
    console.error('Upload application error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload des documents'
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: Request, res: Response, next: any): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'Fichier trop volumineux (max 10MB)'
      });
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: 'Trop de fichiers (max 5)'
      });
      return;
    }
  }
  
  res.status(400).json({
    success: false,
    error: error.message || 'Erreur lors de l\'upload'
  });
});

export default router;