import { expensesRepo } from './expenses.repo.js';
import { roundMoney } from '../../lib/money.js';
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
    const todayWita = new Date().toISOString().slice(0, 10);

    if (query.datePreset === 'today') {
      from = todayWita;
      to = todayWita;
    } else if (query.datePreset === 'yesterday') {
      const y = new Date(Date.now() - 24 * 3600 * 1000);
      const yWita = y.toISOString().slice(0, 10);
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
    const today = new Date();
    const todayDate = today.toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);

    return await expensesRepo.getSummary(organizationId, outletId, todayDate, yesterdayDate);
  },
};
