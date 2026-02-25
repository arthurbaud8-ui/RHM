import { Router, Response } from 'express';
import { dataStore } from '../data/asyncStore.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { password, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profil récupéré avec succès'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const allowedUpdates = ['nom', 'prenom', 'profile', 'avatarUrl', 'recruiterProfile'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {} as any);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucune donnée valide à mettre à jour'
      });
      return;
    }

    const updatedUser = await dataStore.updateUser(req.user.id, updates);
    
    if (!updatedUser) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
      return;
    }

    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profil mis à jour avec succès'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Get user test results
router.get('/test-results', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const testResults = await dataStore.getTestResultsByUserId(req.user.id);

    res.json({
      success: true,
      data: testResults,
      message: 'Résultats des tests récupérés avec succès'
    });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des résultats'
    });
  }
});

export default router;