import { organizationsRepo } from './organizations.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const organizationsService = {
  async getCurrentOrg(organizationId: string) {
    const org = await organizationsRepo.getById(organizationId);
    if (!org) throw new HttpError(404, 'NOT_FOUND', 'Organisasi tidak ditemukan');
    return org;
  },

  async updateCurrentOrg(
    organizationId: string,
    data: { name?: string; province?: string; city?: string }
  ) {
    const updated = await organizationsRepo.update(organizationId, data);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Gagal memperbarui organisasi');
    return updated;
  },
};
