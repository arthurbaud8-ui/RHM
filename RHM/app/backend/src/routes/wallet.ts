import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest, authorizeRoles } from '../middleware/auth.js';
import { dataStore } from '../data/asyncStore.js';

const router = Router();

// Interface pour les entrées du wallet
interface WalletEntry {
  id: string;
  type: 'credit' | 'debit';
  label: string;
  amount: number;
  provider: string;
  userId: string;
  createdAt: Date;
}

// Stockage temporaire du wallet (à remplacer par une vraie DB plus tard)
const walletStore = new Map<string, WalletEntry[]>();

// Initialiser le wallet pour un utilisateur
function getUserWallet(userId: string): WalletEntry[] {
  if (!walletStore.has(userId)) {
    walletStore.set(userId, []);
  }
  return walletStore.get(userId)!;
}

// Récupérer le ledger du wallet
router.get('/ledger', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const entries = getUserWallet(req.user.id);

    res.json({
      success: true,
      data: entries,
      message: 'Ledger récupéré avec succès'
    });
  } catch (error) {
    console.error('Get wallet ledger error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du ledger'
    });
  }
});

// Récupérer le solde du wallet
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const entries = getUserWallet(req.user.id);
    const balance = entries.reduce((sum, entry) => {
      return sum + (entry.type === 'credit' ? entry.amount : -entry.amount);
    }, 0);

    res.json({
      success: true,
      data: balance,
      message: 'Solde récupéré avec succès'
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du solde'
    });
  }
});

// Acheter des tokens
router.post('/purchase', authenticateToken, authorizeRoles('recruiter'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié'
      });
      return;
    }

    const { amount, provider } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Montant invalide'
      });
      return;
    }

    const entry: WalletEntry = {
      id: uuidv4(),
      type: 'credit',
      label: `Achat de ${amount} tokens via ${provider || 'RHM'}`,
      amount: amount,
      provider: provider || 'RHM',
      userId: req.user.id,
      createdAt: new Date()
    };

    const entries = getUserWallet(req.user.id);
    entries.push(entry);
    walletStore.set(req.user.id, entries);

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Tokens achetés avec succès'
    });
  } catch (error) {
    console.error('Purchase tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'achat de tokens'
    });
  }
});

export default router;
