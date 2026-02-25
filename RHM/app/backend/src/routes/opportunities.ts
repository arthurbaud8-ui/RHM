import { Router, Response } from 'express';
import { dataStore } from '../data/asyncStore.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get user opportunities
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const opportunities = await dataStore.getOpportunitiesByUserId(req.user.id);

    if (opportunities.length === 0) {
      const defaultOpportunities = [
        {
          id: uuidv4(),
          message: 'Vous êtes compatibles à plus de 80% à 6 de nos offres',
          action: 'Postuler',
          actionLabel: 'Postuler dès maintenant !',
          compatibilityScore: 85,
          companyName: 'Diverses entreprises',
          jobTitle: 'Postes correspondants',
          userId: req.user.id,
          status: 'active' as const,
          createdAt: new Date()
        },
        {
          id: uuidv4(),
          message: 'Un test de compétence est actuellement en cours',
          action: 'Reprendre',
          deadline: '12h41',
          compatibilityScore: 70,
          companyName: 'Test en cours',
          jobTitle: 'Évaluation JavaScript',
          userId: req.user.id,
          status: 'active' as const,
          createdAt: new Date()
        },
        {
          id: uuidv4(),
          message: 'Votre profil a atteint une compatibilité de 95% chez Airbus',
          action: 'Confirmer',
          meeting: '10 mars à 12H',
          compatibilityScore: 95,
          companyName: 'Airbus',
          jobTitle: 'Ingénieur Logiciel',
          userId: req.user.id,
          status: 'active' as const,
          createdAt: new Date()
        }
      ];

      // Create default opportunities
      await Promise.all(defaultOpportunities.map(opp => dataStore.createOpportunity(opp)));

      res.json({
        success: true,
        data: defaultOpportunities,
        message: 'Opportunités récupérées avec succès'
      });
      return;
    }

    res.json({
      success: true,
      data: opportunities,
      message: 'Opportunités récupérées avec succès'
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des opportunités'
    });
  }
});

// Update opportunity status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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

    const opportunity = await dataStore.getOpportunityById(id);
    if (!opportunity) {
      res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
      return;
    }

    // Check if user owns this opportunity
    if (opportunity.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
      return;
    }

    const updatedOpportunity = await dataStore.updateOpportunity(id, { status });

    res.json({
      success: true,
      data: updatedOpportunity,
      message: 'Statut de l\'opportunité mis à jour'
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'opportunité'
    });
  }
});

export default router;