import { staffRepo } from './staff.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';

export const staffService = {
  async listStaff(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    return await staffRepo.listStaff(organizationId, outletId, params);
  },

  async getStaffById(organizationId: string, id: string) {
    const staff = await staffRepo.getById(organizationId, id);
    if (!staff) throw new HttpError(404, 'NOT_FOUND', 'Staf tidak ditemukan');
    return staff;
  },

  async createStaff(ctx: RequestContext, body: any) {
    const targetOutletId = body.outletId || ctx.activeOutletId;
    if (!targetOutletId) {
      throw new HttpError(400, 'OUTLET_REQUIRED', 'Outlet ID wajib ditentukan');
    }

    return await staffRepo.create(ctx.organizationId, {
      name: body.fullName || body.name,
      staffRole: body.role || body.staffRole,
      employmentType: body.employmentType,
      outletId: targetOutletId,
      phone: body.phone || '',
      joinedOn: body.joinedOn || new Date().toISOString().split('T')[0],
      ...(body.email !== undefined && body.email !== '' ? { email: body.email } : {}),
      baseSalaryIdr: body.monthlySalaryIdr ?? body.baseSalaryIdr ?? 0,
      allowanceIdr: body.allowanceIdr ?? 0,
    });
  },

  async updateStaff(organizationId: string, id: string, body: any) {
    const existing = await staffRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Staf tidak ditemukan');

    const updateData = {
      ...(body.fullName !== undefined || body.name !== undefined ? { name: body.fullName || body.name } : {}),
      ...(body.role !== undefined || body.staffRole !== undefined ? { staffRole: body.role || body.staffRole } : {}),
      ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.monthlySalaryIdr !== undefined || body.baseSalaryIdr !== undefined ? { baseSalaryIdr: body.monthlySalaryIdr ?? body.baseSalaryIdr } : {}),
      ...(body.allowanceIdr !== undefined ? { allowanceIdr: body.allowanceIdr } : {}),
      ...(body.outletId !== undefined ? { outletId: body.outletId } : {}),
    };

    return await staffRepo.update(organizationId, id, updateData);
  },
};
