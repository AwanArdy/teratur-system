import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { staffService } from './staff.service.js';
import { createStaffSchema, updateStaffSchema } from './staff.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const staffRouter = Router();
staffRouter.use(authenticate);

staffRouter.get('/', async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await staffService.listStaff(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      query
    );
    // DESIGN §11.13 + matriks PRD §8.2: Manager/Kasir tidak melihat gaji.
    const data =
      req.ctx!.orgRole === 'staff'
        ? result.data.map(({ baseSalaryIdr, allowanceIdr, ...rest }: any) => rest)
        : result.data;
    res.json({
      data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

// Stub Phase 2 (PRD §6.13 US-STF-05): roster, performance, payroll belum di v1.
// Ditaruh SEBELUM /:id agar tidak tertangkap param.
// Frontend tab Roster/Performance/Payroll tetap dapat respons terstruktur 501.
const notImplemented = (_req: any, res: any) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Roster/performance/payroll masuk Phase 2. Estimasi payroll = Σ baseSalaryIdr + allowanceIdr dari GET /staff.' },
    requestId: _req.headers?.['x-request-id'],
  });
};
staffRouter.get('/roster', notImplemented);
staffRouter.get('/performance', notImplemented);
staffRouter.get('/payroll', notImplemented);

staffRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result: any = await staffService.getStaffById(req.ctx!.organizationId, id);
    const data =
      req.ctx!.orgRole === 'staff'
        ? (({ baseSalaryIdr, allowanceIdr, ...rest }: any) => rest)(result)
        : result;
    res.json({ data, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createStaffSchema.parse(req.body);
    const result = await staffService.createStaff(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

staffRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateStaffSchema.parse(req.body);
    const result = await staffService.updateStaff(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

staffRouter.delete('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await staffService.deleteStaff(req.ctx!.organizationId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
