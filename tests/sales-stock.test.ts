import { describe, it, expect } from 'vitest';
import { createSaleSchema, listSalesQuerySchema } from '../src/modules/sales/sales.schemas.js';
import { getWitaDateString, formatWitaDisplay, isSameWitaDay } from '../src/lib/time.js';

describe('Sales & Stock - Schemas & Time Helpers (PR-07)', () => {
  it('should validate valid createSale input', () => {
    const validData = {
      orderType: 'dine_in',
      paymentMethod: 'qris',
      discountIdr: 5000,
      taxIdr: 2000,
      customerName: 'Awan',
      items: [
        {
          productId: '123e4567-e89b-12d3-a456-426614174000',
          qty: 2,
          unitPriceIdr: 15000,
        },
      ],
    };

    const parsed = createSaleSchema.parse(validData);
    expect(parsed.orderType).toBe('dine_in');
    expect(parsed.paymentMethod).toBe('qris');
    expect(parsed.discountIdr).toBe(5000);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.qty).toBe(2);
  });

  it('should reject invalid createSale input with empty items', () => {
    const invalidData = {
      orderType: 'dine_in',
      paymentMethod: 'cash',
      items: [],
    };

    const result = createSaleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate listSales query params correctly', () => {
    const query = {
      orderType: 'takeaway',
      paymentMethod: 'cash',
      status: 'paid',
      from: '2026-09-01',
      to: '2026-09-12',
      page: '1',
      limit: '10',
    };

    const parsed = listSalesQuerySchema.parse(query);
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.from).toBe('2026-09-01');
  });

  it('should format WITA date string properly', () => {
    const date = new Date('2026-09-12T10:00:00.000Z');
    const witaStr = getWitaDateString(date);
    expect(witaStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const display = formatWitaDisplay(date);
    expect(display).toContain('WITA');

    const sameDay = isSameWitaDay(date, new Date('2026-09-12T12:00:00.000Z'));
    expect(sameDay).toBe(true);
  });
});
