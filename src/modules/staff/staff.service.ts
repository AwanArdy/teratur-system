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
      fullName: body.fullName,
      role: body.role,
      employmentType: body.employmentType,
      outletId: targetOutletId,
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.email !== undefined && body.email !== '' ? { email: body.email } : {}),
      hourlyRateIdr: body.hourlyRateIdr,
      monthlySalaryIdr: body.monthlySalaryIdr,
    });
  },

  async updateStaff(organizationId: string, id: string, body: any) {
    const existing = await staffRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Staf tidak ditemukan');

    const updateData = {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.hourlyRateIdr !== undefined ? { hourlyRateIdr: body.hourlyRateIdr } : {}),
      ...(body.monthlySalaryIdr !== undefined ? { monthlySalaryIdr: body.monthlySalaryIdr } : {}),
      ...(body.outletId !== undefined ? { outletId: body.outletId } : {}),
    };

    return await staffRepo.update(organizationId, id, updateData);
  },
};
