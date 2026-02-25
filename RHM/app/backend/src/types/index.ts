export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: 'candidate' | 'recruiter' | 'admin';
  profile?: UserProfile;
  /** Photo de profil (URL ou chemin vers fichier uploadé) */
  avatarUrl?: string;
  /** Profil recruteur (entreprise, etc.) - utilisé quand role === 'recruiter' */
  recruiterProfile?: RecruiterProfileData;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  skills: string[];
  experience: string;
  education: string;
  cv?: string;
  cvAnalysis?: {
    skills: string[];
    experience: string;
    education: string;
    yearsOfExperience?: number;
    languages?: string[];
    summary?: string;
    extractedData: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
  };
  testResults: TestResult[];
  preferredLocation?: string;
  jobPreferences?: string[];
  /** Lien LinkedIn visible par les recruteurs */
  linkedInUrl?: string;
}

/** Données de profil recruteur (sans liste d'offres, stockées sur User) */
export interface RecruiterProfileData {
  companyName?: string;
  companySize?: string;
  industry?: string;
  description?: string;
  website?: string;
  logo?: string;
}

export interface RecruiterProfile extends RecruiterProfileData {
  jobOffers: JobOffer[];
}

export interface JobOffer {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salary?: string;
  contractType: 'CDI' | 'CDD' | 'Stage' | 'Freelance';
  experience: 'Junior' | 'Confirmé' | 'Senior' | 'Expert';
  skills: string[];
  benefits?: string[];
  recruiterId: string;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'filled';
  applications: JobApplication[];
  testId?: string; // ID du test technique associé à l'offre
  createdAt: Date;
  updatedAt: Date;
}

export interface RecruiterStats {
  totalJobOffers: number;
  activeJobOffers: number;
  totalApplications: number;
  newApplications: number;
  shortlistedCandidates: number;
  hiredCandidates: number;
  averageTimeToHire: number;
  topSkillsRequested: string[];
}

export interface Opportunity {
  id: string;
  message: string;
  action: string;
  actionLabel?: string;
  deadline?: string;
  meeting?: string;
  compatibilityScore?: number;
  companyName?: string;
  jobTitle?: string;
  userId: string;
  status: 'active' | 'completed' | 'expired';
  createdAt: Date;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  timeLimit: number;
  passScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'code' | 'text' | 'practical';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
  /** Pour les questions de type "code" : écrire une fonction ou corriger du code */
  codeExerciseType?: 'write' | 'fix';
  /** Code initial bugué (pour codeExerciseType === 'fix') */
  initialCode?: string;
  /** Code de départ / squelette (pour codeExerciseType === 'write') */
  starterCode?: string;
}

export interface TestResult {
  id: string;
  testId: string;
  userId: string;
  answers: Answer[];
  score: number;
  maxScore: number;
  percentage: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'in-progress' | 'completed' | 'abandoned';
}

export interface Answer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  /** Feedback du correcteur IA (questions code) */
  feedback?: string;
}

export interface ApplicationHistoryEntry {
  id: string;
  applicationId: string;
  action: 'created' | 'status_changed' | 'note_added' | 'test_sent' | 'meeting_proposed' | 'cv_viewed';
  performedBy: string; // User ID
  performedByRole: 'recruiter' | 'candidate' | 'system';
  details?: {
    oldStatus?: string;
    newStatus?: string;
    note?: string;
    testId?: string;
    meetingDate?: string;
  };
  createdAt: Date;
}

export interface JobApplication {
  id: string;
  jobOfferId: string;
  userId: string;
  coverLetter: string;
  resumeUrl: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  appliedAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  feedback?: string;
  /** Note synthétique GPT : avantages/inconvénients du CV par rapport à l'offre */
  cvNoteFromGpt?: string;
  /** Note du recruteur sur le candidat */
  recruiterNote?: string;
  testResultId?: string; // ID du résultat du test technique
  cvMatchScore?: number; // Score de matching du CV (0-100)
  testScore?: number; // Score du test technique (0-100)
  overallScore?: number; // Score combiné CV + Test (0-100)
  history?: ApplicationHistoryEntry[]; // Historique des actions
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'meeting_invitation' | 'test_invitation' | 'application_status';
  title: string;
  message: string;
  conversationId?: string;
  applicationId?: string;
  testId?: string;
  meetingData?: {
    date: string;
    time: string;
    address: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  role?: 'candidate' | 'recruiter';
}