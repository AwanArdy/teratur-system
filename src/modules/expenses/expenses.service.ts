import { expensesRepo } from './expenses.repo.js';
import { roundMoney } from '../../lib/money.js';
import { getWitaDateString, getWitaYesterdayString } from '../../lib/time.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RequestContext } from '../../types/express.d.js';

export const expensesService = {
  async listExpenses(
    organizationId: string,
    outletId: string | null,
    query: {
      search?: string | undefined;
      category?: string | undefined;
      datePreset?: 'today' | 'yesterday' | 'custom' | undefined;
      from?: string | undefined;
      to?: string | undefined;
      page: number;
      limit: number;
    }
  ) {
    let from = query.from;
    let to = query.to;
    const todayWita = getWitaDateString();

    if (query.datePreset === 'today') {
      from = todayWita;
      to = todayWita;
    } else if (query.datePreset === 'yesterday') {
      const yWita = getWitaYesterdayString();
      from = yWita;
      to = yWita;
    }

    return await expensesRepo.listExpenses(organizationId, outletId, {
      search: query.search,
      category: query.category,
      from,
      to,
      page: query.page,
      limit: query.limit,
    });
  },

  async getExpenseById(organizationId: string, id: string) {
    const expense = await expensesRepo.getById(organizationId, id);
    if (!expense) throw new HttpError(404, 'NOT_FOUND', 'Pengeluaran tidak ditemukan');
    return expense;
  },

  async createExpense(ctx: RequestContext, body: any) {
    const activeOutletId = ctx.activeOutletId;
    if (!activeOutletId) {
      throw new HttpError(400, 'OUTLET_REQUIRED', 'Header X-Outlet-Id wajib disertakan');
    }

    const totalIdr = roundMoney(body.qty * body.unitPriceIdr);

    return await expensesRepo.create(ctx.organizationId, activeOutletId, {
      ...body,
      qty: body.qty.toString(),
      ...(body.receiptConfidence !== undefined
        ? { receiptConfidence: Number(body.receiptConfidence).toFixed(2) }
        : {}),
      totalIdr,
    });
  },

  async updateExpense(organizationId: string, id: string, body: any) {
    const existing = await expensesRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Pengeluaran tidak ditemukan');

    const qty = body.qty !== undefined ? body.qty : Number(existing.qty);
    const unitPriceIdr =
      body.unitPriceIdr !== undefined ? body.unitPriceIdr : existing.unitPriceIdr;
    const totalIdr = roundMoney(qty * unitPriceIdr);

    const updatePayload = {
      ...body,
      ...(body.qty !== undefined ? { qty: body.qty.toString() } : {}),
      ...(body.receiptConfidence !== undefined
        ? { receiptConfidence: Number(body.receiptConfidence).toFixed(2) }
        : {}),
      totalIdr,
    };

    return await expensesRepo.update(organizationId, id, updatePayload);
  },

  async deleteExpense(organizationId: string, id: string) {
    const existing = await expensesRepo.getById(organizationId, id);
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Pengeluaran tidak ditemukan');
    await expensesRepo.delete(organizationId, id);
  },

  async getSummary(organizationId: string, outletId: string | null) {
    const todayDate = getWitaDateString();
    const yesterdayDate = getWitaYesterdayString();

    return await expensesRepo.getSummary(organizationId, outletId, todayDate, yesterdayDate);
  },
};
