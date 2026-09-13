import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { payrollService } from './payroll.service.js';
import { createPayrollStubSchema } from './payroll.schemas.js';
import { paginationSchema } from '../../lib/pagination.js';

export const payrollRouter = Router();
payrollRouter.use(authenticate);

payrollRouter.get('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const query = paginationSchema.parse(req.query);
    const result = await payrollService.listStubs(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      query
    );
    res.json({
      data: result.data,
      meta: { page: query.page, limit: query.limit, total: result.total },
      requestId: req.headers['x-request-id'],
    });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createPayrollStubSchema.parse(req.body);
    const result = await payrollService.createStub(req.ctx!, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
