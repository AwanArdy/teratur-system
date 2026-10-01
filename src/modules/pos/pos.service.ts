import { productsRepo } from '../products/products.repo.js';
import { salesService } from '../sales/sales.service.js';
import { shiftsService } from '../shifts/shifts.service.js';
import type { RequestContext } from '../../types/express.js';

export const posService = {
  async getMenu(organizationId: string, query: { search?: string | undefined; page: number; limit: number }) {
    return await productsRepo.listByOrg(organizationId, query);
  },

  async createPosSale(ctx: RequestContext, input: any) {
    return await salesService.createSale(ctx, input);
  },

  async getReceipt(ctx: RequestContext, saleId: string) {
    const sale = (await salesService.getSaleById(ctx, saleId)) as any;
    return {
      ...sale,
      receipt: {
        title: 'TERATUR',
        lines: (sale.items || []).map(
          (i: any) => `${i.qty}x ${i.name} @${i.unitPriceIdr} = ${i.lineTotalIdr}`,
        ),
        footer: 'Terima kasih atas kunjungan Anda',
      },
    };
  },

  async getActiveShift(organizationId: string, outletId: string | null) {
    return await shiftsService.getActiveShift(organizationId, outletId);
  },
};
