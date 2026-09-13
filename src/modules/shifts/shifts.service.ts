import { shiftsRepo } from './shifts.repo.js';
import { staffRepo } from '../staff/staff.repo.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';

export const shiftsService = {
  async getActiveShift(organizationId: string, outletId: string | null) {
    if (!outletId) throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib diisi');
    const active = await shiftsRepo.getActiveShift(organizationId, outletId);
    return active;
  },

  async listShifts(
    organizationId: string,
    outletId: string | null,
    params: { page: number; limit: number }
  ) {
    return await shiftsRepo.listShifts(organizationId, outletId, params);
  },

  async openShift(ctx: RequestContext, body: any) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib diisi');

    const existingOpen = await shiftsRepo.getActiveShift(ctx.organizationId, activeOutletId);
    if (existingOpen) {
      throw new HttpError(
        409,
        'SHIFT_ALREADY_OPEN',
        'Masih ada shift kasir yang aktif di outlet ini. Tutup shift terlebih dahulu.'
      );
    }

    let staffId = body.cashierStaffId || body.staffId;
    if (!staffId) {
      const existingStaff = await staffRepo.getByUserId(ctx.organizationId, ctx.userId);
      if (existingStaff) {
        staffId = existingStaff.id;
      } else {
        throw new HttpError(400, 'STAFF_REQUIRED', 'Staf kasir wajib ditentukan');
      }
    }

    return await shiftsRepo.create(ctx.organizationId, activeOutletId, {
      shiftName: body.shiftName,
      startingCashIdr: body.startingCashIdr,
      openedByUserId: ctx.userId,
      staffId,
      ...(body.notes ? { notes: body.notes } : {}),
      status: 'open',
    });
  },

  async closeShift(ctx: RequestContext, body: any) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib diisi');

    const currentShift = await shiftsRepo.getActiveShift(ctx.organizationId, activeOutletId);
    if (!currentShift) {
      throw new HttpError(404, 'NOT_FOUND', 'Tidak ada shift aktif yang perlu ditutup');
    }

    const startingCash = Number(currentShift.startingCashIdr);
    const cashSales = Number(currentShift.cashSalesIdr);
    const expectedCashIdr = startingCash + cashSales;
    const endingCashIdr = body.endingCashIdr;
    const varianceIdr = endingCashIdr - expectedCashIdr;

    const status: 'balanced' | 'variance' = varianceIdr === 0 ? 'balanced' : 'variance';

    return await shiftsRepo.close(currentShift.id, {
      actualPhysicalCashIdr: endingCashIdr,
      differenceIdr: varianceIdr,
      status,
      ...(body.notes ? { notes: body.notes } : {}),
    });
  },
};
