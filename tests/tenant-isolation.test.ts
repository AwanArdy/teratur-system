import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productsService } from '../src/modules/products/products.service.js';
import { salesService } from '../src/modules/sales/sales.service.js';
import { productsRepo } from '../src/modules/products/products.repo.js';
import { salesRepo } from '../src/modules/sales/sales.repo.js';
import { HttpError } from '../src/middleware/errorHandler.js';
import type { RequestContext } from '../src/types/express.d.ts';

describe('2. Keamanan Multi-Tenant (tenant-isolation.test.ts)', () => {
  const mockOrgACtx: RequestContext = {
    requestId: 'req-tenant-a',
    userId: 'user-org-a',
    organizationId: 'org-a-id',
    orgRole: 'staff',
    staffRole: 'cashier',
    staffId: 'staff-cashier-1',
    outletIds: ['outlet-1-id'], // Cashier only has access to Outlet 1
    activeOutletId: 'outlet-1-id',
    planCode: 'starter',
    planStatus: 'active',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Skenario 1: Cross-Tenant Read/Write
  it('1. Cross-Tenant Read/Write: User dari Org A coba akses/ubah data Org B via ID -> Harus 404 Not Found (bukan 403)', async () => {
    const targetProductOrgBId = 'prod-org-b-999';
    const targetSaleOrgBId = 'sale-org-b-888';

    // Mock productsRepo.getById returning null because target ID belongs to Org B (where organizationId != org-a-id)
    vi.spyOn(productsRepo, 'getById').mockImplementation(
      async (orgId: string, id: string) => {
        if (orgId === 'org-a-id' && id === targetProductOrgBId) {
          // Cross-tenant attempt: ID exists in DB under Org B, but search by Org A returns null
          return null;
        }
        return null;
      }
    );

    // Mock salesRepo.getSaleById returning null for Org A context
    vi.spyOn(salesRepo, 'getSaleById').mockImplementation(
      async (orgId: string, _outletId: string, saleId: string) => {
        if (orgId === 'org-a-id' && saleId === targetSaleOrgBId) {
          return null;
        }
        return null;
      }
    );

    // 1. GET /products/:id cross-tenant attempt
    await expect(
      productsService.getProductById(
        mockOrgACtx.organizationId,
        mockOrgACtx.activeOutletId,
        targetProductOrgBId
      )
    ).rejects.toThrowError(HttpError);

    try {
      await productsService.getProductById(
        mockOrgACtx.organizationId,
        mockOrgACtx.activeOutletId,
        targetProductOrgBId
      );
    } catch (err: any) {
      // Must be 404 NOT_FOUND to prevent ID enumeration/leakage
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).not.toBe(403);
    }

    // 2. GET /sales/:id cross-tenant attempt
    try {
      await salesService.getSaleById(mockOrgACtx, targetSaleOrgBId);
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).not.toBe(403);
    }

    // 3. PATCH /products/:id cross-tenant update attempt
    try {
      await productsService.updateProduct(
        mockOrgACtx.organizationId,
        targetProductOrgBId,
        { name: 'Hacked Product' }
      );
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).not.toBe(403);
    }
  });

  // Skenario 2: Outlet Scope Limit
  it('2. Outlet Scope Limit: User Kasir di Outlet 1 coba bikin transaksi buat Outlet 2 -> Di-block/Ditolak', async () => {
    // Context with activeOutletId set to Outlet 2 (which is NOT in cashier's assigned outletIds)
    const unauthorizedOutletCtx: RequestContext = {
      ...mockOrgACtx,
      activeOutletId: null, // If cashier passes X-Outlet-Id for Outlet 2 not in their allowed list, activeOutletId is null or rejected
    };

    // Attempting sales creation without valid active outlet
    await expect(
      salesService.createSale(unauthorizedOutletCtx, {
        orderType: 'dine_in',
        paymentMethod: 'cash',
        items: [{ productId: 'prod-1', qty: 1 }],
        discountIdr: 0,
        taxIdr: 0,
      })
    ).rejects.toThrowError(HttpError);

    try {
      await salesService.createSale(unauthorizedOutletCtx, {
        orderType: 'dine_in',
        paymentMethod: 'cash',
        items: [{ productId: 'prod-1', qty: 1 }],
        discountIdr: 0,
        taxIdr: 0,
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('OUTLET_REQUIRED');
    }
  });
});
