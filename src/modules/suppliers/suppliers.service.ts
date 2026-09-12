import { suppliersRepo } from "./suppliers.repo.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const suppliersService = {
  async listSuppliers(organizationId: string) {
    return await suppliersRepo.listByOrg(organizationId);
  },

  async getSupplierById(organizationId: string, id: string) {
    const supplier = await suppliersRepo.getById(organizationId, id);
    if (!supplier) throw new HttpError(404, 'NOT_FOUND', 'Supplier tidak ditemukan');
    return supplier;
  },

  async createSupplier(
    organizationId: string,
    data: { name: string; phone?: string | undefined; email?: string | undefined; notes?: string | undefined }
  ) {
    return await suppliersRepo.create(organizationId, data);
  },

  async updateSupplier(
    organizationId: string,
    id: string,
    data: { name?: string | undefined; phone?: string | undefined; email?: string | undefined; notes?: string | undefined }
  ) {
    const existing = await suppliersRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Supplier tidak ditemukan')
    return await suppliersRepo.update(organizationId, id, data);
  },

  async deleteSupplier(organizationId: string, id: string) {
    const existing = await suppliersRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'SUpplier tidak ditemukan');
    await suppliersRepo.softDelete(organizationId, id);
  },
};
