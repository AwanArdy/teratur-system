import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { suppliersService } from './suppliers.service.js';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schemas.js';

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

suppliersRouter.get('/', async (req, res, next) => {
  try {
    const result = await suppliersService.listSuppliers(req.ctx!.organizationId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await suppliersService.getSupplierById(req.ctx!.organizationId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post('/', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const body = createSupplierSchema.parse(req.body);
    const result = await suppliersService.createSupplier(req.ctx!.organizationId, body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.patch('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const body = updateSupplierSchema.parse(req.body);
    const result = await suppliersService.updateSupplier(req.ctx!.organizationId, id, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.delete('/:id', authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await suppliersService.deleteSupplier(req.ctx!.organizationId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
