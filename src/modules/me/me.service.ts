import { meRepo } from './me.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const meService = {
  async getProfile(userId: string) {
    const user = await meRepo.getUserProfile(userId);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan');

    const notifPrefs = await meRepo.getNotificationPreferences(userId);
    const activeSessions = await meRepo.getActiveSessionsCount(userId);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      status: user.status,
      notificationPreferences: notifPrefs || {
        lowStock: true,
        dailyReport: true,
        newTransaction: false,
        unpaidReminder: true,
      },
      activeSessionsCount: activeSessions,
    };
  },

  async updateProfile(
    userId: string,
    data: { fullName?: string | undefined; jobTitle?: string | undefined; phone?: string | undefined; avatarUrl?: string | null | undefined }
  ) {
    const updated = await meRepo.updateUserProfile(userId, data);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Gagal memperbarui profil');
    return updated;
  },

  async updateNotificationPreferences(
    userId: string,
    organizationId: string,
    data: { lowStock: boolean; dailyReport: boolean; newTransaction: boolean; unpaidReminder: boolean }
  ) {
    return await meRepo.upsertNotificationPreferences(userId, organizationId, data);
  },

  async listSessions(userId: string) {
    return await meRepo.listActiveSessions(userId);
  },

  async revokeSession(userId: string, sessionId: string) {
    const row = await meRepo.revokeSession(userId, sessionId);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Sesi tidak ditemukan');
    return { id: sessionId };
  },

  async disableAccount(userId: string, confirmEmail?: string) {
    const user = await meRepo.getUserProfile(userId);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan');
    if (confirmEmail && confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Konfirmasi email tidak cocok');
    }
    await meRepo.revokeAllSessions(userId);
    const disabled = await meRepo.disableUser(userId);
    return { id: userId, status: disabled?.status || 'disabled' };
  },
};
