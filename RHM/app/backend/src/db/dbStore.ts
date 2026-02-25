/**
 * Store asynchrone basé sur PostgreSQL.
 * Utilise le client défini dans client.ts (DATABASE_URL).
 */
import { getPool } from './client.js';
import type {
  User,
  Opportunity,
  Test,
  TestResult,
  JobOffer,
  JobApplication,
  ApplicationHistoryEntry,
  Notification,
  Question,
} from '../types/index.js';

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    email: row.email as string,
    password: row.password_hash as string,
    role: row.role as User['role'],
    profile: (row.profile as User['profile']) ?? undefined,
    recruiterProfile: (row.recruiter_profile as User['recruiterProfile']) ?? undefined,
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function toOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id: row.id as string,
    message: row.message as string,
    action: row.action as string,
    actionLabel: row.action_label as string | undefined,
    deadline: row.deadline as string | undefined,
    meeting: row.meeting as string | undefined,
    compatibilityScore: row.compatibility_score as number | undefined,
    companyName: row.company_name as string | undefined,
    jobTitle: row.job_title as string | undefined,
    userId: row.user_id as string,
    status: row.status as Opportunity['status'],
    createdAt: new Date(row.created_at as string),
  };
}

function toTest(row: Record<string, unknown>): Test {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    difficulty: row.difficulty as Test['difficulty'],
    questions: (row.questions as Question[]) ?? [],
    timeLimit: (row.time_limit as number) ?? 3600,
    passScore: (row.pass_score as number) ?? 60,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function toTestResult(row: Record<string, unknown>): TestResult {
  return {
    id: row.id as string,
    testId: row.test_id as string,
    userId: row.user_id as string,
    answers: (row.answers as TestResult['answers']) ?? [],
    score: (row.score as number) ?? 0,
    maxScore: (row.max_score as number) ?? 0,
    percentage: (row.percentage as number) ?? 0,
    startedAt: new Date(row.started_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    status: row.status as TestResult['status'],
  };
}

function toJobOffer(row: Record<string, unknown>, applications: JobApplication[] = []): JobOffer {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    requirements: (row.requirements as string[]) ?? [],
    location: row.location as string,
    salary: row.salary as string | undefined,
    contractType: row.contract_type as JobOffer['contractType'],
    experience: row.experience as JobOffer['experience'],
    skills: (row.skills as string[]) ?? [],
    benefits: (row.benefits as string[]) ?? [],
    recruiterId: row.recruiter_id as string,
    status: row.status as JobOffer['status'],
    testId: row.test_id as string | undefined,
    applications,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function toJobApplication(row: Record<string, unknown>): JobApplication {
  return {
    id: row.id as string,
    jobOfferId: row.job_offer_id as string,
    userId: row.user_id as string,
    coverLetter: (row.cover_letter as string) ?? '',
    resumeUrl: (row.resume_url as string) ?? '',
    status: row.status as JobApplication['status'],
    appliedAt: new Date(row.applied_at as string),
    updatedAt: new Date(row.updated_at as string),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : undefined,
    feedback: row.feedback as string | undefined,
    cvNoteFromGpt: row.cv_note_from_gpt as string | undefined,
    recruiterNote: row.recruiter_note as string | undefined,
    testResultId: row.test_result_id as string | undefined,
    cvMatchScore: row.cv_match_score as number | undefined,
    testScore: row.test_score as number | undefined,
    overallScore: row.overall_score as number | undefined,
  };
}

function toApplicationHistoryEntry(row: Record<string, unknown>): ApplicationHistoryEntry {
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    action: row.action as ApplicationHistoryEntry['action'],
    performedBy: row.performed_by as string,
    performedByRole: row.performed_by_role as ApplicationHistoryEntry['performedByRole'],
    details: row.details as ApplicationHistoryEntry['details'],
    createdAt: new Date(row.created_at as string),
  };
}

function toNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    message: (row.message as string) ?? '',
    conversationId: row.conversation_id as string | undefined,
    applicationId: row.application_id as string | undefined,
    testId: row.test_id as string | undefined,
    meetingData: row.meeting_data as Notification['meetingData'],
    read: (row.read as boolean) ?? false,
    createdAt: new Date(row.created_at as string),
  };
}

const pool = () => getPool();

export const dbStore = {
  // Users
  async getAllUsers(): Promise<User[]> {
    const r = await pool().query('SELECT * FROM users ORDER BY created_at');
    return r.rows.map((row: Record<string, unknown>) => toUser(row));
  },
  async getUserById(id: string): Promise<User | undefined> {
    const r = await pool().query('SELECT * FROM users WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? toUser(row) : undefined;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const r = await pool().query('SELECT * FROM users WHERE email = $1', [email]);
    const row = r.rows[0];
    return row ? toUser(row) : undefined;
  },
  async createUser(user: User): Promise<User> {
    await pool().query(
      `INSERT INTO users (id, nom, prenom, email, password_hash, role, profile, recruiter_profile, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        user.id,
        user.nom,
        user.prenom,
        user.email,
        user.password,
        user.role,
        JSON.stringify(user.profile ?? {}),
        JSON.stringify(user.recruiterProfile ?? {}),
        user.avatarUrl ?? null,
        user.createdAt,
        user.updatedAt,
      ]
    );
    return user;
  },
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const u = await this.getUserById(id);
    if (!u) return undefined;
    const updated = { ...u, ...updates, updatedAt: new Date() };
    await pool().query(
      `UPDATE users SET nom=$2, prenom=$3, email=$4, password_hash=$5, role=$6, profile=$7, recruiter_profile=$8, avatar_url=$9, updated_at=$10 WHERE id=$1`,
      [
        id,
        updated.nom,
        updated.prenom,
        updated.email,
        updated.password,
        updated.role,
        JSON.stringify(updated.profile ?? {}),
        JSON.stringify(updated.recruiterProfile ?? {}),
        updated.avatarUrl ?? null,
        updated.updatedAt,
      ]
    );
    return updated;
  },
  async deleteUser(id: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM users WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  // Opportunities
  async getAllOpportunities(): Promise<Opportunity[]> {
    const r = await pool().query('SELECT * FROM opportunities ORDER BY created_at');
    return r.rows.map((row: Record<string, unknown>) => toOpportunity(row));
  },
  async getOpportunitiesByUserId(userId: string): Promise<Opportunity[]> {
    const r = await pool().query('SELECT * FROM opportunities WHERE user_id = $1 ORDER BY created_at', [userId]);
    return r.rows.map((row: Record<string, unknown>) => toOpportunity(row));
  },
  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    const r = await pool().query('SELECT * FROM opportunities WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? toOpportunity(row) : undefined;
  },
  async createOpportunity(opportunity: Opportunity): Promise<Opportunity> {
    await pool().query(
      `INSERT INTO opportunities (id, user_id, message, action, action_label, deadline, meeting, compatibility_score, company_name, job_title, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        opportunity.id,
        opportunity.userId,
        opportunity.message,
        opportunity.action,
        opportunity.actionLabel ?? null,
        opportunity.deadline ?? null,
        opportunity.meeting ?? null,
        opportunity.compatibilityScore ?? null,
        opportunity.companyName ?? null,
        opportunity.jobTitle ?? null,
        opportunity.status,
        opportunity.createdAt,
      ]
    );
    return opportunity;
  },
  async updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const o = await this.getOpportunityById(id);
    if (!o) return undefined;
    const updated = { ...o, ...updates };
    await pool().query(
      `UPDATE opportunities SET message=$2, action=$3, action_label=$4, deadline=$5, meeting=$6, compatibility_score=$7, company_name=$8, job_title=$9, status=$10 WHERE id=$1`,
      [
        id,
        updated.message,
        updated.action,
        updated.actionLabel ?? null,
        updated.deadline ?? null,
        updated.meeting ?? null,
        updated.compatibilityScore ?? null,
        updated.companyName ?? null,
        updated.jobTitle ?? null,
        updated.status,
      ]
    );
    return updated;
  },
  async deleteOpportunity(id: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM opportunities WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  // Tests
  async getAllTests(): Promise<Test[]> {
    const r = await pool().query('SELECT * FROM tests ORDER BY created_at');
    return r.rows.map((row: Record<string, unknown>) => toTest(row));
  },
  async getTestById(id: string): Promise<Test | undefined> {
    const r = await pool().query('SELECT * FROM tests WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? toTest(row) : undefined;
  },
  async getTestsByCategory(category: string): Promise<Test[]> {
    const r = await pool().query('SELECT * FROM tests WHERE category = $1 ORDER BY created_at', [category]);
    return r.rows.map((row: Record<string, unknown>) => toTest(row));
  },
  async createTest(test: Test): Promise<Test> {
    await pool().query(
      `INSERT INTO tests (id, title, description, category, difficulty, questions, time_limit, pass_score, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        test.id,
        test.title,
        test.description ?? '',
        test.category,
        test.difficulty,
        JSON.stringify(test.questions),
        test.timeLimit,
        test.passScore,
        test.createdAt,
        test.updatedAt,
      ]
    );
    return test;
  },
  async updateTest(id: string, updates: Partial<Test>): Promise<Test | undefined> {
    const t = await this.getTestById(id);
    if (!t) return undefined;
    const updated = { ...t, ...updates, updatedAt: new Date() };
    await pool().query(
      `UPDATE tests SET title=$2, description=$3, category=$4, difficulty=$5, questions=$6, time_limit=$7, pass_score=$8, updated_at=$9 WHERE id=$1`,
      [
        id,
        updated.title,
        updated.description,
        updated.category,
        updated.difficulty,
        JSON.stringify(updated.questions),
        updated.timeLimit,
        updated.passScore,
        updated.updatedAt,
      ]
    );
    return updated;
  },
  async deleteTest(id: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM tests WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  // Test Results
  async getAllTestResults(): Promise<TestResult[]> {
    const r = await pool().query('SELECT * FROM test_results ORDER BY started_at');
    return r.rows.map((row: Record<string, unknown>) => toTestResult(row));
  },
  async getTestResultsByUserId(userId: string): Promise<TestResult[]> {
    const r = await pool().query('SELECT * FROM test_results WHERE user_id = $1 ORDER BY started_at', [userId]);
    return r.rows.map((row: Record<string, unknown>) => toTestResult(row));
  },
  async getTestResultById(id: string): Promise<TestResult | undefined> {
    const r = await pool().query('SELECT * FROM test_results WHERE id = $1', [id]);
    const row = r.rows[0];
    return row ? toTestResult(row) : undefined;
  },
  async createTestResult(result: TestResult): Promise<TestResult> {
    await pool().query(
      `INSERT INTO test_results (id, test_id, user_id, answers, score, max_score, percentage, started_at, completed_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        result.id,
        result.testId,
        result.userId,
        JSON.stringify(result.answers),
        result.score,
        result.maxScore,
        result.percentage,
        result.startedAt,
        result.completedAt ?? null,
        result.status,
      ]
    );
    return result;
  },
  async updateTestResult(id: string, updates: Partial<TestResult>): Promise<TestResult | undefined> {
    const t = await this.getTestResultById(id);
    if (!t) return undefined;
    const updated = { ...t, ...updates };
    await pool().query(
      `UPDATE test_results SET answers=$2, score=$3, max_score=$4, percentage=$5, completed_at=$6, status=$7 WHERE id=$1`,
      [
        id,
        JSON.stringify(updated.answers),
        updated.score,
        updated.maxScore,
        updated.percentage,
        updated.completedAt ?? null,
        updated.status,
      ]
    );
    return updated;
  },
  async deleteTestResult(id: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM test_results WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  // Job Offers
  async getAllJobOffers(): Promise<JobOffer[]> {
    const r = await pool().query('SELECT * FROM job_offers ORDER BY created_at');
    const offers = r.rows as Record<string, unknown>[];
    const result: JobOffer[] = [];
    for (const row of offers) {
      const apps = await this.getApplicationsByJobId(row.id as string);
      result.push(toJobOffer(row, apps));
    }
    return result;
  },
  async getJobOfferById(id: string): Promise<JobOffer | undefined> {
    const r = await pool().query('SELECT * FROM job_offers WHERE id = $1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const apps = await this.getApplicationsByJobId(id);
    return toJobOffer(row, apps);
  },
  async getJobOffersByRecruiterId(recruiterId: string): Promise<JobOffer[]> {
    const r = await pool().query('SELECT * FROM job_offers WHERE recruiter_id = $1 ORDER BY created_at', [recruiterId]);
    const offers = r.rows as Record<string, unknown>[];
    const result: JobOffer[] = [];
    for (const row of offers) {
      const apps = await this.getApplicationsByJobId(row.id as string);
      result.push(toJobOffer(row, apps));
    }
    return result;
  },
  async createJobOffer(jobOffer: JobOffer): Promise<JobOffer> {
    await pool().query(
      `INSERT INTO job_offers (id, recruiter_id, title, description, requirements, location, salary, contract_type, experience, skills, benefits, status, test_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        jobOffer.id,
        jobOffer.recruiterId,
        jobOffer.title,
        jobOffer.description,
        JSON.stringify(jobOffer.requirements ?? []),
        jobOffer.location,
        jobOffer.salary ?? null,
        jobOffer.contractType,
        jobOffer.experience,
        JSON.stringify(jobOffer.skills ?? []),
        JSON.stringify(jobOffer.benefits ?? []),
        jobOffer.status,
        jobOffer.testId ?? null,
        jobOffer.createdAt,
        jobOffer.updatedAt,
      ]
    );
    return { ...jobOffer, applications: [] };
  },
  async updateJobOffer(id: string, updates: Partial<JobOffer>): Promise<JobOffer | undefined> {
    const o = await this.getJobOfferById(id);
    if (!o) return undefined;
    const updated = { ...o, ...updates, updatedAt: new Date() };
    await pool().query(
      `UPDATE job_offers SET title=$2, description=$3, requirements=$4, location=$5, salary=$6, contract_type=$7, experience=$8, skills=$9, benefits=$10, status=$11, test_id=$12, updated_at=$13 WHERE id=$1`,
      [
        id,
        updated.title,
        updated.description,
        JSON.stringify(updated.requirements ?? []),
        updated.location,
        updated.salary ?? null,
        updated.contractType,
        updated.experience,
        JSON.stringify(updated.skills ?? []),
        JSON.stringify(updated.benefits ?? []),
        updated.status,
        updated.testId ?? null,
        updated.updatedAt,
      ]
    );
    return updated;
  },
  async deleteJobOffer(id: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM job_offers WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  // Job Applications
  async getAllJobApplications(): Promise<JobApplication[]> {
    const r = await pool().query('SELECT * FROM job_applications ORDER BY applied_at');
    return r.rows.map((row: Record<string, unknown>) => toJobApplication(row));
  },
  async getApplicationsByJobId(jobId: string): Promise<JobApplication[]> {
    const r = await pool().query('SELECT * FROM job_applications WHERE job_offer_id = $1 ORDER BY applied_at', [jobId]);
    return r.rows.map((row: Record<string, unknown>) => toJobApplication(row));
  },
  async getApplicationsByUserId(userId: string): Promise<JobApplication[]> {
    const r = await pool().query('SELECT * FROM job_applications WHERE user_id = $1 ORDER BY applied_at', [userId]);
    return r.rows.map((row: Record<string, unknown>) => toJobApplication(row));
  },
  async createJobApplication(application: JobApplication): Promise<JobApplication> {
    await pool().query(
      `INSERT INTO job_applications (id, job_offer_id, user_id, cover_letter, resume_url, status, applied_at, updated_at, reviewed_at, feedback, cv_note_from_gpt, recruiter_note, test_result_id, cv_match_score, test_score, overall_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        application.id,
        application.jobOfferId,
        application.userId,
        application.coverLetter ?? '',
        application.resumeUrl ?? '',
        application.status,
        application.appliedAt,
        application.updatedAt,
        application.reviewedAt ?? null,
        application.feedback ?? null,
        application.cvNoteFromGpt ?? null,
        application.recruiterNote ?? null,
        application.testResultId ?? null,
        application.cvMatchScore ?? null,
        application.testScore ?? null,
        application.overallScore ?? null,
      ]
    );
    return application;
  },
  async updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined> {
    const a = await pool().query('SELECT * FROM job_applications WHERE id = $1', [id]);
    const row = a.rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const current = toJobApplication(row);
    const updated = { ...current, ...updates };
    await pool().query(
      `UPDATE job_applications SET cover_letter=$2, resume_url=$3, status=$4, updated_at=$5, reviewed_at=$6, feedback=$7, cv_note_from_gpt=$8, recruiter_note=$9, test_result_id=$10, cv_match_score=$11, test_score=$12, overall_score=$13 WHERE id=$1`,
      [
        id,
        updated.coverLetter,
        updated.resumeUrl,
        updated.status,
        updated.updatedAt,
        updated.reviewedAt ?? null,
        updated.feedback ?? null,
        updated.cvNoteFromGpt ?? null,
        updated.recruiterNote ?? null,
        updated.testResultId ?? null,
        updated.cvMatchScore ?? null,
        updated.testScore ?? null,
        updated.overallScore ?? null,
      ]
    );
    return updated;
  },

  // Application history
  async addApplicationHistoryEntry(entry: ApplicationHistoryEntry): Promise<void> {
    await pool().query(
      `INSERT INTO application_history (id, application_id, action, performed_by, performed_by_role, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.id,
        entry.applicationId,
        entry.action,
        entry.performedBy,
        entry.performedByRole,
        JSON.stringify(entry.details ?? {}),
        entry.createdAt,
      ]
    );
  },
  async getApplicationHistory(applicationId: string): Promise<ApplicationHistoryEntry[]> {
    const r = await pool().query('SELECT * FROM application_history WHERE application_id = $1 ORDER BY created_at', [applicationId]);
    return r.rows.map((row: Record<string, unknown>) => toApplicationHistoryEntry(row));
  },

  // Notifications
  async createNotification(notification: Notification): Promise<Notification> {
    await pool().query(
      `INSERT INTO notifications (id, user_id, type, title, message, conversation_id, application_id, test_id, meeting_data, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.message ?? '',
        notification.conversationId ?? null,
        notification.applicationId ?? null,
        notification.testId ?? null,
        JSON.stringify(notification.meetingData ?? {}),
        notification.read ?? false,
        notification.createdAt,
      ]
    );
    return notification;
  },
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const r = await pool().query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return r.rows.map((row: Record<string, unknown>) => toNotification(row));
  },
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const r = await pool().query('SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = false', [userId]);
    return (r.rows[0] as { c: number })?.c ?? 0;
  },
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const r = await pool().query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    return (r.rowCount ?? 0) > 0;
  },
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const r = await pool().query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [userId]);
    return r.rowCount ?? 0;
  },
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const r = await pool().query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    return (r.rowCount ?? 0) > 0;
  },
};
