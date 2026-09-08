import { outletsRepo } from './outlets.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const outletsService = {
  async listOutlets(organizationId: string) {
    return await outletsRepo.listByOrg(organizationId);
  },

  async getOutletById(organizationId: string, outletId: string) {
    const outlet = await outletsRepo.getById(organizationId, outletId);
    if (!outlet) throw new HttpError(404, 'NOT_FOUND', 'Outlet tidak ditemukan');
    return outlet;
  },

  async createOutlet(
    organizationId: string,
    data: { name: string; businessType: any; address?: string; city?: string; phone?: string }
  ) {
    const currentCount = await outletsRepo.countActiveByOrg(organizationId);
    const limit = await outletsRepo.getSubscriptionLimit(organizationId);

    if (currentCount >= limit) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        `Batas maksimal outlet (${limit}) untuk paket Anda telah tercapai. Upgrade paket untuk menambah outlet.`
      );
    }

    return await outletsRepo.createOutletWithDefaultWarehouse(organizationId, data);
  },

  async updateOutlet(
    organizationId: string,
    outletId: string,
    data: { name?: string; businessType?: any; address?: string; city?: string; phone?: string }
  ) {
    const existing = await outletsRepo.getById(organizationId, outletId);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Outlet tidak ditemukan');

    const updated = await outletsRepo.update(organizationId, outletId, data);
    return updated;
  },
};
