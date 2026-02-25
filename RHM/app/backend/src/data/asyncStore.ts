/**
 * Store unifié asynchrone : selon DATABASE_URL, utilise PostgreSQL (dbStore)
 * ou le store en mémoire (DataStore) wrappé en Promises.
 */
import { DataStore } from './store.js';
import { dbStore } from '../db/dbStore.js';

function wrapSync(store: DataStore) {
  return {
    getAllUsers: () => Promise.resolve(store.getAllUsers()),
    getUserById: (id: string) => Promise.resolve(store.getUserById(id)),
    getUserByEmail: (email: string) => Promise.resolve(store.getUserByEmail(email)),
    createUser: (user: Parameters<DataStore['createUser']>[0]) => Promise.resolve(store.createUser(user)),
    updateUser: (id: string, updates: Parameters<DataStore['updateUser']>[1]) => Promise.resolve(store.updateUser(id, updates)),
    deleteUser: (id: string) => Promise.resolve(store.deleteUser(id)),

    getAllOpportunities: () => Promise.resolve(store.getAllOpportunities()),
    getOpportunitiesByUserId: (userId: string) => Promise.resolve(store.getOpportunitiesByUserId(userId)),
    getOpportunityById: (id: string) => Promise.resolve(store.getOpportunityById(id)),
    createOpportunity: (opportunity: Parameters<DataStore['createOpportunity']>[0]) => Promise.resolve(store.createOpportunity(opportunity)),
    updateOpportunity: (id: string, updates: Parameters<DataStore['updateOpportunity']>[1]) => Promise.resolve(store.updateOpportunity(id, updates)),
    deleteOpportunity: (id: string) => Promise.resolve(store.deleteOpportunity(id)),

    getAllTests: () => Promise.resolve(store.getAllTests()),
    getTestById: (id: string) => Promise.resolve(store.getTestById(id)),
    getTestsByCategory: (category: string) => Promise.resolve(store.getTestsByCategory(category)),
    createTest: (test: Parameters<DataStore['createTest']>[0]) => Promise.resolve(store.createTest(test)),
    updateTest: (id: string, updates: Parameters<DataStore['updateTest']>[1]) => Promise.resolve(store.updateTest(id, updates)),
    deleteTest: (id: string) => Promise.resolve(store.deleteTest(id)),

    getAllTestResults: () => Promise.resolve(store.getAllTestResults()),
    getTestResultsByUserId: (userId: string) => Promise.resolve(store.getTestResultsByUserId(userId)),
    getTestResultById: (id: string) => Promise.resolve(store.getTestResultById(id)),
    createTestResult: (result: Parameters<DataStore['createTestResult']>[0]) => Promise.resolve(store.createTestResult(result)),
    updateTestResult: (id: string, updates: Parameters<DataStore['updateTestResult']>[1]) => Promise.resolve(store.updateTestResult(id, updates)),
    deleteTestResult: (id: string) => Promise.resolve(store.deleteTestResult(id)),

    getAllJobOffers: () => Promise.resolve(store.getAllJobOffers()),
    getJobOfferById: (id: string) => Promise.resolve(store.getJobOfferById(id)),
    getJobOffersByRecruiterId: (recruiterId: string) => Promise.resolve(store.getJobOffersByRecruiterId(recruiterId)),
    createJobOffer: (jobOffer: Parameters<DataStore['createJobOffer']>[0]) => Promise.resolve(store.createJobOffer(jobOffer)),
    updateJobOffer: (id: string, updates: Parameters<DataStore['updateJobOffer']>[1]) => Promise.resolve(store.updateJobOffer(id, updates)),
    deleteJobOffer: (id: string) => Promise.resolve(store.deleteJobOffer(id)),

    getAllJobApplications: () => Promise.resolve(store.getAllJobApplications()),
    getApplicationsByJobId: (jobId: string) => Promise.resolve(store.getApplicationsByJobId(jobId)),
    getApplicationsByUserId: (userId: string) => Promise.resolve(store.getApplicationsByUserId(userId)),
    createJobApplication: (application: Parameters<DataStore['createJobApplication']>[0]) => Promise.resolve(store.createJobApplication(application)),
    updateJobApplication: (id: string, updates: Parameters<DataStore['updateJobApplication']>[1]) => Promise.resolve(store.updateJobApplication(id, updates)),

    addApplicationHistoryEntry: (entry: Parameters<DataStore['addApplicationHistoryEntry']>[0]) => Promise.resolve(store.addApplicationHistoryEntry(entry)),
    getApplicationHistory: (applicationId: string) => Promise.resolve(store.getApplicationHistory(applicationId)),

    createNotification: (notification: Parameters<DataStore['createNotification']>[0]) => Promise.resolve(store.createNotification(notification)),
    getNotificationsByUserId: (userId: string) => Promise.resolve(store.getNotificationsByUserId(userId)),
    getUnreadNotificationsCount: (userId: string) => Promise.resolve(store.getUnreadNotificationsCount(userId)),
    markNotificationAsRead: (notificationId: string, userId: string) => Promise.resolve(store.markNotificationAsRead(notificationId, userId)),
    markAllNotificationsAsRead: (userId: string) => Promise.resolve(store.markAllNotificationsAsRead(userId)),
    deleteNotification: (notificationId: string, userId: string) => Promise.resolve(store.deleteNotification(notificationId, userId)),
  };
}

const syncAdapter = wrapSync(new DataStore());

/** Store asynchrone : PostgreSQL si DATABASE_URL est défini, sinon mémoire. */
export const dataStore = process.env.DATABASE_URL ? dbStore : syncAdapter;
