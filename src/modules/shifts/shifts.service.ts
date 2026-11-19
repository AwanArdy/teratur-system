import { shiftsRepo } from './shifts.repo.js';
import { staffRepo } from '../staff/staff.repo.js';
import { db } from '../../db/client.js';
import { cashShifts } from '../../db/schema/staff.js';
import { eq, and } from 'drizzle-orm';
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
    if (staffId) {
      const staffRecord = await staffRepo.getById(ctx.organizationId, staffId);
      if (!staffRecord || staffRecord.organizationId !== ctx.organizationId || (staffRecord.outletId && staffRecord.outletId !== activeOutletId)) {
        throw new HttpError(404, 'NOT_FOUND', 'Staf kasir tidak ditemukan pada outlet ini');
      }
    } else {
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

  async closeShift(ctx: RequestContext, body: any, shiftId?: string) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib diisi');

    return await db.transaction(async (tx) => {
      const whereConds = shiftId
        ? and(eq(cashShifts.id, shiftId), eq(cashShifts.organizationId, ctx.organizationId))
        : and(
            eq(cashShifts.organizationId, ctx.organizationId),
            eq(cashShifts.outletId, activeOutletId),
            eq(cashShifts.status, 'open')
          );

      const [currentShift] = await tx
        .select()
        .from(cashShifts)
        .where(whereConds)
        .for('update');

      if (!currentShift || currentShift.status !== 'open') {
        throw new HttpError(404, 'NOT_FOUND', 'Tidak ada shift aktif yang perlu ditutup');
      }

      if (ctx.staffRole === 'cashier' && ctx.orgRole !== 'owner' && ctx.orgRole !== 'admin') {
        const isOwnShift =
          (ctx.staffId && currentShift.staffId === ctx.staffId) ||
          currentShift.openedByUserId === ctx.userId;
        if (!isOwnShift) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'Kasir hanya dapat menutup shift miliknya sendiri'
          );
        }
      }

      const startingCash = Number(currentShift.startingCashIdr);
      const cashSales = Number(currentShift.cashSalesIdr);
      const expectedCashIdr = startingCash + cashSales;
      const endingCashIdr = body.actualPhysicalCashIdr ?? body.endingCashIdr;
      const varianceIdr = endingCashIdr - expectedCashIdr;

      const status: 'balanced' | 'variance' = varianceIdr === 0 ? 'balanced' : 'variance';

      const [closed] = await tx
        .update(cashShifts)
        .set({
          actualPhysicalCashIdr: endingCashIdr,
          differenceIdr: varianceIdr,
          status,
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          closedAt: new Date(),
        })
        .where(and(eq(cashShifts.id, currentShift.id), eq(cashShifts.status, 'open')))
        .returning();

      if (!closed) {
        throw new HttpError(409, 'CONFLICT', 'Shift sudah ditutup');
      }

      return closed;
    });
  },
};
