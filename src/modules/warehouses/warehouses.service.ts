import { warehousesRepo } from './warehouses.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const warehousesService = {
  async listWarehouses(organizationId: string, outletId: string) {
    return await warehousesRepo.listByOutlet(organizationId, outletId);
  },

  async createWarehouse(
    organizationId: string,
    outletId: string,
    data: { name: string; code: string; isDefault?: boolean | undefined }
  ) {
    try {
      return await warehousesRepo.create(organizationId, outletId, data);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new HttpError(409, 'CONFLICT', 'Kode gudang sudah digunakan pada outlet ini');
      }
      throw err;
    }
  },

  async updateWarehouse(
    organizationId: string,
    warehouseId: string,
    data: { name?: string | undefined; code?: string | undefined; isDefault?: boolean | undefined }
  ) {
    const updated = await warehousesRepo.update(organizationId, warehouseId, data);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Gudang tidak ditemukan');
    return updated;
  },
};
