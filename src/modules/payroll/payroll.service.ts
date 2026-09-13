import { payrollRepo } from './payroll.repo.js';
import { staffRepo } from '../staff/staff.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';

export const payrollService = {
  async listStubs(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    return await payrollRepo.listStubs(organizationId, outletId, params);
  },

  async createStub(ctx: RequestContext, body: any) {
    const staff = await staffRepo.getById(ctx.organizationId, body.staffId);
    if (!staff) throw new HttpError(404, 'NOT_FOUND', 'Staf tidak ditemukan');

    const totalNetIdr = Math.max(0, body.baseSalaryIdr + body.bonusIdr - body.deductionsIdr);

    return await payrollRepo.create(ctx.organizationId, staff.outletId, {
      staffId: body.staffId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      baseSalaryIdr: body.baseSalaryIdr,
      bonusIdr: body.bonusIdr,
      deductionsIdr: body.deductionsIdr,
      totalNetIdr,
      ...(body.notes ? { notes: body.notes } : {}),
    });
  },
};
