import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { requireIdempotencyKey } from '../../middleware/idempotency.js';
import { posService } from './pos.service.js';
import { posMenuQuerySchema, posSaleSchema } from './pos.schemas.js';

// Router khusus aplikasi kasir (POS). Backend tetap satu dengan dashboard:
// seluruh penjualan memakai salesService yang sama (atomic BOM explosion,
// idempotency, attach shift). Endpoint ini hanya fasad ramah-kasir.
export const posRouter = Router();
posRouter.use(authenticate);
posRouter.use(requireOutlet);

// Menu untuk layar kasir (pencarian cepat + pagination besar)
posRouter.get('/menu', async (req, res, next) => {
  try {
    const query = posMenuQuerySchema.parse(req.query);
    const result = await posService.getMenu(req.ctx!.organizationId, query);
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

// Shift aktif untuk validasi laci kas sebelum jualan
posRouter.get('/active-shift', async (req, res, next) => {
  try {
    const result = await posService.getActiveShift(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

// Buat penjualan dari aplikasi kasir (wajib Idempotency-Key anti double-submit)
posRouter.post('/sales', requireIdempotencyKey, async (req, res, next) => {
  try {
    const body = posSaleSchema.parse(req.body);
    const result = await posService.createPosSale(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

// Struk untuk cetak ulang / thermal printer aplikasi kasir
posRouter.get('/receipt/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await posService.getReceipt(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
