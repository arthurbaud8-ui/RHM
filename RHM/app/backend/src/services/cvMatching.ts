import { JobOffer, User } from '../types/index.js';

/**
 * Calcule le score de matching entre un CV et une offre d'emploi
 * @param candidate Le candidat avec son profil
 * @param jobOffer L'offre d'emploi
 * @returns Score de matching (0-100)
 */
export function calculateCvMatchScore(candidate: User, jobOffer: JobOffer): number {
  if (!candidate.profile) {
    return 0;
  }

  let score = 0;
  let maxScore = 0;

  // 1. Matching des compétences (40 points)
  maxScore += 40;
  if (candidate.profile.skills && candidate.profile.skills.length > 0) {
    const candidateSkills = candidate.profile.skills.map(s => s.toLowerCase());
    const offerSkills = jobOffer.skills.map(s => s.toLowerCase());
    
    const matchingSkills = offerSkills.filter(skill =>
      candidateSkills.some(candidateSkill =>
        candidateSkill.includes(skill) || skill.includes(candidateSkill)
      )
    );
    
    score += (matchingSkills.length / offerSkills.length) * 40;
  }

  // 2. Matching du niveau d'expérience (30 points)
  maxScore += 30;
  const experienceLevels = ['Junior', 'Confirmé', 'Senior', 'Expert'];
  const offerLevelIndex = experienceLevels.indexOf(jobOffer.experience);
  
  // Si le candidat a des années d'expérience dans son profil
  const candidateYears = candidate.profile.cvAnalysis?.yearsOfExperience || 0;
  let candidateLevelIndex = 0;
  if (candidateYears >= 5) candidateLevelIndex = 3; // Expert
  else if (candidateYears >= 3) candidateLevelIndex = 2; // Senior
  else if (candidateYears >= 1) candidateLevelIndex = 1; // Confirmé
  
  // Score basé sur la proximité du niveau
  const levelDiff = Math.abs(offerLevelIndex - candidateLevelIndex);
  if (levelDiff === 0) score += 30;
  else if (levelDiff === 1) score += 20;
  else if (levelDiff === 2) score += 10;
  // else 0

  // 3. Matching de la localisation (15 points)
  maxScore += 15;
  if (candidate.profile.preferredLocation) {
    const candidateLocation = candidate.profile.preferredLocation.toLowerCase();
    const offerLocation = jobOffer.location.toLowerCase();
    
    if (candidateLocation.includes('remote') || offerLocation.includes('remote')) {
      score += 15; // Remote-friendly
    } else if (candidateLocation.includes(offerLocation) || offerLocation.includes(candidateLocation)) {
      score += 15;
    } else {
      // Vérifier si c'est la même ville/région
      const candidateCity = candidateLocation.split(',')[0].trim();
      const offerCity = offerLocation.split(',')[0].trim();
      if (candidateCity === offerCity) {
        score += 15;
      }
    }
  }

  // 4. Matching du type de contrat (15 points)
  maxScore += 15;
  if (candidate.profile.jobPreferences && candidate.profile.jobPreferences.length > 0) {
    const preferences = candidate.profile.jobPreferences.map(p => p.toLowerCase());
    const offerContract = jobOffer.contractType.toLowerCase();
    
    if (preferences.includes(offerContract)) {
      score += 15;
    }
  } else {
    // Si pas de préférence, donner un score moyen
    score += 7;
  }

  // Normaliser le score sur 100
  const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  
  return Math.min(100, Math.max(0, normalizedScore));
}
