import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireOutlet } from '../../middleware/requireOutlet.js';
import { reportsService } from './reports.service.js';
import {
  salesReportQuerySchema,
  exportSalesSchema,
  stockReportQuerySchema,
} from './reports.schemas.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// Laporan transaksi (halaman LaporanTransaksiPage)
reportsRouter.get('/sales', requireOutlet, async (req, res, next) => {
  try {
    const query = salesReportQuerySchema.parse(req.query);
    const result = await reportsService.getSalesReport(req.ctx!, query);
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

// Export async (FE polling status via jobId)
reportsRouter.post('/sales/export', requireOutlet, async (req, res, next) => {
  try {
    const body = exportSalesSchema.parse(req.body);
    const result = await reportsService.exportSales(req.ctx!, body);
    res.status(202).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params as { jobId: string };
    const result = await reportsService.getJob(req.ctx!, jobId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

// Laporan stok + ROP (halaman LaporanStokPage)
reportsRouter.get('/stock', async (req, res, next) => {
  try {
    const query = stockReportQuerySchema.parse(req.query);
    const result = await reportsService.getStockReport(req.ctx!, query);
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});
