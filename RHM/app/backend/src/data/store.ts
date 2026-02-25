import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User, Opportunity, Test, TestResult, JobOffer, JobApplication, ApplicationHistoryEntry, Notification } from '../types/index.js';

const SEED_PASSWORD = 'password123';

/** Reviver pour récupérer les dates depuis le JSON */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
}

export class DataStore {
  private users: Map<string, User> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();
  private tests: Map<string, Test> = new Map();
  private testResults: Map<string, TestResult> = new Map();
  private jobOffers: Map<string, JobOffer> = new Map();
  private jobApplications: Map<string, JobApplication> = new Map();
  private applicationHistory: Map<string, ApplicationHistoryEntry[]> = new Map(); // applicationId -> history[]
  private notifications: Map<string, Notification> = new Map(); // notificationId -> notification
  private dataFile: string | null = process.env.DATA_FILE || null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 500;

  constructor() {
    if (this.dataFile && this.loadFromFile()) {
      return;
    }
    this.initializeDefaultData();
  }

  private loadFromFile(): boolean {
    try {
      const fullPath = path.resolve(this.dataFile!);
      if (!fs.existsSync(fullPath)) return false;
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(raw, dateReviver) as {
        users: User[];
        opportunities: Opportunity[];
        tests: Test[];
        testResults: TestResult[];
        jobOffers: JobOffer[];
        jobApplications: JobApplication[];
        notifications?: Notification[];
      };
      if (data.users) data.users.forEach(u => this.users.set(u.id, u));
      if (data.opportunities) data.opportunities.forEach(o => this.opportunities.set(o.id, o));
      if (data.tests) data.tests.forEach(t => this.tests.set(t.id, t));
      if (data.testResults) data.testResults.forEach(r => this.testResults.set(r.id, r));
      if (data.jobOffers) data.jobOffers.forEach(o => this.jobOffers.set(o.id, o));
      if (data.jobApplications) data.jobApplications.forEach(a => this.jobApplications.set(a.id, a));
      if (data.notifications) data.notifications.forEach(n => this.notifications.set(n.id, n));
      return true;
    } catch {
      return false;
    }
  }

  private persist(): void {
    if (!this.dataFile) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const dir = path.dirname(path.resolve(this.dataFile!));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const data = {
          users: Array.from(this.users.values()),
          opportunities: Array.from(this.opportunities.values()),
          tests: Array.from(this.tests.values()),
          testResults: Array.from(this.testResults.values()),
          jobOffers: Array.from(this.jobOffers.values()),
          jobApplications: Array.from(this.jobApplications.values()),
          notifications: Array.from(this.notifications.values()),
        };
        fs.writeFileSync(path.resolve(this.dataFile!), JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        console.error('RHM DataStore: failed to persist:', e);
      }
    }, this.SAVE_DEBOUNCE_MS);
  }

  // Users
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  createUser(user: User): User {
    this.users.set(user.id, user);
    this.persist();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      this.persist();
      return updatedUser;
    }
    return undefined;
  }

  deleteUser(id: string): boolean {
    const ok = this.users.delete(id);
    if (ok) this.persist();
    return ok;
  }

  // Opportunities
  getAllOpportunities(): Opportunity[] {
    return Array.from(this.opportunities.values());
  }

  getOpportunitiesByUserId(userId: string): Opportunity[] {
    return Array.from(this.opportunities.values()).filter(opp => opp.userId === userId);
  }

  getOpportunityById(id: string): Opportunity | undefined {
    return this.opportunities.get(id);
  }

  createOpportunity(opportunity: Opportunity): Opportunity {
    this.opportunities.set(opportunity.id, opportunity);
    this.persist();
    return opportunity;
  }

  updateOpportunity(id: string, updates: Partial<Opportunity>): Opportunity | undefined {
    const opportunity = this.opportunities.get(id);
    if (opportunity) {
      const updatedOpportunity = { ...opportunity, ...updates };
      this.opportunities.set(id, updatedOpportunity);
      this.persist();
      return updatedOpportunity;
    }
    return undefined;
  }

  deleteOpportunity(id: string): boolean {
    const ok = this.opportunities.delete(id);
    if (ok) this.persist();
    return ok;
  }

  // Tests
  getAllTests(): Test[] {
    return Array.from(this.tests.values());
  }

  getTestById(id: string): Test | undefined {
    return this.tests.get(id);
  }

  getTestsByCategory(category: string): Test[] {
    return Array.from(this.tests.values()).filter(test => test.category === category);
  }

  createTest(test: Test): Test {
    this.tests.set(test.id, test);
    this.persist();
    return test;
  }

  updateTest(id: string, updates: Partial<Test>): Test | undefined {
    const test = this.tests.get(id);
    if (test) {
      const updatedTest = { ...test, ...updates, updatedAt: new Date() };
      this.tests.set(id, updatedTest);
      this.persist();
      return updatedTest;
    }
    return undefined;
  }

  deleteTest(id: string): boolean {
    const ok = this.tests.delete(id);
    if (ok) this.persist();
    return ok;
  }

  // Test Results
  getAllTestResults(): TestResult[] {
    return Array.from(this.testResults.values());
  }

  getTestResultsByUserId(userId: string): TestResult[] {
    return Array.from(this.testResults.values()).filter(result => result.userId === userId);
  }

  getTestResultById(id: string): TestResult | undefined {
    return this.testResults.get(id);
  }

  createTestResult(result: TestResult): TestResult {
    this.testResults.set(result.id, result);
    this.persist();
    return result;
  }

  updateTestResult(id: string, updates: Partial<TestResult>): TestResult | undefined {
    const result = this.testResults.get(id);
    if (result) {
      const updatedResult = { ...result, ...updates };
      this.testResults.set(id, updatedResult);
      this.persist();
      return updatedResult;
    }
    return undefined;
  }

  deleteTestResult(id: string): boolean {
    const ok = this.testResults.delete(id);
    if (ok) this.persist();
    return ok;
  }

  private initializeDefaultData(): void {
    const now = new Date();
    const hashedPassword = bcrypt.hashSync(SEED_PASSWORD, 12);

    // ——— Données de seed : utilisateurs ———
    const candidateId = 'seed-candidate-1';
    const recruiterId = 'seed-recruiter-1';

    const seedCandidate: User = {
      id: candidateId,
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'marie.dupont@example.com',
      password: hashedPassword,
      role: 'candidate',
      profile: { skills: [], experience: '', education: '', testResults: [] },
      createdAt: now,
      updatedAt: now,
    };
    const seedRecruiter: User = {
      id: recruiterId,
      nom: 'Martin',
      prenom: 'Jean',
      email: 'jean.martin@example.com',
      password: hashedPassword,
      role: 'recruiter',
      profile: { skills: [], experience: '', education: '', testResults: [] },
      recruiterProfile: { companyName: '', companySize: '', industry: '' },
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(seedCandidate.id, seedCandidate);
    this.users.set(seedRecruiter.id, seedRecruiter);

    // ——— Test par défaut ———
    const sampleTest: Test = {
      id: 'test-1',
      title: 'Test de Compétences JavaScript',
      description: 'Évaluez vos connaissances en JavaScript moderne',
      category: 'Développement Web',
      difficulty: 'medium',
      timeLimit: 30,
      passScore: 70,
      questions: [
        {
          id: 'q1',
          question: 'Quelle est la différence entre let et const en JavaScript?',
          type: 'multiple-choice',
          options: [
            'Aucune différence',
            'let permet la réassignation, const non',
            'const est plus rapide',
            'let est plus récent'
          ],
          correctAnswer: 'let permet la réassignation, const non',
          points: 10,
          explanation: 'const ne permet pas la réassignation de la variable, contrairement à let.'
        },
        {
          id: 'q2',
          question: 'Implémentez une fonction qui retourne la somme de deux nombres:',
          type: 'code',
          correctAnswer: 'function sum(a, b) { return a + b; }',
          points: 15,
          explanation: 'Une fonction simple qui additionne deux paramètres.'
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    this.tests.set(sampleTest.id, sampleTest);

    // ——— Offres publiées (recruteur) ———
    const offer1Id = 'seed-offer-1';
    const offer2Id = 'seed-offer-2';

    const seedOffer1: JobOffer = {
      id: offer1Id,
      title: 'Développeur Full-Stack',
      description: 'Poste en équipe produit, stack React/Node.',
      requirements: ['React', 'Node.js', 'TypeScript'],
      location: 'Paris / Remote',
      contractType: 'CDI',
      experience: 'Confirmé',
      skills: ['JavaScript', 'React', 'Node.js'],
      recruiterId,
      status: 'published',
      applications: [],
      testId: 'test-1',
      createdAt: now,
      updatedAt: now,
    };
    const seedOffer2: JobOffer = {
      id: offer2Id,
      title: 'Ingénieur DevOps',
      description: 'Mise en place CI/CD et infra cloud.',
      requirements: ['Docker', 'Kubernetes', 'AWS'],
      location: 'Lyon',
      contractType: 'CDI',
      experience: 'Senior',
      skills: ['Docker', 'Kubernetes', 'AWS'],
      recruiterId,
      status: 'published',
      applications: [],
      createdAt: now,
      updatedAt: now,
    };
    this.jobOffers.set(seedOffer1.id, seedOffer1);
    this.jobOffers.set(seedOffer2.id, seedOffer2);

    // ——— Candidature de test (Marie Dupont → offre 1) ———
    const appId = 'seed-application-1';
    const seedApplication: JobApplication = {
      id: appId,
      jobOfferId: offer1Id,
      userId: candidateId,
      coverLetter: 'Candidature de démonstration.',
      resumeUrl: '',
      status: 'pending',
      appliedAt: now,
      updatedAt: now,
      cvMatchScore: 72,
    };
    this.jobApplications.set(seedApplication.id, seedApplication);
  }

  // Job Offers
  getAllJobOffers(): JobOffer[] {
    return Array.from(this.jobOffers.values());
  }

  getJobOfferById(id: string): JobOffer | undefined {
    return this.jobOffers.get(id);
  }

  getJobOffersByRecruiterId(recruiterId: string): JobOffer[] {
    return Array.from(this.jobOffers.values()).filter(offer => offer.recruiterId === recruiterId);
  }

  createJobOffer(jobOffer: JobOffer): JobOffer {
    this.jobOffers.set(jobOffer.id, jobOffer);
    this.persist();
    return jobOffer;
  }

  updateJobOffer(id: string, updates: Partial<JobOffer>): JobOffer | undefined {
    const jobOffer = this.jobOffers.get(id);
    if (jobOffer) {
      const updatedJobOffer = { ...jobOffer, ...updates, updatedAt: new Date() };
      this.jobOffers.set(id, updatedJobOffer);
      this.persist();
      return updatedJobOffer;
    }
    return undefined;
  }

  deleteJobOffer(id: string): boolean {
    const ok = this.jobOffers.delete(id);
    if (ok) this.persist();
    return ok;
  }

  // Job Applications
  getAllJobApplications(): JobApplication[] {
    return Array.from(this.jobApplications.values());
  }

  getApplicationsByJobId(jobId: string): JobApplication[] {
    return Array.from(this.jobApplications.values()).filter(app => app.jobOfferId === jobId);
  }

  getApplicationsByUserId(userId: string): JobApplication[] {
    return Array.from(this.jobApplications.values()).filter(app => app.userId === userId);
  }

  createJobApplication(application: JobApplication): JobApplication {
    this.jobApplications.set(application.id, application);
    this.persist();
    return application;
  }

  updateJobApplication(id: string, updates: Partial<JobApplication>): JobApplication | undefined {
    const application = this.jobApplications.get(id);
    if (application) {
      const updatedApplication = { ...application, ...updates };
      this.jobApplications.set(id, updatedApplication);
      this.persist();
      return updatedApplication;
    }
    return undefined;
  }

  // Historique des applications
  addApplicationHistoryEntry(entry: ApplicationHistoryEntry): void {
    if (!this.applicationHistory.has(entry.applicationId)) {
      this.applicationHistory.set(entry.applicationId, []);
    }
    const history = this.applicationHistory.get(entry.applicationId)!;
    history.push(entry);
    // Garder seulement les 100 dernières entrées
    if (history.length > 100) {
      history.shift();
    }
  }

  getApplicationHistory(applicationId: string): ApplicationHistoryEntry[] {
    return this.applicationHistory.get(applicationId) || [];
  }

  // Notifications
  createNotification(notification: Notification): Notification {
    this.notifications.set(notification.id, notification);
    this.persist();
    return notification;
  }

  getNotificationsByUserId(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUnreadNotificationsCount(userId: string): number {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.read).length;
  }

  markNotificationAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.userId === userId) {
      notification.read = true;
      this.persist();
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(userId: string): number {
    let count = 0;
    this.notifications.forEach((notification) => {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        count++;
      }
    });
    if (count > 0) {
      this.persist();
    }
    return count;
  }

  deleteNotification(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.userId === userId) {
      this.notifications.delete(notificationId);
      this.persist();
      return true;
    }
    return false;
  }
}

// Singleton instance
export const dataStore = new DataStore();